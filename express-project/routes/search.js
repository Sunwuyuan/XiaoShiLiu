const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES, ERROR_MESSAGES } = require('../constants');
const { getDB } = require('../utils/db');
const { optionalAuth } = require('../middleware/auth');

// 搜索（通用搜索接口）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const db = getDB();
    const keyword = req.query.keyword || '';
    const tag = req.query.tag || '';
    const type = req.query.type || 'all'; // all, posts, videos, users
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const currentUserId = req.user ? req.user.id : null;

    // 如果既没有关键词也没有标签，返回空结果
    if (!keyword.trim() && !tag.trim()) {
      return res.json({
        code: RESPONSE_CODES.SUCCESS,
        message: 'success',
        data: {
          keyword,
          tag,
          type,
          data: [],
          tagStats: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        }
      });
    }

    let result = {};

    // all、posts、videos都返回笔记内容，但根据type过滤不同类型
    if (type === 'all' || type === 'posts' || type === 'videos') {
      // 构建基础查询
      let query = db({ p: 'posts' })
        .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
        .select(
          'p.*',
          'u.nickname',
          'u.avatar as user_avatar',
          'u.user_id as author_account',
          'u.location'
        )
        .where('p.status', 0);

      // 关键词搜索条件
      if (keyword.trim()) {
        const kwPattern = `%${keyword}%`;
        query.where(function() {
          this.where('p.title', 'like', kwPattern)
              .orWhere('p.content', 'like', kwPattern)
              .orWhere('u.nickname', 'like', kwPattern)
              .orWhere('u.user_id', 'like', kwPattern)
              .orWhereExists(
                db({ pt: 'post_tags' })
                  .join({ t: 'tags' }, 'pt.tag_id', 't.id')
                  .whereRaw('pt.post_id = p.id')
                  .where('t.name', 'like', kwPattern)
              );
        });
      }

      // 标签搜索条件
      if (tag.trim()) {
        query.whereExists(
          db({ pt2: 'post_tags' })
            .join({ t2: 'tags' }, 'pt2.tag_id', 't2.id')
            .whereRaw('pt2.post_id = p.id')
            .where('t2.name', tag)
        );
      }

      // 根据type添加内容类型过滤
      if (type === 'posts') {
        query.where('p.type', 1);
      } else if (type === 'videos') {
        query.where('p.type', 2);
      }

      // 搜索笔记
      const postRows = await query
        .orderBy('p.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // 获取每个笔记的图片、标签和用户点赞收藏状态
      if (postRows.length > 0) {
        const postIds = postRows.map(p => p.id);

        // 修复头像字段映射问题
        for (let post of postRows) {
          post.avatar = post.user_avatar;
          post.author = post.nickname;
        }

        // 批量获取视频信息
        const videos = await db('post_videos').whereIn('post_id', postIds).select('*');
        const videoMap = {};
        videos.forEach(v => { videoMap[v.post_id] = v; });

        // 批量获取图片信息
        const images = await db('post_images').whereIn('post_id', postIds).select('*');
        const imageMap = {};
        images.forEach(img => {
          if (!imageMap[img.post_id]) imageMap[img.post_id] = [];
          imageMap[img.post_id].push(img.image_url);
        });

        // 批量获取标签信息
        const tags = await db({ t: 'tags' })
          .join({ pt: 'post_tags' }, 't.id', 'pt.tag_id')
          .whereIn('pt.post_id', postIds)
          .select('pt.post_id', 't.id', 't.name');
        const tagMap = {};
        tags.forEach(t => {
          if (!tagMap[t.post_id]) tagMap[t.post_id] = [];
          tagMap[t.post_id].push({ id: t.id, name: t.name });
        });

        // 批量获取点赞状态
        let likedPostIds = new Set();
        if (currentUserId) {
          const likes = await db('likes')
            .where({ user_id: String(currentUserId), target_type: '1' })
            .whereIn('target_id', postIds.map(String))
            .select('target_id');
          likedPostIds = new Set(likes.map(l => l.target_id.toString()));
        }

        // 批量获取收藏状态
        let collectedPostIds = new Set();
        if (currentUserId) {
          const collections = await db('collections')
            .where({ user_id: String(currentUserId) })
            .whereIn('post_id', postIds.map(String))
            .select('post_id');
          collectedPostIds = new Set(collections.map(c => c.post_id.toString()));
        }

        // 组装数据
        for (let post of postRows) {
          if (post.type === 2) {
            const video = videoMap[post.id];
            post.images = video && video.cover_url ? [video.cover_url] : [];
            post.video_url = video ? video.video_url : null;
            post.image = video && video.cover_url ? video.cover_url : null;
          } else {
            const postImages = imageMap[post.id] || [];
            post.images = postImages;
            post.image = postImages.length > 0 ? postImages[0] : null;
          }
          post.tags = tagMap[post.id] || [];
          post.liked = likedPostIds.has(post.id.toString());
          post.collected = collectedPostIds.has(post.id.toString());
        }
      }

      // 获取笔记总数 - 使用相同的搜索条件
      let countQuery = db({ p: 'posts' })
        .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
        .where('p.status', 0);

      if (keyword.trim()) {
        const kwPattern = `%${keyword}%`;
        countQuery.where(function() {
          this.where('p.title', 'like', kwPattern)
              .orWhere('p.content', 'like', kwPattern)
              .orWhere('u.nickname', 'like', kwPattern)
              .orWhere('u.user_id', 'like', kwPattern)
              .orWhereExists(
                db({ pt3: 'post_tags' })
                  .join({ t3: 'tags' }, 'pt3.tag_id', 't3.id')
                  .whereRaw('pt3.post_id = p.id')
                  .where('t.name', 'like', kwPattern)
              );
        });
      }

      if (tag.trim()) {
        countQuery.whereExists(
          db({ pt4: 'post_tags' })
            .join({ t4: 'tags' }, 'pt4.tag_id', 't4.id')
            .whereRaw('pt4.post_id = p.id')
            .where('t4.name', tag)
        );
      }

      if (type === 'posts') {
        countQuery.where('p.type', 1);
      } else if (type === 'videos') {
        countQuery.where('p.type', 2);
      }

      const postCountResult = await countQuery.count('* as total').first();

      // 统计标签频率
      let tagStats = [];
      if (keyword.trim()) {
        const kwPattern = `%${keyword}%`;

        // 获取keyword搜索结果中的标签统计
        const tagStatsResult = await db({ t: 'tags' })
          .join({ pt: 'post_tags' }, 't.id', 'pt.tag_id')
          .join({ p: 'posts' }, 'pt.post_id', 'p.id')
          .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
          .where('p.status', 0)
          .where(function() {
            this.where('p.title', 'like', kwPattern)
                .orWhere('p.content', 'like', kwPattern)
                .orWhere('u.nickname', 'like', kwPattern)
                .orWhere('u.user_id', 'like', kwPattern)
                .orWhereExists(
                  db({ pt5: 'post_tags' })
                    .join({ t5: 'tags' }, 'pt5.tag_id', 't5.id')
                    .whereRaw('pt5.post_id = p.id')
                    .where('t5.name', 'like', kwPattern)
                );
          })
          .select('t.name')
          .count('* as count')
          .groupBy('t.id', 't.name')
          .orderBy('count', 'desc')
          .limit(10);

        tagStats = tagStatsResult.map(item => ({
          id: item.name,
          label: item.name,
          count: parseInt(item.count)
        }));

        // 如果指定了tag，且tag不在前10中，则需要将其补充进去
        if (tag && !tagStats.some(t => t.id === tag)) {
          const tagCount = await db({ pt6: 'post_tags' })
            .join({ t6: 'tags' }, 'pt6.tag_id', 't6.id')
            .join({ p: 'posts' }, 'pt6.post_id', 'p.id')
            .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
            .where('p.status', 0)
            .where(function() {
              this.where('p.title', 'like', kwPattern)
                  .orWhere('p.content', 'like', kwPattern)
                  .orWhere('u.nickname', 'like', kwPattern)
                  .orWhere('u.user_id', 'like', kwPattern)
                  .orWhereExists(
                    db({ pt7: 'post_tags' })
                      .join({ t7: 'tags' }, 'pt7.tag_id', 't7.id')
                      .whereRaw('pt7.post_id = p.id')
                      .where('t7.name', 'like', kwPattern)
                  );
            })
            .where('t6.name', tag)
            .count('* as count')
            .first();

          if (parseInt(tagCount.count) > 0) {
            tagStats.push({
              id: tag,
              label: tag,
              count: parseInt(tagCount.count)
            });
            // 重新排序并保持10个限制
            tagStats.sort((a, b) => b.count - a.count);
            if (tagStats.length > 10) {
              const tagIndex = tagStats.findIndex(t => t.id === tag);
              if (tagIndex >= 10) {
                 tagStats.splice(9, 1);
              } else {
                 tagStats.pop();
              }
            }
          }
        }
      }

      // all模式直接返回数据，posts模式和videos模式返回posts结构
      if (type === 'all') {
        result = {
          data: postRows,
          tagStats: tagStats,
          pagination: {
            page,
            limit,
            total: parseInt(postCountResult.total),
            pages: Math.ceil(parseInt(postCountResult.total) / limit)
          }
        };
      } else if (type === 'posts' || type === 'videos') {
        result.posts = {
          data: postRows,
          tagStats: tagStats,
          pagination: {
            page,
            limit,
            total: parseInt(postCountResult.total),
            pages: Math.ceil(parseInt(postCountResult.total) / limit)
          }
        };
      }
    }

    // 只有当type为'users'时才搜索用户
    if (type === 'users') {
      const kwPattern = `%${keyword}%`;

      // 搜索用户
      const userRows = await db({ u: 'users' })
        .select(
          'u.id',
          'u.user_id',
          'u.nickname',
          'u.avatar',
          'u.bio',
          'u.location',
          'u.follow_count',
          'u.fans_count',
          'u.like_count',
          'u.created_at',
          'u.verified'
        )
        .where(function() {
          this.where('u.nickname', 'like', kwPattern)
              .orWhere('u.user_id', 'like', kwPattern);
        })
        .orderBy('u.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      // 为每个用户添加笔记数统计
      for (let user of userRows) {
        const postCount = await db('posts')
          .where({ user_id: user.id, status: 0 })
          .count('* as count')
          .first();
        user.post_count = parseInt(postCount.count);
      }

      // 检查关注状态（仅在用户已登录时）
      if (currentUserId && userRows.length > 0) {
        const userIds = userRows.map(u => u.id.toString());

        // 批量获取关注状态
        const follows = await db('follows')
          .where({ follower_id: String(currentUserId) })
          .whereIn('following_id', userIds)
          .select('following_id');
        const followingSet = new Set(follows.map(f => f.following_id.toString()));

        // 批量获取互相关注状态
        const mutuals = await db('follows')
          .where({ following_id: String(currentUserId) })
          .whereIn('follower_id', userIds)
          .select('follower_id');
        const mutualSet = new Set(mutuals.map(f => f.follower_id.toString()));

        for (let user of userRows) {
          const userIdStr = user.id.toString();
          user.isFollowing = followingSet.has(userIdStr);
          const isFollowedBy = mutualSet.has(userIdStr);
          user.isMutual = user.isFollowing && isFollowedBy;

          // 设置按钮类型
          if (user.id.toString() === currentUserId.toString()) {
            user.buttonType = 'self';
          } else if (user.isMutual) {
            user.buttonType = 'mutual';
          } else if (user.isFollowing) {
            user.buttonType = 'unfollow';
          } else if (isFollowedBy) {
            user.buttonType = 'back';
          } else {
            user.buttonType = 'follow';
          }
        }
      } else {
        // 未登录用户，所有用户都显示为未关注状态
        for (let user of userRows) {
          user.isFollowing = false;
          user.isMutual = false;
          user.buttonType = 'follow';
        }
      }

      // 获取用户总数
      const userCountResult = await db('users')
        .where(function() {
          this.where('nickname', 'like', kwPattern)
              .orWhere('user_id', 'like', kwPattern);
        })
        .count('* as total')
        .first();

      result.users = {
        data: userRows,
        pagination: {
          page,
          limit,
          total: parseInt(userCountResult.total),
          pages: Math.ceil(parseInt(userCountResult.total) / limit)
        }
      };
    }

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        keyword,
        tag,
        type: type,
        ...result
      }
    });
  } catch (error) {
    console.error('搜索失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;
