const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES, ERROR_MESSAGES } = require('../constants');
const { getDB } = require('../utils/db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const NotificationHelper = require('../utils/notificationHelper');
const { extractMentionedUsers, hasMentions } = require('../utils/mentionParser');
const { sanitizeContent } = require('../utils/contentSecurity');
const economyRouter = require('./economy');
const { checkAndUnlockAchievements } = require('./economyShared');
const { trackTask, updateMainTaskProgress } = require('../utils/taskTracker');

// 递归删除评论及其子评论，返回删除的评论总数
async function deleteCommentRecursive(db, commentId) {
  let deletedCount = 0;

  // 获取所有子评论
  const children = await db('comments').where({ parent_id: commentId }).select('id');

  // 递归删除子评论
  for (const child of children) {
    deletedCount += await deleteCommentRecursive(db, child.id);
  }

  // 删除当前评论的点赞记录
  await db('likes').where({ target_type: '2', target_id: String(commentId) }).del();

  // 删除当前评论
  await db('comments').where({ id: commentId }).del();

  // 当前评论也算一个
  deletedCount += 1;

  return deletedCount;
}

// 获取评论列表
router.get('/', optionalAuth, async (req, res) => {
  try {
    const db = getDB();
    const postId = req.query.post_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const currentUserId = req.user ? req.user.id : null;

    if (!postId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '缺少笔记ID' });
    }

    // 获取顶级评论（parent_id为NULL）
    const rows = await db({ c: 'comments' })
      .leftJoin({ u: 'users' }, 'c.user_id', 'u.id')
      .where({ 'c.post_id': postId })
      .whereNull('c.parent_id')
      .select(
        'c.*',
        'u.nickname',
        'u.avatar as user_avatar',
        'u.id as user_auto_id',
        'u.user_id as user_display_id',
        'u.location as user_location',
        'u.verified'
      )
      .orderBy('c.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (rows.length > 0) {
      const commentIds = rows.map(c => c.id);
      
      // 批量获取点赞状态
      let likedCommentIds = new Set();
      if (currentUserId) {
        const likes = await db('likes')
          .where({ user_id: String(currentUserId), target_type: '2' })
          .whereIn('target_id', commentIds.map(String))
          .select('target_id');
        likedCommentIds = new Set(likes.map(l => l.target_id.toString()));
      }

      // 批量获取子评论数量
      const replyCounts = await db('comments')
        .whereIn('parent_id', commentIds)
        .select('parent_id')
        .count('* as count')
        .groupBy('parent_id');
      
      const replyCountMap = {};
      replyCounts.forEach(r => {
        replyCountMap[r.parent_id] = parseInt(r.count);
      });

      // 组装数据
      for (let comment of rows) {
        comment.liked = likedCommentIds.has(comment.id.toString());
        comment.reply_count = replyCountMap[comment.id] || 0;
      }
    }

    // 获取总数
    const countResult = await db('comments')
      .where({ post_id: postId })
      .whereNull('parent_id')
      .count('* as total')
      .first();

    const total = parseInt(countResult.total);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        comments: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取评论列表失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 创建评论
router.post('/', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const { post_id, content, parent_id } = req.body;
    const userId = req.user.id;

    // 验证必填字段
    if (!post_id || !content) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '笔记ID和评论内容不能为空' });
    }

    // 对内容进行安全过滤，防止XSS攻击
    const sanitizedContent = sanitizeContent(content);
    
    // 再次验证过滤后的内容不为空
    if (!sanitizedContent.trim()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ code: RESPONSE_CODES.VALIDATION_ERROR, message: '评论内容不能为空' });
    }

    // 验证笔记是否存在
    const postExists = await db('posts').where({ id: post_id }).first();
    if (!postExists) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '笔记不存在' });
    }

    // 如果是回复评论，验证父评论是否存在
    if (parent_id) {
      const parentExists = await db('comments').where({ id: parent_id }).first();
      if (!parentExists) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '父评论不存在' });
      }
    }

    // 插入评论
    const commentResult = await db('comments')
      .insert({
        post_id: String(post_id),
        user_id: String(userId),
        content: sanitizedContent,
        parent_id: parent_id ? String(parent_id) : null
      })
      .returning('id');

    const commentId = Array.isArray(commentResult) && commentResult.length > 0 ? commentResult[0].id : commentResult[0];

    // 更新笔记评论数
    await db('posts').where({ id: post_id }).increment('comment_count', 1);

    // 创建通知
    if (parent_id) {
      // 回复评论，给被回复的评论作者发通知
      const parentComment = await db('comments').where({ id: parent_id }).select('user_id').first();
      if (parentComment && parentComment.user_id !== userId) {
        const notificationData = NotificationHelper.createReplyCommentNotification(parentComment.user_id, userId, post_id, commentId);
        await NotificationHelper.insertNotification(notificationData);
      }
    } else {
      // 评论笔记，给笔记作者发通知
      const postData = await db('posts').where({ id: post_id }).select('user_id').first();
      if (postData && postData.user_id !== userId) {
        const notificationData = NotificationHelper.createCommentPostNotification(postData.user_id, userId, post_id, commentId);
        await NotificationHelper.insertNotification(notificationData);
      }
    }

    // 处理@用户通知
    if (hasMentions(content)) {
      const mentionedUsers = extractMentionedUsers(content);

      for (const mentionedUser of mentionedUsers) {
        try {
          const userRow = await db('users').where({ user_id: mentionedUser.userId }).select('id').first();

          if (userRow && userRow.id !== userId) {
            const mentionNotificationData = NotificationHelper.createNotificationData({
              userId: userRow.id,
              senderId: userId,
              type: NotificationHelper.TYPES.MENTION_COMMENT,
              targetId: post_id,
              commentId: commentId
            });

            await NotificationHelper.insertNotification(mentionNotificationData);
          }
        } catch (error) {
          console.error('处理@用户通知失败 - 用户: %s:', mentionedUser.userId, error);
        }
      }
    }

    // 获取刚创建的评论的完整信息
    const commentData = await db({ c: 'comments' })
      .leftJoin({ u: 'users' }, 'c.user_id', 'u.id')
      .where('c.id', commentId)
      .select(
        'c.*',
        'u.nickname',
        'u.avatar as user_avatar',
        'u.id as user_auto_id',
        'u.user_id as user_display_id',
        'u.location as user_location',
        'u.verified'
      )
      .first();

    commentData.liked = false; // 新创建的评论默认未点赞
    commentData.reply_count = 0; // 新创建的评论默认无回复

    console.log('创建评论成功 - 用户ID: %s, 评论ID: %s', userId, commentId);

    // 触发成就检查（非阻塞，失败不影响主流程）
    try {
      const { getDB } = require('../utils/db');
      const dbForAchievement = getDB();
      const userRow = await db('users').where({ id: userId }).select('user_id').first();
      if (userRow && checkAndUnlockAchievements) {
        checkAndUnlockAchievements(dbForAchievement, userRow.user_id).catch(e => {
          console.error('[Comments] 发评论后成就检查失败:', e);
        });
      }
    } catch (e) {
      console.error('[Comments] 发评论后成就检查调用失败:', e);
    }

    // 更新任务进度（非阻塞）
    try {
      const { getDB: getDBForTask } = require('../utils/db');
      const dbForTask = getDBForTask();
      const taskUserRow = await db('users').where({ id: userId }).select('user_id').first();
      if (taskUserRow) {
        const postData = await db('posts').where({ id: post_id }).select('user_id').first();
        const isSelfComment = postData && postData.user_id === userId;

        // 评论自己帖子不算任务
        if (!isSelfComment) {
          // 检查今天是否已在此帖子下评论过（同一帖子每天只算一次）
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);

          const todayCommentsOnPost = await db('comments')
            .where({
              post_id: String(post_id),
              user_id: String(userId)
            })
            .whereBetween('created_at', [today.toISOString(), tomorrow.toISOString()])
            .count('* as count')
            .first();

          // 只有今天第一次评论此帖子才算任务
          const isFirstCommentOnPostToday = todayCommentsOnPost.count <= 1;

          if (isFirstCommentOnPostToday) {
            trackTask(dbForTask, taskUserRow.user_id, 'comment').catch(e => {
              console.error('[Comments] 更新每日评论任务失败:', e);
            });
            trackTask(dbForTask, taskUserRow.user_id, 'comment_weekly').catch(e => {
              console.error('[Comments] 更新每周评论任务失败:', e);
            });
          }
        }

        // 主线评论任务（累计，不受自评论和重复限制）
        const [commentCountResult] = await db('comments').where({ user_id: userId }).count('* as count');
        const commentCount = commentCountResult.count;
        updateMainTaskProgress(dbForTask, taskUserRow.user_id, 'main_comment10', commentCount).catch(() => {});
      }
    } catch (e) {
      console.error('[Comments] 更新任务进度失败:', e);
    }

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '评论成功',
      data: commentData
    });
  } catch (error) {
    console.error('创建评论失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 获取子评论列表
router.get('/:id/replies', optionalAuth, async (req, res) => {
  try {
    const db = getDB();
    const parentId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const currentUserId = req.user ? req.user.id : null;

    // 获取子评论
    const rows = await db({ c: 'comments' })
      .leftJoin({ u: 'users' }, 'c.user_id', 'u.id')
      .where({ 'c.parent_id': parentId })
      .select(
        'c.*',
        'u.nickname',
        'u.avatar as user_avatar',
        'u.id as user_auto_id',
        'u.user_id as user_display_id',
        'u.location as user_location',
        'u.verified'
      )
      .orderBy('c.created_at', 'asc')
      .limit(limit)
      .offset(offset);

    // 为每个评论检查点赞状态
    if (rows.length > 0 && currentUserId) {
      const commentIds = rows.map(c => c.id);
      const likes = await db('likes')
        .where({ user_id: String(currentUserId), target_type: '2' })
        .whereIn('target_id', commentIds.map(String))
        .select('target_id');
      const likedCommentIds = new Set(likes.map(l => l.target_id.toString()));

      for (let comment of rows) {
        comment.liked = likedCommentIds.has(comment.id.toString());
      }
    } else {
      for (let comment of rows) {
        comment.liked = false;
      }
    }

    // 获取总数
    const countResult = await db('comments')
      .where({ parent_id: parentId })
      .count('* as total')
      .first();

    const total = parseInt(countResult.total);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        comments: rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取子评论列表失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 删除评论
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDB();
    const commentId = req.params.id;
    const userId = req.user.id;

    // 验证评论是否存在并且是当前用户发布的
    const commentRecord = await db('comments')
      .where({ id: commentId })
      .select('id', 'post_id', 'user_id', 'parent_id')
      .first();

    if (!commentRecord) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ code: RESPONSE_CODES.NOT_FOUND, message: '评论不存在' });
    }

    // 检查是否是评论作者
    if (commentRecord.user_id !== userId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ code: RESPONSE_CODES.FORBIDDEN, message: '只能删除自己发布的评论' });
    }

    // 使用递归删除函数删除评论及其所有子评论，获取删除的评论总数
    const deletedCount = await deleteCommentRecursive(db, commentId);

    // 根据实际删除的评论数量更新笔记的评论计数
    // 使用参数化方式防止SQL注入（deletedCount为内部计数，但仍做校验）
    const safeDeletedCount = Math.max(0, parseInt(deletedCount) || 0);
    await db('posts')
      .where({ id: commentRecord.post_id })
      .update({
        comment_count: db.raw('GREATEST(comment_count - ?, 0)', [safeDeletedCount])
      });

    // 删除与该评论相关的通知（评论通知和@通知）
    try {
      await db('notifications')
        .where(function() {
          this.where({ target_id: String(commentRecord.post_id), type: NotificationHelper.TYPES.COMMENT })
            .orWhere({ target_id: String(commentId), type: NotificationHelper.TYPES.MENTION });
        })
        .where({ sender_id: String(userId) })
        .del();
    } catch (notifyError) {
      console.error('删除评论通知失败:', notifyError.message);
    }

    console.log('删除评论成功 - 用户ID: %s, 评论ID: %s', userId, commentId);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '删除成功',
      data: {
        id: commentId,
        deletedCount: deletedCount
      }
    });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;
