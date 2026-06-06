const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES, ERROR_MESSAGES } = require('../constants');
const { getDB } = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');
const NotificationHelper = require('../utils/notificationHelper');

// 点赞/取消点赞
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { target_type, target_id } = req.body;
    const userId = req.user.id;

    // 验证参数
    if (!target_type || !target_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '缺少必要参数' });
    }

    // target_type: 1=笔记, 2=评论
    if (![1, 2].includes(parseInt(target_type))) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '无效的目标类型' });
    }

    const db = getDB();

    // 检查是否已经点赞
    const existingLike = await db('likes')
      .where({ user_id: String(userId), target_type: String(target_type), target_id: String(target_id) })
      .select('id');

    if (existingLike.length > 0) {
      // 已点赞，执行取消点赞 - 使用事务确保数据一致性
      await db.transaction(async (trx) => {
        await trx('likes')
          .where({ user_id: String(userId), target_type: String(target_type), target_id: String(target_id) })
          .del();

        // 更新对应表的点赞数
        if (target_type == 1) {
          // 笔记
          await trx('posts').where({ id: String(target_id) }).decrement('like_count', 1);

          // 更新笔记作者的获赞数
          const post = await trx('posts').where({ id: String(target_id) }).select('user_id').first();
          if (post) {
            await trx('users').where({ id: post.user_id }).decrement('like_count', 1);
          }
        } else if (target_type == 2) {
          // 评论
          await trx('comments').where({ id: String(target_id) }).decrement('like_count', 1);
        }
      });

      // 删除点赞通知
      try {
        let notificationType;
        if (target_type == 1) {
          notificationType = NotificationHelper.TYPES.LIKE_POST;
        } else if (target_type == 2) {
          notificationType = NotificationHelper.TYPES.LIKE_COMMENT;
        }
        if (notificationType) {
          await db('notifications')
            .where({
              sender_id: String(userId),
              target_id: String(target_id),
              type: notificationType
            })
            .del();
        }
      } catch (notifyError) {
        console.error('删除点赞通知失败:', notifyError.message);
      }

      console.log(`取消点赞成功 - 用户ID: ${userId}`);
      res.json({ code: RESPONSE_CODES.SUCCESS, message: '取消点赞成功', data: { liked: false } });
    } else {
      // 未点赞，执行点赞 - 使用事务确保数据一致性
      let targetUserId = null;
      let notificationTargetId = target_id;
      let notificationData = null;

      await db.transaction(async (trx) => {
        await trx('likes').insert({
          user_id: String(userId),
          target_type: String(target_type),
          target_id: String(target_id)
        });

        // 更新对应表的点赞数
        if (target_type == 1) {
          // 笔记
          await trx('posts').where({ id: String(target_id) }).increment('like_count', 1);

          // 更新笔记作者的获赞数
          const post = await trx('posts').where({ id: String(target_id) }).select('user_id').first();
          if (post) {
            await trx('users').where({ id: post.user_id }).increment('like_count', 1);
            targetUserId = post.user_id;
          }
          notificationTargetId = target_id;
        } else if (target_type == 2) {
          // 评论
          await trx('comments').where({ id: String(target_id) }).increment('like_count', 1);

          // 获取评论作者ID和所属笔记ID，用于创建通知
          const comment = await trx('comments').where({ id: String(target_id) }).select('user_id', 'post_id').first();
          if (comment) {
            targetUserId = comment.user_id;
            notificationTargetId = comment.post_id;
          }
        }
      });

      // 创建通知（不给自己发通知）- 通知在事务外创建，避免阻塞主流程
      if (targetUserId && targetUserId !== userId) {
        try {
          if (target_type == 1) {
            // 点赞笔记
            notificationData = NotificationHelper.createLikePostNotification(targetUserId, userId, notificationTargetId);
          } else if (target_type == 2) {
            // 点赞评论
            notificationData = NotificationHelper.createLikeCommentNotification(targetUserId, userId, notificationTargetId, target_id);
          }

          if (notificationData) {
            await NotificationHelper.insertNotification(notificationData);
          }
        } catch (notifyError) {
          console.error('创建通知失败:', notifyError.message);
          // 通知失败不影响点赞结果
        }
      }

      console.log(`点赞成功 - 用户ID: ${userId}`);
      res.json({ code: RESPONSE_CODES.SUCCESS, message: '点赞成功', data: { liked: true } });
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 取消点赞（兼容旧接口）
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const { target_type, target_id } = req.body;
    const userId = req.user.id;

    // 验证参数
    if (!target_type || !target_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '缺少必要参数' });
    }

    const db = getDB();
    
    // 使用事务包裹取消点赞操作
    await db.transaction(async (trx) => {
      // 删除点赞记录
      const result = await trx('likes')
        .where({ user_id: String(userId), target_type: String(target_type), target_id: String(target_id) })
        .del();

      if (result === 0) {
        throw new Error('LIKE_NOT_FOUND');
      }

      // 更新对应表的点赞数
      if (target_type == 1) {
        // 笔记
        await trx('posts').where({ id: String(target_id) }).decrement('like_count', 1);

        // 更新笔记作者的获赞数
        const post = await trx('posts').where({ id: String(target_id) }).select('user_id').first();
        if (post) {
          await trx('users').where({ id: post.user_id }).decrement('like_count', 1);
        }
      } else if (target_type == 2) {
        // 评论
        await trx('comments').where({ id: String(target_id) }).decrement('like_count', 1);
      }
    });

    // 删除点赞通知
    try {
      let notificationType;
      if (target_type == 1) {
        notificationType = NotificationHelper.TYPES.LIKE_POST;
      } else if (target_type == 2) {
        notificationType = NotificationHelper.TYPES.LIKE_COMMENT;
      }
      if (notificationType) {
        await db('notifications')
          .where({
            sender_id: String(userId),
            target_id: String(target_id),
            type: notificationType
          })
          .del();
      }
    } catch (notifyError) {
      console.error('删除点赞通知失败:', notifyError.message);
    }

    console.log(`取消点赞成功 - 用户ID: ${userId}`);
    res.json({ code: RESPONSE_CODES.SUCCESS, message: '取消点赞成功' });
  } catch (error) {
    if (error.message === 'LIKE_NOT_FOUND') {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '点赞记录不存在' });
    }
    console.error('取消点赞失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;
