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
      // 已点赞，执行取消点赞
      await db('likes')
        .where({ user_id: String(userId), target_type: String(target_type), target_id: String(target_id) })
        .del();

      // 更新对应表的点赞数
      if (target_type == 1) {
        // 笔记
        await db('posts').where({ id: String(target_id) }).decrement('like_count', 1);

        // 更新笔记作者的获赞数
        const post = await db('posts').where({ id: String(target_id) }).select('user_id').first();
        if (post) {
          await db('users').where({ id: post.user_id }).decrement('like_count', 1);
        }
      } else if (target_type == 2) {
        // 评论
        await db('comments').where({ id: String(target_id) }).decrement('like_count', 1);
      }

      console.log(`取消点赞成功 - 用户ID: ${userId}`);
      res.json({ code: RESPONSE_CODES.SUCCESS, message: '取消点赞成功', data: { liked: false } });
    } else {
      // 未点赞，执行点赞
      await db('likes').insert({
        user_id: String(userId),
        target_type: String(target_type),
        target_id: String(target_id)
      });

      // 更新对应表的点赞数
      let targetUserId = null;
      let notificationTargetId = target_id; // 默认使用原始target_id

      if (target_type == 1) {
        // 笔记
        await db('posts').where({ id: String(target_id) }).increment('like_count', 1);

        // 更新笔记作者的获赞数
        const post = await db('posts').where({ id: String(target_id) }).select('user_id').first();
        if (post) {
          await db('users').where({ id: post.user_id }).increment('like_count', 1);
          targetUserId = post.user_id;
        }
        notificationTargetId = target_id;
      } else if (target_type == 2) {
        // 评论
        await db('comments').where({ id: String(target_id) }).increment('like_count', 1);

        // 获取评论作者ID和所属笔记ID，用于创建通知
        const comment = await db('comments').where({ id: String(target_id) }).select('user_id', 'post_id').first();
        if (comment) {
          targetUserId = comment.user_id;
          notificationTargetId = comment.post_id;
        }
      }

      // 创建通知（不给自己发通知）
      if (targetUserId && targetUserId !== userId) {
        let notificationData;
        if (target_type == 1) {
          // 点赞笔记
          notificationData = NotificationHelper.createLikePostNotification(targetUserId, userId, notificationTargetId);
        } else if (target_type == 2) {
          // 点赞评论
          notificationData = NotificationHelper.createLikeCommentNotification(targetUserId, userId, notificationTargetId, target_id);
        }

        // 插入通知到数据库
        if (notificationData) {
          await NotificationHelper.insertNotification(notificationData);
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
    
    // 删除点赞记录
    const result = await db('likes')
      .where({ user_id: String(userId), target_type: String(target_type), target_id: String(target_id) })
      .del();

    if (result === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '点赞记录不存在' });
    }

    // 更新对应表的点赞数
    if (target_type == 1) {
      // 笔记
      await db('posts').where({ id: String(target_id) }).decrement('like_count', 1);

      // 更新笔记作者的获赞数
      const post = await db('posts').where({ id: String(target_id) }).select('user_id').first();
      if (post) {
        await db('users').where({ id: post.user_id }).decrement('like_count', 1);
      }
    } else if (target_type == 2) {
      // 评论
      await db('comments').where({ id: String(target_id) }).decrement('like_count', 1);
    }

    console.log(`取消点赞成功 - 用户ID: ${userId}`);
    res.json({ code: RESPONSE_CODES.SUCCESS, message: '取消点赞成功' });
  } catch (error) {
    console.error('取消点赞失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;
