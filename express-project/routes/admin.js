const express = require('express')
const router = express.Router()
const { HTTP_STATUS, RESPONSE_CODES } = require('../constants')
const { getDB } = require('../utils/db')
const { createCrudHandlers } = require('../middleware/crudFactory')
const { recordExists } = require('../utils/dbHelper')
const { adminAuth } = require('../utils/uploadHelper')
const { requirePermission } = require('../middleware/permission')
const {
  validateLikeOrFavoriteData,
  validateFollowData,
  validateNotificationData
} = require('../utils/validationHelpers')
const { extractMentionedUsers, hasMentions } = require('../utils/mentionParser')
const NotificationHelper = require('../utils/notificationHelper')
const crypto = require('crypto')

/**
 * SHA256 哈希函数（兼容所有数据库，不依赖 MySQL 的 SHA2 函数）
 */
function sha256(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

// 创建笔记
// Posts CRUD 配置
const postsCrudConfig = {
  table: 'posts',
  name: '笔记',
  requiredFields: ['user_id', 'title', 'content'],
  updateFields: ['title', 'content', 'category_id', 'view_count', 'status'],
  cascadeRules: [
    { table: 'post_images', field: 'post_id' },
    { table: 'post_tags', field: 'post_id' },
    { table: 'comments', field: 'post_id' },
    { table: 'likes', field: 'target_id', condition: 'target_type = 1' },
    { table: 'collections', field: 'post_id' }
  ],
  searchFields: {
    title: { operator: 'LIKE' },
    user_display_id: { operator: '=' },
    category_id: { operator: '=' },
    type: {
      operator: '=',
      transform: (value) => parseInt(value) // 将字符串转换为数字
    },
    status: {
      operator: '=',
      transform: (value) => parseInt(value) // 将字符串转换为数字
    }
  },
  allowedSortFields: ['id', 'view_count', 'like_count', 'collect_count', 'comment_count', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 创建前的自定义验证和处理
  beforeCreate: async (data, req) => {
    const { user_id, images, image_urls, tags, video_upload, video, video_url, cover_url } = data

    // 检查用户是否存在
    const db = getDB();
    const userResult = await db('users').where({ id: String(user_id) }).select('id')
    if (userResult.length === 0) {
      return { isValid: false, message: '用户不存在' }
    }

    // 确保分类ID存在
    if (!data.category_id) {
      data.category_id = null
    }

    // 保存关联数据到req对象，供afterCreate使用
    req._postData = {
      images,
      image_urls,
      tags,
      video_upload,
      video,
      video_url,
      cover_url
    }

    // 删除不属于posts表的字段
    delete data.image_urls
    delete data.images
    delete data.tags
    delete data.video_upload
    delete data.video
    delete data.video_url
    delete data.cover_url

    return { isValid: true }
  },

  // 创建后的处理（处理图片和标签）
  afterCreate: async (postId, data, req) => {
    // 确保 postId 是纯数字（PostgreSQL returning 可能返回各种格式）
    let resolvedPostId = postId
    if (postId === null || postId === undefined) {
      console.error('afterCreate: postId 为空!', { postId, data: !!data })
      return
    }
    if (typeof postId === 'object') {
      resolvedPostId = postId.id || postId[0] || JSON.stringify(postId)
    }
    // 最终确保是数字字符串
    resolvedPostId = String(resolvedPostId).replace(/[^\d]/g, '')
    if (!resolvedPostId) {
      console.error('afterCreate: 无法解析 postId!', { original: postId })
      return
    }

    // 从req._postData获取关联数据（在beforeCreate中保存的）
    const postData = req._postData || {}
    const { images, image_urls, tags } = postData
    // 处理图片信息
    if (images !== undefined || image_urls !== undefined) {
      // 收集所有有效的图片URL
      const allImages = []
      // 处理images字段
      if (images && Array.isArray(images)) {
        for (const image of images) {
          if (typeof image === 'string') {
            allImages.push(image)
          } else if (image && typeof image === 'object') {
            const possibleUrlProps = ['url', 'preview', 'src', 'path', 'link']
            for (const prop of possibleUrlProps) {
              if (image[prop] && typeof image[prop] === 'string') {
                allImages.push(image[prop])
                break
              }
            }
          }
        }
      }

      // 处理image_urls字段
      if (image_urls && Array.isArray(image_urls)) {
        const validUrls = image_urls.filter(url =>
          url &&
          typeof url === 'string'
        )
        allImages.push(...validUrls)
      }

      // 插入图片
      if (allImages.length > 0) {
        const db = getDB();
        for (const imageUrl of allImages) {
          const cleanUrl = imageUrl ? imageUrl.trim().replace(/\`/g, '').replace(/\s+/g, '') : ''
          if (cleanUrl) {
            await db('post_images').insert({
              post_id: String(resolvedPostId),
              image_url: cleanUrl
            })
          }
        }
      }
    }

    // 处理标签
    if (tags && tags.length > 0) {
      const db = getDB();
      for (const tag of tags) {
        let tagId
        let tagName

        // 处理字符串格式的标签
        if (typeof tag === 'string') {
          tagName = tag
          // 查找现有标签
          const existingTag = await db('tags').where({ name: tagName }).select('id')

          if (existingTag.length > 0) {
            tagId = String(existingTag[0].id)
          } else {
            // 创建新标签（使用 .returning('id') 兼容PostgreSQL）
            const tagResult = await db('tags').insert({ name: tagName }).returning('id')
            tagId = String(Array.isArray(tagResult) && tagResult.length > 0 ? tagResult[0].id : null)
          }
        } else {
          // 处理对象格式的标签（向后兼容）
          tagId = tag.id
          tagName = tag.name

          // 如果是新标签，先创建标签
          if (tag.is_new || String(tag.id).startsWith('temp_')) {
            const existingTag = await db('tags').where({ name: tag.name }).select('id')

            if (existingTag.length > 0) {
              tagId = String(existingTag[0].id)
            } else {
              const tagResult = await db('tags').insert({ name: tag.name }).returning('id')
              tagId = String(Array.isArray(tagResult) && tagResult.length > 0 ? tagResult[0].id : null)
            }
          }
        }

        // 关联笔记和标签
        await db('post_tags').insert({
          post_id: String(resolvedPostId),
          tag_id: String(tagId)
        })

        // 更新标签使用次数
        await db('tags').where({ id: String(tagId) }).increment('use_count', 1)
      }
    }

    // 处理视频 - 存储到post_videos表
    const { video_url, cover_url } = postData
    if (video_url) {
      const db = getDB();
      await db('post_videos').insert({
        post_id: String(postId),
        video_url: video_url,
        cover_url: cover_url || null
      })
    }
  },

  // 更新前的处理
  beforeUpdate: async (data, req, id) => {
    // 确保浏览量不为负数
    if (data.view_count !== undefined && data.view_count !== null) {
      data.view_count = Math.max(0, parseInt(data.view_count) || 0)
    }

    return { isValid: true }
  },

  // 更新后的处理（处理图片和标签）
  afterUpdate: async (postId, data, req) => {
    const { images, image_urls, tags } = data

    // 更新图片信息
    if (images !== undefined || image_urls !== undefined) {
      // 删除原有图片
      const db = getDB();
      await db('post_images').where({ post_id: String(postId) }).del()

      // 使用Set来避免重复的图片URL
      const allImagesSet = new Set()

      // 处理image_urls字段
      if (image_urls && Array.isArray(image_urls)) {
        for (const url of image_urls) {
          if (url && typeof url === 'string') {
            allImagesSet.add(url)
          }
        }
      }

      // 处理images字段
      if (images && Array.isArray(images)) {
        for (const image of images) {
          if (typeof image === 'string') {
            allImagesSet.add(image)
          } else if (image && typeof image === 'object') {
            const possibleUrlProps = ['url', 'preview', 'src', 'path', 'link']
            for (const prop of possibleUrlProps) {
              if (image[prop] && typeof image[prop] === 'string') {
                allImagesSet.add(image[prop])
                break
              }
            }
          }
        }
      }

      // 插入新图片
      const allImages = Array.from(allImagesSet)
      if (allImages.length > 0) {
        const db = getDB();
        for (const imageUrl of allImages) {
          const cleanUrl = imageUrl ? imageUrl.trim().replace(/\`/g, '').replace(/\s+/g, '') : ''
          if (cleanUrl) {
            await db('post_images').insert({
              post_id: postId,
              image_url: cleanUrl
            })
          }
        }
      }
    }

    // 处理视频更新 - 只要有任何视频相关字段就触发处理
    const hasVideoUpdate = data.video_url !== undefined || data.cover_url !== undefined || data.video !== undefined

    if (hasVideoUpdate) {
      // 获取原有视频记录用于清理文件
      const db = getDB();
      const oldVideoRows = await db('post_videos').where({ post_id: String(postId) }).select('video_url', 'cover_url')

      // 删除原有视频记录
      await db('post_videos').where({ post_id: String(postId) }).del()

      // 清理废弃的视频文件
      if (oldVideoRows.length > 0) {
        const { batchCleanupFiles } = require('../utils/fileCleanup')
        const oldVideoUrls = oldVideoRows.map(row => row.video_url).filter(url => url)
        const oldCoverUrls = oldVideoRows.map(row => row.cover_url).filter(url => url)

        // 异步清理文件，不阻塞响应
        batchCleanupFiles(oldVideoUrls, oldCoverUrls).then(result => {
          // 文件清理完成
        }).catch(error => {
          console.error('后台管理系统清理废弃视频文件失败:', error)
        })
      }

      // 插入新视频记录 - 优先使用video对象，然后是分离字段
      let videoUrl = null
      let coverUrl = null

      if (data.video && data.video.url) {
        // FormModal传递的video对象格式
        videoUrl = data.video.url
        coverUrl = data.video.coverUrl || ''
      } else if (data.video_url && data.video_url.trim() !== '') {
        // 分离字段格式
        videoUrl = data.video_url
        coverUrl = data.cover_url || ''
      }

      if (videoUrl) {
        const db = getDB();
        await db('post_videos').insert({
          post_id: postId,
          video_url: videoUrl,
          cover_url: coverUrl
        })
      }
    }

    // 更新标签信息
    if (tags !== undefined) {
      // 获取原有标签，用于更新使用次数
      const db = getDB();
      const oldTags = await db('post_tags').where({ post_id: postId }).select('tag_id')

      // 删除原有标签关联
      await db('post_tags').where({ post_id: postId }).del()

      // 减少原有标签的使用次数
      for (const oldTag of oldTags) {
        await db('tags').where({ id: oldTag.tag_id }).decrement('use_count', 1)
      }

      // 处理新标签
      if (tags && tags.length > 0) {
        const db = getDB();
        for (const tag of tags) {
          let tagId
          let tagName

          // 处理字符串格式的标签
          if (typeof tag === 'string') {
            tagName = tag
            // 查找现有标签
            const existingTag = await db('tags').where({ name: tagName }).select('id')

            if (existingTag.length > 0) {
              tagId = existingTag[0].id
            } else {
              // 创建新标签（使用 .returning('id') 兼容PostgreSQL）
              const tagResult = await db('tags').insert({ name: tagName }).returning('id')
              tagId = Array.isArray(tagResult) && tagResult.length > 0 ? tagResult[0].id : null
            }
          } else {
            // 处理对象格式的标签（向后兼容）
            tagId = tag.id
            tagName = tag.name

            // 如果是新标签，先创建标签
            if (tag.is_new || String(tag.id).startsWith('temp_')) {
              const existingTag = await db('tags').where({ name: tag.name }).select('id')

              if (existingTag.length > 0) {
                tagId = existingTag[0].id
              } else {
                const tagResult = await db('tags').insert({ name: tag.name }).returning('id')
                tagId = Array.isArray(tagResult) && tagResult.length > 0 ? tagResult[0].id : null
              }
            }
          }

          // 关联笔记和标签
          await db('post_tags').insert({
            post_id: String(postId),
            tag_id: String(tagId)
          })

          // 更新标签使用次数
          await db('tags').where({ id: String(tagId) }).increment('use_count', 1)
        }
      }
    }
  },

  // 删除前的处理（减少标签使用次数）
  beforeDelete: async (id) => {
    // 获取笔记关联的标签，减少标签使用次数
    const db = getDB();
    const tagResult = await db('post_tags').where({ post_id: String(id) }).select('tag_id')

    // 减少标签使用次数
    for (const tag of tagResult) {
      await db('tags').where({ id: String(tag.tag_id) }).decrement('use_count', 1)
    }
    // 返回验证结果
    return { isValid: true }
  },

  // 批量删除前的处理
  beforeDeleteMany: async (ids) => {
    // 获取所有笔记关联的标签，减少标签使用次数
    const db = getDB();
    const tagResult = await db('post_tags').whereIn('post_id', ids.map(id => String(id))).select('tag_id')

    // 减少标签使用次数
    for (const tag of tagResult) {
      await db('tags').where({ id: String(tag.tag_id) }).decrement('use_count', 1)
    }
  },

  // 自定义查询（获取详情和列表）
  customQueries: {
    getOne: async (req) => {
      const postId = req.params.id
      const db = getDB();

      // 获取笔记基本信息
      const postResult = await db({ p: 'posts' })
        .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
        .leftJoin({ c: 'categories' }, 'p.category_id', 'c.id')
        .where({ 'p.id': String(postId) })
        .select(
          'p.id', 'p.user_id', 'p.title', 'p.content', 'p.type', 'p.category_id',
          'c.name as category', 'p.view_count', 'p.like_count', 'p.collect_count',
          'p.comment_count', 'p.status', 'p.created_at', 'u.nickname',
          db.raw("COALESCE(u.user_id, CONCAT('user', LPAD(CAST(u.id AS VARCHAR), 3, '0'))) as user_display_id")
        )

      if (postResult.length === 0) {
        return null
      }

      const post = postResult[0]

      // 根据笔记类型获取媒体信息
      if (post.type === 2) {
        // 视频笔记：获取视频信息
        const videos = await db('post_videos').where({ post_id: String(postId) }).select('video_url', 'cover_url')
        if (videos.length > 0) {
          post.video_url = videos[0].video_url
          post.cover_url = videos[0].cover_url
          post.images = [videos[0].video_url] // 将视频URL放入images数组以兼容现有逻辑
        } else {
          post.images = []
        }
      } else {
        // 图文笔记：获取图片信息
        const images = await db('post_images').where({ post_id: String(postId) }).select('image_url')
        post.images = images.map(img => img.image_url)
      }

      // 获取笔记标签
      const tags = await db({ t: 'tags' })
        .join({ pt: 'post_tags' }, 't.id', 'pt.tag_id')
        .where({ 'pt.post_id': String(postId) })
        .select('t.id', 't.name')
      post.tags = tags

      return post
    },

    getList: async (req) => {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit
      const db = getDB();

      // 构建基础查询
      let query = db({ p: 'posts' })
        .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
        .leftJoin({ c: 'categories' }, 'p.category_id', 'c.id')
        .select(
          'p.id', 'p.user_id', 'p.title', 'p.content', 'p.type', 'p.category_id',
          'c.name as category', 'p.view_count', 'p.like_count', 'p.collect_count',
          'p.comment_count', 'p.status', 'p.created_at', 'u.nickname',
          db.raw("COALESCE(u.user_id, CONCAT('user', LPAD(CAST(u.id AS VARCHAR), 3, '0'))) as user_display_id")
        )

      // 搜索条件
      if (req.query.title) {
        query = query.where('p.title', 'like', `%${req.query.title}%`)
      }

      if (req.query.user_display_id) {
        query = query.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }

      if (req.query.category_id) {
        if (req.query.category_id === 'null') {
          query = query.whereNull('p.category_id')
        } else {
          query = query.where({ 'p.category_id': req.query.category_id })
        }
      }

      if (req.query.type !== undefined && req.query.type !== '') {
        query = query.where({ 'p.type': req.query.type })
      }

      if (req.query.status !== undefined && req.query.status !== '') {
        query = query.where({ 'p.status': req.query.status })
      }

      // 获取总数
      const countQuery = db({ p: 'posts' })
        .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
        .leftJoin({ c: 'categories' }, 'p.category_id', 'c.id')

      if (req.query.title) {
        countQuery.where('p.title', 'like', `%${req.query.title}%`)
      }
      if (req.query.user_display_id) {
        countQuery.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }
      if (req.query.category_id) {
        if (req.query.category_id === 'null') {
          countQuery.whereNull('p.category_id')
        } else {
          countQuery.where({ 'p.category_id': req.query.category_id })
        }
      }
      if (req.query.type !== undefined && req.query.type !== '') {
        countQuery.where({ 'p.type': req.query.type })
      }
      if (req.query.status !== undefined && req.query.status !== '') {
        countQuery.where({ 'p.status': req.query.status })
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理 - 使用对象映射
      const allowedSortFields = {
        'id': 'p.id',
        'title': 'p.title',
        'view_count': 'p.view_count',
        'like_count': 'p.like_count',
        'collect_count': 'p.collect_count',
        'comment_count': 'p.comment_count',
        'created_at': 'p.created_at',
        'nickname': 'u.nickname'
      }

      const allowedSortOrders = {
        'asc': 'asc',
        'desc': 'desc'
      }

      const validSortField = allowedSortFields[req.query.sortField] || 'p.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据
      const posts = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      // 为每个笔记批量获取图片信息和标签信息
      if (posts.length > 0) {
        const postIds = posts.map(p => p.id)

        // 批量获取图片
        const images = await db('post_images').whereIn('post_id', postIds).select('post_id', 'image_url')
        const imageMap = {}
        images.forEach(img => {
          if (!imageMap[img.post_id]) imageMap[img.post_id] = []
          imageMap[img.post_id].push(img.image_url)
        })

        // 批量获取标签
        const tags = await db({ t: 'tags' })
          .join({ pt: 'post_tags' }, 't.id', 'pt.tag_id')
          .whereIn('pt.post_id', postIds)
          .select('pt.post_id', 't.id', 't.name')
        const tagMap = {}
        tags.forEach(t => {
          if (!tagMap[t.post_id]) tagMap[t.post_id] = []
          tagMap[t.post_id].push({ id: t.id, name: t.name })
        })

        // 组装数据
        for (let post of posts) {
          post.images = imageMap[post.id] || []
          post.tags = tagMap[post.id] || []
        }
      }

      return {
        data: posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }
  }
}

const postsHandlers = createCrudHandlers(postsCrudConfig)

// 笔记审核相关API

// 获取待审核笔记列表
router.get('/posts-audit', adminAuth, requirePermission('post_audit:view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    // 搜索条件
    let whereClause = 'WHERE p.status = 2' // 只获取待审核笔记
    const params = []

    if (req.query.keyword) {
      whereClause += ' AND (p.title LIKE ? OR p.content LIKE ?)'
      params.push(`%${req.query.keyword}%`, `%${req.query.keyword}%`)
    }

    if (req.query.user_display_id) {
      whereClause += ' AND u.user_id LIKE ?'
      params.push(`%${req.query.user_display_id}%`)
    }

    if (req.query.category_id) {
      if (req.query.category_id === 'null') {
        whereClause += ' AND p.category_id IS NULL'
      } else {
        whereClause += ' AND p.category_id = ?'
        params.push(req.query.category_id)
      }
    }

    // 获取总数
    const db = getDB();
    let countQuery = db({ p: 'posts' })
      .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
      .leftJoin({ c: 'categories' }, 'p.category_id', 'c.id')
      .where({ 'p.status': 2 });

    if (req.query.keyword) {
      countQuery.where(function() {
        this.where('p.title', 'like', `%${req.query.keyword}%`)
            .orWhere('p.content', 'like', `%${req.query.keyword}%`);
      });
    }

    if (req.query.user_display_id) {
      countQuery.where('u.user_id', 'like', `%${req.query.user_display_id}%`);
    }

    if (req.query.category_id) {
      if (req.query.category_id === 'null') {
        countQuery.whereNull('p.category_id');
      } else {
        countQuery.where({ 'p.category_id': req.query.category_id });
      }
    }

    const countResult = await countQuery.count('* as total').first();
    const total = parseInt(countResult.total);

    // 排序处理
    const allowedSortFields = {
      'id': 'p.id',
      'title': 'p.title',
      'view_count': 'p.view_count',
      'like_count': 'p.like_count',
      'collect_count': 'p.collect_count',
      'comment_count': 'p.comment_count',
      'created_at': 'p.created_at',
      'nickname': 'u.nickname'
    }

    const allowedSortOrders = {
      'asc': 'ASC',
      'desc': 'DESC'
    }

    const validSortField = allowedSortFields[req.query.sortField] || 'p.created_at'
    const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'DESC'

    // 获取数据
    let dataQuery = db({ p: 'posts' })
      .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
      .leftJoin({ c: 'categories' }, 'p.category_id', 'c.id')
      .where({ 'p.status': 2 })
      .select(
        'p.id', 'p.user_id', 'p.title', 'p.content', 'p.type', 'p.category_id',
        'c.name as category', 'p.view_count', 'p.like_count', 'p.collect_count',
        'p.comment_count', 'p.status', 'p.created_at', 'u.nickname',
        db.raw("COALESCE(u.user_id, CONCAT('user', LPAD(CAST(u.id AS VARCHAR), 3, '0'))) as user_display_id")
      );

    if (req.query.keyword) {
      dataQuery.where(function() {
        this.where('p.title', 'like', `%${req.query.keyword}%`)
            .orWhere('p.content', 'like', `%${req.query.keyword}%`);
      });
    }

    if (req.query.user_display_id) {
      dataQuery.where('u.user_id', 'like', `%${req.query.user_display_id}%`);
    }

    if (req.query.category_id) {
      if (req.query.category_id === 'null') {
        dataQuery.whereNull('p.category_id');
      } else {
        dataQuery.where({ 'p.category_id': req.query.category_id });
      }
    }

    const posts = await dataQuery.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset);

    // 为每个笔记批量获取图片信息和标签信息
    if (posts.length > 0) {
      const postIds = posts.map(p => p.id)

      // 批量获取图片
      const images = await db('post_images').whereIn('post_id', postIds).select('post_id', 'image_url')
      const imageMap = {}
      images.forEach(img => {
        if (!imageMap[img.post_id]) imageMap[img.post_id] = []
        imageMap[img.post_id].push(img.image_url)
      })

      // 批量获取标签
      const tags = await db({ t: 'tags' })
        .join({ pt: 'post_tags' }, 't.id', 'pt.tag_id')
        .whereIn('pt.post_id', postIds)
        .select('pt.post_id', 't.id', 't.name')
      const tagMap = {}
      tags.forEach(t => {
        if (!tagMap[t.post_id]) tagMap[t.post_id] = []
        tagMap[t.post_id].push({ id: t.id, name: t.name })
      })

      // 组装数据
      for (let post of posts) {
        post.images = imageMap[post.id] || []
        post.tags = tagMap[post.id] || []
      }
    }

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: {
        data: posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
  } catch (error) {
    console.error('获取待审核笔记列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取待审核笔记列表失败'
    })
  }
})

// 审核通过
router.put('/posts-audit/:id/approve', adminAuth, requirePermission('post_audit:audit'), async (req, res) => {
  try {
    const postId = req.params.id
    const adminId = req.user.adminId

    // 检查笔记是否存在
    const db = getDB();
    const postResult = await db('posts').where({ id: String(postId) }).select('id')
    if (postResult.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '笔记不存在'
      })
    }

    // 更新笔记状态为已发布
    await db('posts').where({ id: String(postId) }).update({ status: 0 })

    // 检查笔记内容是否包含@用户，如果有，发送艾特通知
    const postContentResult = await db('posts').where({ id: String(postId) }).select('user_id', 'content')
    if (postContentResult.length > 0) {
      const { user_id: userId, content } = postContentResult[0]

      // 处理@用户通知
      if (content && hasMentions(content)) {
        const mentionedUsers = extractMentionedUsers(content)

        for (const mentionedUser of mentionedUsers) {
          try {
            // 根据悦社号查找用户的自增ID
            const userRows = await db('users').where({ user_id: mentionedUser.userId }).select('id')

            if (userRows.length > 0) {
              const mentionedUserId = userRows[0].id

              // 不给自己发通知
              if (mentionedUserId !== userId) {
                // 创建@用户通知
                const mentionNotificationData = NotificationHelper.createNotificationData({
                  userId: mentionedUserId,
                  senderId: userId,
                  type: NotificationHelper.TYPES.MENTION,
                  targetId: postId
                })

                await NotificationHelper.insertNotification(db, mentionNotificationData)
              }
            }
          } catch (error) {
            console.error('处理@用户通知失败 - 用户: %s:', mentionedUser.userId, error)
          }
        }
      }
    }

    // 更新audit表中的审核记录
    await db('audit').where({ type: 3, target_id: String(postId) }).update({ 
      status: 1, 
      audit_time: db.fn.now(), 
      admin_id: adminId 
    })

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '审核通过成功'
    })
  } catch (error) {
    console.error('审核通过失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '审核通过失败'
    })
  }
})

// 拒绝发布
router.put('/posts-audit/:id/reject', adminAuth, requirePermission('post_audit:audit'), async (req, res) => {
  try {
    const postId = req.params.id
    const adminId = req.user.adminId

    // 检查笔记是否存在
    const db = getDB();
    const postResult = await db('posts').where({ id: String(postId) }).select('id')
    if (postResult.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '笔记不存在'
      })
    }

    // 未过审时设置为未过审状态
    await db('posts').where({ id: String(postId) }).update({ status: 3 })

    // 更新audit表中的审核记录
    await db('audit').where({ type: 3, target_id: String(postId) }).update({ 
      status: 2, 
      audit_time: db.fn.now(), 
      admin_id: adminId 
    })

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '拒绝发布成功'
    })
  } catch (error) {
    console.error('拒绝发布失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '拒绝发布失败'
    })
  }
})

router.post('/posts-audit', adminAuth, requirePermission('post_audit:audit'), postsHandlers.create)
router.delete('/posts-audit', adminAuth, requirePermission('post_audit:audit'), postsHandlers.deleteMany)

// 注册 Posts CRUD 路由
router.get('/posts', adminAuth, requirePermission('posts:view'), async (req, res) => {
  try {
    const result = await postsCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取笔记列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取笔记列表失败'
    })
  }
})
router.get('/posts/:id', adminAuth, requirePermission('posts:view'), async (req, res) => {
  try {
    const result = await postsCrudConfig.customQueries.getOne(req)
    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '笔记不存在'
      })
    }
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取笔记详情失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取笔记详情失败'
    })
  }
})
router.post('/posts', adminAuth, requirePermission('posts:edit'), postsHandlers.create)
router.put('/posts/:id', adminAuth, requirePermission('posts:edit'), postsHandlers.update)
router.delete('/posts/:id', adminAuth, requirePermission('posts:delete'), postsHandlers.deleteOne)
router.delete('/posts', adminAuth, requirePermission('posts:delete'), postsHandlers.deleteMany)

// 创建评论
// ===== COMMENTS CRUD (使用工厂模式) =====
const commentsCrudConfig = {
  table: 'comments',
  name: '评论',
  requiredFields: ['user_id', 'post_id', 'content'],
  updateFields: ['content'],
  cascadeRules: [
    { table: 'likes', field: 'target_id', condition: 'target_type = 2' },
    { table: 'comments', field: 'parent_id' } // 删除子评论
  ],
  searchFields: {
    post_id: { operator: '=' },
    user_display_id: { operator: '=' },
    content: { operator: 'LIKE' }
  },
  allowedSortFields: ['id', 'like_count', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 自定义验证
  beforeCreate: async (data) => {
    const { user_id, post_id, parent_id } = data
    const db = getDB();

    // 检查用户是否存在
    const userResult = await db('users').where({ id: String(user_id) }).select('id')
    if (userResult.length === 0) {
      return { isValid: false, message: '用户不存在' }
    }

    // 检查笔记是否存在
    const postResult = await db('posts').where({ id: String(post_id) }).select('id')
    if (postResult.length === 0) {
      return { isValid: false, message: '笔记不存在' }
    }

    // 如果是回复评论，检查父评论是否存在
    if (parent_id) {
      const parentResult = await db('comments').where({ id: String(parent_id) }).select('id')
      if (parentResult.length === 0) {
        return { isValid: false, message: '父评论不存在' }
      }
    }

    return { isValid: true }
  },

  // 自定义查询（用于管理后台的复杂查询）
  customQueries: {
    getList: async (req) => {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit
      const db = getDB();

      // 构建基础查询
      let query = db({ c: 'comments' })
        .leftJoin({ u: 'users' }, 'c.user_id', 'u.id')
        .leftJoin({ p: 'posts' }, 'c.post_id', 'p.id')
        .select(
          'c.id', 'c.content', 'c.parent_id', 'c.like_count', 'c.created_at',
          'c.user_id', 'u.nickname',
          db.raw("COALESCE(u.user_id, CONCAT('user', LPAD(CAST(u.id AS VARCHAR), 3, '0'))) as user_display_id"),
          'p.id as post_id', 'p.title as post_title'
        )

      // 搜索条件
      if (req.query.post_id) {
        query = query.where({ 'c.post_id': req.query.post_id })
      }

      if (req.query.user_display_id) {
        query = query.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }

      if (req.query.content) {
        query = query.where('c.content', 'like', `%${req.query.content}%`)
      }

      // 获取总数
      let countQuery = db({ c: 'comments' })
        .leftJoin({ u: 'users' }, 'c.user_id', 'u.id')
        .leftJoin({ p: 'posts' }, 'c.post_id', 'p.id')

      if (req.query.post_id) {
        countQuery = countQuery.where({ 'c.post_id': req.query.post_id })
      }
      if (req.query.user_display_id) {
        countQuery = countQuery.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }
      if (req.query.content) {
        countQuery = countQuery.where('c.content', 'like', `%${req.query.content}%`)
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理 - 使用对象映射
      const allowedSortFields = {
        'id': 'c.id',
        'content': 'c.content',
        'like_count': 'c.like_count',
        'created_at': 'c.created_at',
        'nickname': 'u.nickname'
      }

      const allowedSortOrders = {
        'asc': 'asc',
        'desc': 'desc'
      }

      const validSortField = allowedSortFields[req.query.sortField] || 'c.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据
      const comments = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      return {
        data: comments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }
  }
}

const commentsHandlers = createCrudHandlers(commentsCrudConfig)

// 评论CRUD路由
router.get('/comments', adminAuth, requirePermission('comments:view'), async (req, res) => {
  try {
    const result = await commentsCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取评论列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取评论列表失败'
    })
  }
})
router.get('/comments/:id', adminAuth, requirePermission('comments:view'), commentsHandlers.getOne)
router.post('/comments', adminAuth, requirePermission('comments:create'), commentsHandlers.create)
router.put('/comments/:id', adminAuth, requirePermission('comments:edit'), commentsHandlers.update)
router.delete('/comments/:id', adminAuth, requirePermission('comments:delete'), commentsHandlers.deleteOne)
router.delete('/comments', adminAuth, requirePermission('comments:delete'), commentsHandlers.deleteMany)

// 创建标签
// ==================== 标签管理（使用CRUD工厂重构） ====================

// 标签CRUD配置
const tagsCrudConfig = {
  table: 'tags',
  name: '标签',
  requiredFields: ['name'],
  updateFields: ['name', 'description'],
  uniqueFields: ['name'],
  cascadeRules: [
    { table: 'post_tags', field: 'tag_id' }
  ],
  searchFields: {
    name: { operator: 'LIKE' }
  },
  allowedSortFields: ['id', 'use_count', 'created_at'],
  defaultOrderBy: 'created_at DESC'
}

// 生成标签CRUD处理器
const tagsHandlers = createCrudHandlers(tagsCrudConfig)

// 标签路由
router.get('/tags', adminAuth, requirePermission('tags:view'), tagsHandlers.getList)
router.get('/tags/:id', adminAuth, requirePermission('tags:view'), tagsHandlers.getOne)
router.post('/tags', adminAuth, requirePermission('tags:create'), tagsHandlers.create)
router.put('/tags/:id', adminAuth, requirePermission('tags:edit'), tagsHandlers.update)
router.delete('/tags/:id', adminAuth, requirePermission('tags:delete'), tagsHandlers.deleteOne)
router.delete('/tags', adminAuth, requirePermission('tags:delete'), tagsHandlers.deleteMany)

// ==================== 点赞管理（使用CRUD工厂重构） ====================

// 点赞CRUD配置
const likesCrudConfig = {
  table: 'likes',
  name: '点赞',
  requiredFields: ['user_id', 'target_type', 'target_id'],
  updateFields: ['target_type', 'target_id'],
  searchFields: {
    user_id: { operator: '=' },
    target_type: { operator: '=' },
    target_id: { operator: '=' }
  },
  allowedSortFields: ['id', 'user_id', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 自定义验证逻辑
  beforeCreate: async (data) => {
    await validateLikeOrFavoriteData(data)

    // 检查目标是否存在
    const targetTable = data.target_type == 1 ? 'posts' : 'comments'
    if (!(await recordExists(targetTable, 'id', data.target_id))) {
      return {
        isValid: false,
        message: data.target_type == 1 ? '笔记不存在' : '评论不存在',
        code: RESPONSE_CODES.NOT_FOUND
      }
    }

    return { isValid: true }
  },

  beforeUpdate: async (data) => {
    await validateLikeOrFavoriteData(data)
    return { isValid: true }
  },

  // 自定义查询（用于管理后台的复杂查询）
  customQueries: {
    getList: async (req) => {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit
      const db = getDB();

      // 构建基础查询
      let query = db({ l: 'likes' })
        .leftJoin({ u: 'users' }, 'l.user_id', 'u.id')
        .select(
          'l.id', 'l.user_id', 'l.target_type', 'l.target_id', 'l.created_at',
          'u.nickname',
          db.raw("COALESCE(u.user_id, CONCAT('user', LPAD(CAST(u.id AS VARCHAR), 3, '0'))) as user_display_id")
        )

      // 搜索条件
      if (req.query.user_display_id) {
        query = query.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }

      if (req.query.target_type) {
        query = query.where({ 'l.target_type': req.query.target_type })
      }

      if (req.query.target_id) {
        query = query.where({ 'l.target_id': req.query.target_id })
      }

      // 获取总数
      let countQuery = db({ l: 'likes' }).leftJoin({ u: 'users' }, 'l.user_id', 'u.id')

      if (req.query.user_display_id) {
        countQuery = countQuery.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }
      if (req.query.target_type) {
        countQuery = countQuery.where({ 'l.target_type': req.query.target_type })
      }
      if (req.query.target_id) {
        countQuery = countQuery.where({ 'l.target_id': req.query.target_id })
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理 - 使用对象映射
      const allowedSortFields = {
        'id': 'l.id',
        'user_id': 'l.user_id',
        'created_at': 'l.created_at'
      }

      const allowedSortOrders = {
        'asc': 'asc',
        'desc': 'desc'
      }

      const validSortField = allowedSortFields[req.query.sortField] || 'l.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据
      const likes = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      return {
        data: likes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }
  }
}

// 生成点赞CRUD处理器
const likesHandlers = createCrudHandlers(likesCrudConfig)

// 点赞路由
router.get('/likes', adminAuth, requirePermission('likes:view'), async (req, res) => {
  try {
    const result = await likesCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取点赞列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取点赞列表失败'
    })
  }
})
router.get('/likes/:id', adminAuth, requirePermission('likes:view'), likesHandlers.getOne)
router.post('/likes', adminAuth, requirePermission('likes:view'), likesHandlers.create)
router.put('/likes/:id', adminAuth, requirePermission('likes:view'), likesHandlers.update)
router.delete('/likes/:id', adminAuth, requirePermission('likes:delete'), likesHandlers.deleteOne)
router.delete('/likes', adminAuth, requirePermission('likes:delete'), likesHandlers.deleteMany)

// 创建收藏
// ==================== 收藏管理（使用CRUD工厂重构） ====================

// 收藏CRUD配置
const collectionsCrudConfig = {
  table: 'collections',
  name: '收藏',
  requiredFields: ['user_id', 'post_id'],
  updateFields: ['post_id'],
  searchFields: {
    user_id: { operator: '=' },
    post_id: { operator: '=' }
  },
  allowedSortFields: ['id', 'user_id', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 自定义验证逻辑
  beforeCreate: async (data) => {
    // 检查用户是否存在
    if (!(await recordExists('users', 'id', data.user_id))) {
      return {
        isValid: false,
        message: '用户不存在',
        code: RESPONSE_CODES.NOT_FOUND
      }
    }

    // 检查笔记是否存在
    if (!(await recordExists('posts', 'id', data.post_id))) {
      return {
        isValid: false,
        message: '笔记不存在',
        code: RESPONSE_CODES.NOT_FOUND
      }
    }

    // 检查是否已经收藏
    const db = getDB();
    const existing = await db('collections')
      .where({ 
        user_id: String(data.user_id), 
        post_id: String(data.post_id) 
      })
      .select('id')
    if (existing.length > 0) {
      return {
        isValid: false,
        message: '已经收藏过该笔记',
        code: RESPONSE_CODES.CONFLICT
      }
    }

    return { isValid: true }
  },

  beforeUpdate: async (data) => {
    // 检查笔记是否存在
    if (data.post_id && !(await recordExists('posts', 'id', data.post_id))) {
      return {
        isValid: false,
        message: '笔记不存在',
        code: RESPONSE_CODES.NOT_FOUND
      }
    }

    return { isValid: true }
  },

  // 自定义查询（用于管理后台的复杂查询）
  customQueries: {
    getList: async (req) => {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit
      const db = getDB();

      // 构建基础查询
      let query = db({ c: 'collections' })
        .leftJoin({ u: 'users' }, 'c.user_id', 'u.id')
        .leftJoin({ p: 'posts' }, 'c.post_id', 'p.id')
        .select(
          'c.id', 'c.user_id', 'c.post_id', 'c.created_at',
          'u.nickname',
          db.raw("COALESCE(u.user_id, CONCAT('user', LPAD(CAST(u.id AS VARCHAR), 3, '0'))) as user_display_id"),
          'p.title as post_title'
        )

      // 搜索条件
      if (req.query.user_display_id) {
        query = query.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }

      if (req.query.post_id) {
        query = query.where({ 'c.post_id': req.query.post_id })
      }

      // 获取总数
      let countQuery = db({ c: 'collections' }).leftJoin({ u: 'users' }, 'c.user_id', 'u.id')

      if (req.query.user_display_id) {
        countQuery = countQuery.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }
      if (req.query.post_id) {
        countQuery = countQuery.where({ 'c.post_id': req.query.post_id })
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理 - 使用对象映射
      const allowedSortFields = {
        'id': 'c.id',
        'user_id': 'c.user_id',
        'created_at': 'c.created_at'
      }

      const allowedSortOrders = {
        'asc': 'asc',
        'desc': 'desc'
      }

      const validSortField = allowedSortFields[req.query.sortField] || 'c.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据
      const collections = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      return {
        data: collections,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }
  }
}

// 生成收藏CRUD处理器
const collectionsHandlers = createCrudHandlers(collectionsCrudConfig)

// 收藏路由
router.get('/collections', adminAuth, requirePermission('collections:view'), async (req, res) => {
  try {
    const result = await collectionsCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取收藏列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取收藏列表失败'
    })
  }
})
router.get('/collections/:id', adminAuth, requirePermission('collections:view'), collectionsHandlers.getOne)
router.post('/collections', adminAuth, requirePermission('collections:view'), collectionsHandlers.create)
router.put('/collections/:id', adminAuth, requirePermission('collections:view'), collectionsHandlers.update)
router.delete('/collections/:id', adminAuth, requirePermission('collections:delete'), collectionsHandlers.deleteOne)
router.delete('/collections', adminAuth, requirePermission('collections:delete'), collectionsHandlers.deleteMany)

// 创建关注
// ==================== 关注管理（使用CRUD工厂重构） ====================

// 关注CRUD配置
const followsCrudConfig = {
  table: 'follows',
  name: '关注',
  requiredFields: ['follower_id', 'following_id'],
  updateFields: ['following_id'],
  searchFields: {
    follower_id: { operator: '=' },
    following_id: { operator: '=' }
  },
  allowedSortFields: ['id', 'follower_id', 'following_id', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 自定义验证逻辑
  beforeCreate: async (data) => {
    await validateFollowData(data)

    // 检查是否已经关注
    const db = getDB();
    const existing = await db('follows')
      .where({ 
        follower_id: String(data.follower_id), 
        following_id: String(data.following_id) 
      })
      .select('id')
    if (existing.length > 0) {
      return {
        isValid: false,
        message: '已经关注过了',
        code: RESPONSE_CODES.CONFLICT
      }
    }

    return { isValid: true }
  },

  beforeUpdate: async (data, id) => {
    if (data.following_id) {
      // 获取当前记录的关注者ID
      const db = getDB();
      const current = await db('follows').where({ id: String(id) }).select('follower_id')
      if (current.length === 0) {
        return {
          isValid: false,
          message: '关注记录不存在',
          code: RESPONSE_CODES.NOT_FOUND
        }
      }

      const updateData = {
        follower_id: current[0].follower_id,
        following_id: data.following_id
      }
      await validateFollowData(updateData)
    }

    return { isValid: true }
  },

  // 自定义查询（用于管理后台的复杂查询）
  customQueries: {
    getList: async (req) => {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit
      const db = getDB();

      // 构建基础查询
      let query = db({ f: 'follows' })
        .leftJoin({ u1: 'users' }, 'f.follower_id', 'u1.id')
        .leftJoin({ u2: 'users' }, 'f.following_id', 'u2.id')
        .select(
          'f.id', 'f.follower_id', 'f.following_id', 'f.created_at',
          'u1.nickname as follower_nickname',
          db.raw("COALESCE(u1.user_id, CONCAT('user', LPAD(CAST(u1.id AS VARCHAR), 3, '0'))) as follower_display_id"),
          'u2.nickname as following_nickname',
          db.raw("COALESCE(u2.user_id, CONCAT('user', LPAD(CAST(u2.id AS VARCHAR), 3, '0'))) as following_display_id")
        )

      // 搜索条件
      if (req.query.follower_display_id) {
        // 根据关注者悦社号查找用户ID
        const userResult = await db("users")
          .whereRaw("COALESCE(user_id, CONCAT('user', LPAD(id, 3, '0'))) = ?", [req.query.follower_display_id])
          .select('id')

        if (userResult.length > 0) {
          query = query.where({ 'f.follower_id': userResult[0].id })
        } else {
          return {
            data: [],
            pagination: { page: parseInt(req.query.page) || 1, limit: parseInt(req.query.limit) || 20, total: 0, pages: 0 }
          }
        }
      }

      if (req.query.following_display_id) {
        const userResult = await db("users")
          .whereRaw("COALESCE(user_id, CONCAT('user', LPAD(id, 3, '0'))) = ?", [req.query.following_display_id])
          .select('id')

        if (userResult.length > 0) {
          query = query.where({ 'f.following_id': userResult[0].id })
        } else {
          return {
            data: [],
            pagination: { page: parseInt(req.query.page) || 1, limit: parseInt(req.query.limit) || 20, total: 0, pages: 0 }
          }
        }
      }

      // 获取总数
      let countQuery = db({ f: 'follows' })

      if (req.query.follower_display_id) {
        const userResult = await db("users")
          .whereRaw("COALESCE(user_id, CONCAT('user', LPAD(id, 3, '0'))) = ?", [req.query.follower_display_id])
          .select('id')
        if (userResult.length > 0) {
          countQuery = countQuery.where({ 'f.follower_id': userResult[0].id })
        }
      }

      if (req.query.following_display_id) {
        const userResult = await db("users")
          .whereRaw("COALESCE(user_id, CONCAT('user', LPAD(id, 3, '0'))) = ?", [req.query.following_display_id])
          .select('id')
        if (userResult.length > 0) {
          countQuery = countQuery.where({ 'f.following_id': userResult[0].id })
        }
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理
      const allowedSortFields = {
        'id': 'f.id',
        'follower_id': 'f.follower_id',
        'following_id': 'f.following_id',
        'created_at': 'f.created_at'
      }

      const allowedSortOrders = { 'asc': 'asc', 'desc': 'desc' }

      const validSortField = allowedSortFields[req.query.sortField] || 'f.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据
      const follows = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      return {
        data: follows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    }
  }
}

// 生成关注CRUD处理器
const followsHandlers = createCrudHandlers(followsCrudConfig)

// 关注路由
router.get('/follows', adminAuth, requirePermission('follows:view'), async (req, res) => {
  try {
    const result = await followsCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取关注列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取关注列表失败'
    })
  }
})
router.get('/follows/:id', adminAuth, requirePermission('follows:view'), followsHandlers.getOne)
router.post('/follows', adminAuth, requirePermission('follows:view'), followsHandlers.create)
router.put('/follows/:id', adminAuth, requirePermission('follows:view'), followsHandlers.update)
router.delete('/follows/:id', adminAuth, requirePermission('follows:delete'), followsHandlers.deleteOne)
router.delete('/follows', adminAuth, requirePermission('follows:delete'), followsHandlers.deleteMany)

// 通知管理 CRUD 配置
const notificationsCrudConfig = {
  table: 'notifications',
  name: '通知',
  requiredFields: ['user_id', 'sender_id', 'type', 'title'],
  updateFields: ['user_id', 'sender_id', 'type', 'title', 'target_id', 'comment_id', 'is_read'],
  searchFields: {
    user_id: { operator: '=' },
    type: { operator: '=' },
    is_read: { operator: '=' }
  },
  allowedSortFields: ['id', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 自定义查询（用于管理后台的复杂查询）
  customQueries: {
    getList: async (req) => {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit
      const db = getDB();

      // 构建基础查询
      let query = db({ n: 'notifications' })
        .leftJoin({ u1: 'users' }, 'n.user_id', 'u1.id')
        .leftJoin({ u2: 'users' }, 'n.sender_id', 'u2.id')
        .select(
          'n.id', 'n.user_id', 'n.sender_id', 'n.type', 'n.title', 'n.target_id',
          'n.comment_id', 'n.is_read', 'n.created_at',
          'u1.nickname as user_nickname',
          db.raw("COALESCE(u1.user_id, CONCAT('user', LPAD(CAST(u1.id AS VARCHAR), 3, '0'))) as user_display_id"),
          'u2.nickname as sender_nickname',
          db.raw("COALESCE(u2.user_id, CONCAT('user', LPAD(CAST(u2.id AS VARCHAR), 3, '0'))) as sender_display_id")
        )

      // 搜索条件
      if (req.query.user_display_id) {
        query = query.where('u1.user_id', 'like', `%${req.query.user_display_id}%`)
      }

      if (req.query.type) {
        query = query.where({ 'n.type': req.query.type })
      }

      if (req.query.is_read !== undefined) {
        query = query.where({ 'n.is_read': req.query.is_read })
      }

      // 获取总数
      let countQuery = db({ n: 'notifications' }).leftJoin({ u1: 'users' }, 'n.user_id', 'u1.id')

      if (req.query.user_display_id) {
        countQuery = countQuery.where('u1.user_id', 'like', `%${req.query.user_display_id}%`)
      }
      if (req.query.type) {
        countQuery = countQuery.where({ 'n.type': req.query.type })
      }
      if (req.query.is_read !== undefined) {
        countQuery = countQuery.where({ 'n.is_read': req.query.is_read })
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理 - 使用对象映射
      const allowedSortFields = { 'id': 'n.id', 'created_at': 'n.created_at' }
      const allowedSortOrders = { 'asc': 'asc', 'desc': 'desc' }

      const validSortField = allowedSortFields[req.query.sortField] || 'n.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据
      const notifications = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      return {
        data: notifications,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    }
  }
}

const notificationsHandlers = createCrudHandlers(notificationsCrudConfig)

// 通知管理路由
router.get('/notifications', adminAuth, requirePermission('notifications:view'), async (req, res) => {
  try {
    const result = await notificationsCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取通知列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取通知列表失败'
    })
  }
})
router.get('/notifications/:id', adminAuth, requirePermission('notifications:view'), notificationsHandlers.getOne)
router.post('/notifications', adminAuth, requirePermission('notifications:create'), notificationsHandlers.create)
router.put('/notifications/:id', adminAuth, requirePermission('notifications:edit'), notificationsHandlers.update)
router.delete('/notifications/:id', adminAuth, requirePermission('notifications:delete'), notificationsHandlers.deleteOne)
router.delete('/notifications', adminAuth, requirePermission('notifications:delete'), notificationsHandlers.deleteMany)

// 会话管理 CRUD 配置
const sessionsCrudConfig = {
  table: 'user_sessions',
  name: '会话',
  requiredFields: ['user_id'],
  updateFields: ['user_agent', 'is_active'],
  searchFields: {
    user_id: { operator: '=' },
    is_active: { operator: '=' }
  },
  allowedSortFields: ['id', 'is_active', 'expires_at', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 自定义创建前验证
  beforeCreate: async (data) => {
    await validateNotificationData(data)

    // 生成refresh_token
    const crypto = require('crypto')
    data.refresh_token = crypto.randomBytes(32).toString('hex')

    // 设置过期时间（30天）
    const expires_at = new Date()
    expires_at.setDate(expires_at.getDate() + 30)
    data.expires_at = expires_at

    // 设置默认值
    data.user_agent = data.user_agent || ''
    data.is_active = data.is_active ? 1 : 0
  },

  // 自定义查询
  customQueries: {
    getList: async (req) => {
      const db = getDB();
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit

      // 构建基础查询
      let query = db({ s: 'user_sessions' })
        .leftJoin({ u: 'users' }, 's.user_id', 'u.id')
        .select(
          's.id', 's.user_id', 's.refresh_token', 's.user_agent', 's.is_active',
          's.expires_at', 's.created_at',
          'u.nickname',
          db.raw("COALESCE(u.user_id, CONCAT('user', LPAD(CAST(u.id AS VARCHAR), 3, '0'))) as user_display_id")
        )

      // 搜索条件
      if (req.query.user_display_id) {
        query = query.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }

      if (req.query.is_active !== undefined && req.query.is_active !== '') {
        query = query.where({ 's.is_active': req.query.is_active })
      }

      // 获取总数
      let countQuery = db({ s: 'user_sessions' }).leftJoin({ u: 'users' }, 's.user_id', 'u.id')

      if (req.query.user_display_id) {
        countQuery = countQuery.where('u.user_id', 'like', `%${req.query.user_display_id}%`)
      }
      if (req.query.is_active !== undefined && req.query.is_active !== '') {
        countQuery = countQuery.where({ 's.is_active': req.query.is_active })
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理 - 使用对象映射
      const allowedSortFields = {
        'id': 's.id',
        'is_active': 's.is_active',
        'expires_at': 's.expires_at',
        'created_at': 's.created_at'
      }

      const allowedSortOrders = { 'asc': 'asc', 'desc': 'desc' }

      const validSortField = allowedSortFields[req.query.sortField] || 's.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据
      const sessions = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      return {
        data: sessions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    }
  }
}

const sessionsHandlers = createCrudHandlers(sessionsCrudConfig)

// 会话管理路由
router.get('/sessions', adminAuth, requirePermission('sessions:view'), async (req, res) => {
  try {
    const result = await sessionsCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取会话列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取会话列表失败'
    })
  }
})
router.get('/sessions/:id', adminAuth, requirePermission('sessions:view'), sessionsHandlers.getOne)
router.post('/sessions', adminAuth, requirePermission('sessions:create'), sessionsHandlers.create)
router.put('/sessions/:id', adminAuth, requirePermission('sessions:edit'), sessionsHandlers.update)
router.delete('/sessions/:id', adminAuth, requirePermission('sessions:delete'), sessionsHandlers.deleteOne)
router.delete('/sessions', adminAuth, requirePermission('sessions:delete'), sessionsHandlers.deleteMany)

// 管理员会话管理 CRUD 配置
const adminSessionsCrudConfig = {
  table: 'admin_sessions',
  name: '管理员会话',
  requiredFields: ['admin_id'],
  updateFields: ['user_agent', 'is_active'],
  searchFields: {
    admin_id: { operator: '=' },
    is_active: { operator: '=' }
  },
  allowedSortFields: ['id', 'is_active', 'expires_at', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 自定义查询
  customQueries: {
    getList: async (req) => {
      const db = getDB();
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit

      // 构建基础查询
      let query = db({ s: 'admin_sessions' })
        .leftJoin({ a: 'admin' }, 's.admin_id', 'a.id')
        .select(
          's.id', 's.admin_id', 's.refresh_token', 's.user_agent', 's.is_active',
          's.expires_at', 's.created_at',
          'a.username'
        )

      // 搜索条件
      if (req.query.username) {
        query = query.where('a.username', 'like', `%${req.query.username}%`)
      }

      if (req.query.is_active !== undefined && req.query.is_active !== '') {
        query = query.where({ 's.is_active': req.query.is_active })
      }

      // 获取总数
      let countQuery = db({ s: 'admin_sessions' }).leftJoin({ a: 'admin' }, 's.admin_id', 'a.id')

      if (req.query.username) {
        countQuery = countQuery.where('a.username', 'like', `%${req.query.username}%`)
      }
      if (req.query.is_active !== undefined && req.query.is_active !== '') {
        countQuery = countQuery.where({ 's.is_active': req.query.is_active })
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理 - 使用对象映射
      const allowedSortFields = {
        'id': 's.id',
        'is_active': 's.is_active',
        'expires_at': 's.expires_at',
        'created_at': 's.created_at'
      }

      const allowedSortOrders = { 'asc': 'asc', 'desc': 'desc' }

      const validSortField = allowedSortFields[req.query.sortField] || 's.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据
      const sessions = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      return {
        data: sessions,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    }
  }
}

const adminSessionsHandlers = createCrudHandlers(adminSessionsCrudConfig)

// 管理员会话管理路由
// 管理员会话管理路由
router.get('/admin-sessions', adminAuth, requirePermission('admin_sessions:view'), async (req, res) => {
  try {
    const result = await adminSessionsCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取管理员会话列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取管理员会话列表失败'
    })
  }
})
router.get('/admin-sessions/:id', adminAuth, requirePermission('admin_sessions:view'), adminSessionsHandlers.getOne)
router.post('/admin-sessions', adminAuth, requirePermission('admin_sessions:create'), adminSessionsHandlers.create)
router.put('/admin-sessions/:id', adminAuth, requirePermission('admin_sessions:edit'), adminSessionsHandlers.update)
router.delete('/admin-sessions/:id', adminAuth, requirePermission('admin_sessions:delete'), adminSessionsHandlers.deleteOne)
router.delete('/admin-sessions', adminAuth, requirePermission('admin_sessions:delete'), adminSessionsHandlers.deleteMany)



// ===== USERS CRUD (使用工厂模式) =====


// ===== USERS CRUD (使用工厂模式) =====
const usersCrudConfig = {
  table: 'users',
  name: '用户',
  requiredFields: ['user_id', 'nickname'],
  updateFields: ['user_id', 'nickname', 'avatar', 'bio', 'location', 'is_active', 'gender', 'zodiac_sign', 'mbti', 'education', 'major', 'interests', 'verified'],
  uniqueFields: ['user_id'],
  cascadeRules: [
    { table: 'posts', field: 'user_id' },
    { table: 'comments', field: 'user_id' },
    { table: 'likes', field: 'user_id' },
    { table: 'collections', field: 'user_id' },
    { table: 'follows', field: 'follower_id' },
    { table: 'follows', field: 'following_id' },
    { table: 'notifications', field: 'user_id' },
    { table: 'user_sessions', field: 'user_id' }
  ],
  searchFields: {
    user_id: { operator: 'LIKE' },
    nickname: { operator: 'LIKE' },
    location: { operator: 'LIKE' },
    is_active: { operator: '=' }
  },
  allowedSortFields: ['id', 'fans_count', 'like_count', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 自定义数据处理
  beforeCreate: async (data) => {
    // 处理interests字段（转换为JSON字符串）
    if (data.interests) {
      data.interests = Array.isArray(data.interests) ? JSON.stringify(data.interests) : data.interests
    }

    // 设置默认值
    // 使用 Node.js crypto 生成 SHA256 哈希（兼容 PostgreSQL，不依赖 MySQL 的 SHA2 函数）
    const db = getDB();
    if (!data.password) {
      data.password = sha256('123456')
    } else {
      data.password = sha256(data.password)
    }
    data.avatar = data.avatar || ''
    data.bio = data.bio || ''
    data.location = data.location || ''
    data.is_active = data.is_active ? 1 : 0

    return { isValid: true }
  },

  beforeUpdate: async (data) => {
    // 处理interests字段（转换为JSON字符串）
    if (data.interests) {
      data.interests = Array.isArray(data.interests) ? JSON.stringify(data.interests) : data.interests
    }

    // 处理is_active字段
    if (data.is_active !== undefined) {
      data.is_active = data.is_active ? 1 : 0
    }

    return { isValid: true }
  },

  // 自定义查询，关联用户封禁状态
  customQueries: {
    getList: async (req) => {
      const page = parseInt(req.query.page) || 1
      const limit = parseInt(req.query.limit) || 20
      const offset = (page - 1) * limit
      const db = getDB();

      // 构建基础查询 - 使用子查询获取最新封禁记录
      const banSubquery = db('user_ban')
        .whereIn('id', function() {
          this.select(db.raw('MAX(id)'))
            .from('user_ban')
            .where('status', 0)
            .orWhere('status', 3)
            .groupBy('user_id');
        })
        .select('user_id', 'status', 'reason', 'end_time', 'created_at')
        .as('ub');

      let query = db({ u: 'users' }).leftJoin(banSubquery, 'u.id', 'ub.user_id').select(
        'u.*',
        db.raw("COALESCE(ub.status, -1) as ban_status"),
        'ub.reason as ban_reason',
        'ub.end_time as ban_end_time',
        'ub.created_at as ban_created_at'
      );

      // 搜索条件
      if (req.query.user_id) {
        query = query.where('u.user_id', 'like', `%${req.query.user_id}%`)
      }

      if (req.query.nickname) {
        query = query.where('u.nickname', 'like', `%${req.query.nickname}%`)
      }

      if (req.query.location) {
        query = query.where('u.location', 'like', `%${req.query.location}%`)
      }

      if (req.query.is_active !== undefined && req.query.is_active !== '') {
        query = query.where({ 'u.is_active': req.query.is_active })
      }

      if (req.query.ban_status !== undefined && req.query.ban_status !== '') {
        if (req.query.ban_status === 'normal') {
          query = query.whereNull('ub.user_id')
        } else if (req.query.ban_status === 'banned') {
          query = query.whereNotNull('ub.user_id')
        }
      }

      // 获取总数（使用子查询确保计数准确）
      let countQuery = db({ u: 'users' }).leftJoin(banSubquery, 'u.id', 'ub.user_id');

      if (req.query.user_id) {
        countQuery = countQuery.where('u.user_id', 'like', `%${req.query.user_id}%`)
      }
      if (req.query.nickname) {
        countQuery = countQuery.where('u.nickname', 'like', `%${req.query.nickname}%`)
      }
      if (req.query.location) {
        countQuery = countQuery.where('u.location', 'like', `%${req.query.location}%`)
      }
      if (req.query.is_active !== undefined && req.query.is_active !== '') {
        countQuery = countQuery.where({ 'u.is_active': req.query.is_active })
      }
      if (req.query.ban_status === 'normal') {
        countQuery = countQuery.whereNull('ub.user_id')
      } else if (req.query.ban_status === 'banned') {
        countQuery = countQuery.whereNotNull('ub.user_id')
      }

      const countResult = await countQuery.count('* as total').first()
      const total = parseInt(countResult.total)

      // 排序处理
      const allowedSortFields = {
        'id': 'u.id',
        'user_id': 'u.user_id',
        'nickname': 'u.nickname',
        'fans_count': 'u.fans_count',
        'like_count': 'u.like_count',
        'created_at': 'u.created_at'
      }
      const allowedSortOrders = { 'asc': 'asc', 'desc': 'desc' }

      const validSortField = allowedSortFields[req.query.sortField] || 'u.created_at'
      const validSortOrder = allowedSortOrders[req.query.sortOrder?.toLowerCase()] || 'desc'

      // 获取数据（使用子查询只获取每个用户最新的封禁记录）
      const users = await query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(limit).offset(offset)

      // 处理用户数据
      for (let user of users) {
        // 处理interests字段
        if (user.interests) {
          try {
            user.interests = JSON.parse(user.interests)
          } catch (e) {
            user.interests = null
          }
        }

        // 合并封禁状态为完整状态文本
        if (user.ban_status === -1) {
          user.ban_status_display = '正常'
        } else if (user.ban_status === 0) {
          user.ban_status_display = '封禁中'
        } else if (user.ban_status === 3) {
          user.ban_status_display = '永久封禁'
        } else {
          user.ban_status_display = '正常'
        }
      }

      return {
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    },

    getOne: async (req) => {
      const userId = req.params.id
      const db = getDB();

      const banSubquery = db('user_ban')
        .whereIn('id', function() {
          this.select(db.raw('MAX(id)'))
            .from('user_ban')
            .where('status', 0)
            .orWhere('status', 3)
            .groupBy('user_id');
        })
        .select('user_id', 'status', 'reason', 'end_time', 'created_at')
        .as('ub');

      const userResult = await db({ u: 'users' })
        .leftJoin(banSubquery, 'u.id', 'ub.user_id')
        .where({ 'u.id': String(userId) })
        .select(
          'u.*',
          db.raw("COALESCE(ub.status, -1) as ban_status"),
          'ub.reason as ban_reason',
          'ub.end_time as ban_end_time',
          'ub.created_at as ban_created_at'
        );

      if (userResult.length === 0) {
        return null
      }

      const user = userResult[0]

      // 处理interests字段
      if (user.interests) {
        try {
          user.interests = JSON.parse(user.interests)
        } catch (e) {
          user.interests = null
        }
      }

      // 合并封禁状态为完整状态文本
      if (user.ban_status === -1) {
        user.ban_status_display = '正常'
      } else if (user.ban_status === 0) {
        user.ban_status_display = '封禁中'
      } else if (user.ban_status === 3) {
        user.ban_status_display = '永久封禁'
      } else {
        user.ban_status_display = '正常'
      }

      return user
    }
  }
}

const usersHandlers = createCrudHandlers(usersCrudConfig)

// 用户CRUD路由
router.get('/users', adminAuth, requirePermission('users:view'), async (req, res) => {
  try {
    const result = await usersCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取用户列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取用户列表失败'
    })
  }
})
router.get('/users/:id', adminAuth, requirePermission('users:view'), async (req, res) => {
  try {
    const result = await usersCrudConfig.customQueries.getOne(req)
    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '用户不存在'
      })
    }
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取用户详情失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取用户详情失败'
    })
  }
})
router.post('/users', adminAuth, requirePermission('users:edit'), usersHandlers.create)
router.put('/users/:id', adminAuth, requirePermission('users:edit'), usersHandlers.update)
router.delete('/users/:id', adminAuth, requirePermission('users:delete'), usersHandlers.deleteOne)
router.delete('/users', adminAuth, requirePermission('users:delete'), usersHandlers.deleteMany)

// 更新用户is_active状态的辅助函数
async function updateUserActiveStatus(userId, active, operatorId) {
  try {
    const db = getDB();
    await db('users').where({ id: String(userId) }).update({ is_active: active ? 1 : 0 })
    console.log(`用户 ${userId} 的is_active状态已更新为 ${active ? 1 : 0}，操作人：${operatorId}`)
  } catch (error) {
    console.error('更新用户is_active状态失败:', error)
    throw error
  }
}

// 撤销现有封禁记录的辅助函数
async function revokeExistingBans(userId, operatorId) {
  try {
    const db = getDB();
    // 检查是否已经有未解除的封禁记录
    const existingBan = await db('user_ban')
      .where({ user_id: String(userId) })
      .whereIn('status', [0, 3])
      .select('id')

    // 如果有未解除的封禁记录，先将其状态改为"封禁撤销"
    if (existingBan.length > 0) {
      const updatePromises = existingBan.map(ban =>
        db('user_ban').where({ id: ban.id }).update({ status: 4, operator: operatorId })
      )
      await Promise.all(updatePromises)

      console.log(`用户 ${userId} 的 ${existingBan.length} 条现有封禁记录已被撤销，操作人：${operatorId}`)

      // 恢复用户的is_active为1
      await updateUserActiveStatus(userId, true, operatorId)
    }

    return existingBan.length > 0
  } catch (error) {
    console.error('撤销现有封禁记录失败:', error)
    throw error
  }
}

// 用户封禁操作
router.post('/users/:id/ban', adminAuth, requirePermission('users:ban'), async (req, res) => {
  try {
    const userId = req.params.id
    const { reason, end_time } = req.body
    const adminId = req.user?.id || 0

    console.log(`开始封禁用户 ${userId}，操作人：${adminId}`)

    const db = getDB();

    // 检查用户是否存在
    const userResult = await db('users').where({ id: String(userId) }).select('id')
    if (userResult.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '用户不存在'
      })
    }

    // 撤销现有封禁记录
    await revokeExistingBans(userId, adminId)

    // 处理封禁数据
    const data = {
      user_id: userId,
      reason,
      end_time,

      status: 0
    }

    // 验证状态值
    const validStatuses = [0, 1, 2, 3, 4]
    const statusNum = data.status !== undefined ? Number(data.status) : 0
    if (!validStatuses.includes(statusNum)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '无效的状态值'
      })
    }

    // 设置状态值
    data.status = statusNum

    // 处理时间
    if (!data.end_time || data.end_time === '' || data.end_time === 'null' || data.end_time === 'undefined') {
      data.end_time = null
      // 无时间时，状态自动改为3（永久封禁）
      data.status = 3
    } else {
      // 有时间时，转换ISO格式的日期时间字符串为MySQL兼容格式
      if (typeof data.end_time === 'string' && data.end_time.includes('T')) {
        const date = new Date(data.end_time)
        data.end_time = date.toISOString().slice(0, 19).replace('T', ' ')
      }
      // 有时间时，状态自动改为0（封禁中）
      data.status = 0
    }

    // 设置操作人ID
    data.operator = adminId

    // 创建新的封禁记录
    await db('user_ban').insert({
      user_id: String(data.user_id),
      reason: data.reason,
      end_time: data.end_time,
      status: data.status,
      operator: String(data.operator)
    })

    console.log(`用户 ${userId} 封禁记录已创建`)

    // 更新用户的is_active为0（限制登录）
    await updateUserActiveStatus(userId, false, adminId)

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '用户封禁成功'
    })
  } catch (error) {
    console.error('封禁用户失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '封禁用户失败'
    })
  }
})

// 解封用户的辅助函数
async function unbanUser(userId, operatorId) {
  try {
    const db = getDB();
    // 查找用户的活跃封禁记录
    const banResult = await db('user_ban')
      .where({ user_id: String(userId) })
      .whereIn('status', [0, 3])
      .select('id')

    if (banResult.length === 0) {
      throw new Error('该用户没有活跃的封禁记录')
    }

    // 更新所有活跃封禁记录为管理员解封
    const updatePromises = banResult.map(ban =>
      db('user_ban').where({ id: ban.id }).update({ status: 1, operator: String(operatorId) })
    )
    await Promise.all(updatePromises)

    console.log(`用户 ${userId} 的 ${banResult.length} 条封禁记录已被解封，操作人：${operatorId}`)

    // 恢复用户的is_active为1
    await updateUserActiveStatus(userId, true, operatorId)

    return {
      banCount: banResult.length
    }
  } catch (error) {
    console.error('解封用户失败:', error)
    throw error
  }
}

// 用户解封操作
router.post('/users/:id/unban', adminAuth, requirePermission('users:ban'), async (req, res) => {
  try {
    const userId = req.params.id
    const adminId = req.user?.id || 0

    console.log(`开始解封用户 ${userId}，操作人：${adminId}`)

    const db = getDB();

    // 检查用户是否存在
    const userResult = await db('users').where({ id: String(userId) }).select('id')
    if (userResult.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '用户不存在'
      })
    }

    // 执行解封操作
    await unbanUser(userId, adminId)

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '用户已成功解封'
    })
  } catch (error) {
    if (error.message === '该用户没有活跃的封禁记录') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: error.message
      })
    }
    console.error('解封用户失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '解封用户失败'
    })
  }
})

// ===== ADMINS CRUD (使用工厂模式) =====
const adminsCrudConfig = {
  table: 'admin',
  name: '管理员',
  requiredFields: ['username'],
  updateFields: ['nickname', 'is_super', 'permissions', 'logto_id'],
  uniqueFields: ['username'],
  searchFields: {
    username: { operator: 'LIKE' }
  },
  allowedSortFields: ['username', 'created_at'],
  defaultOrderBy: 'created_at DESC',

  // 创建前的验证 - 只有超级管理员才能创建
  beforeCreate: async (data, req) => {
    if (!req.user.isSuper) {
      return {
        isValid: false,
        message: '只有超级管理员才能创建管理员账户',
        code: RESPONSE_CODES.FORBIDDEN,
        statusCode: HTTP_STATUS.FORBIDDEN
      }
    }

    // 检查用户名是否已存在
    const db = getDB();
    const existing = await db('admin').where({ username: data.username }).select('id')
    if (existing.length > 0) {
      return {
        isValid: false,
        message: '该用户名已被使用',
        code: RESPONSE_CODES.CONFLICT,
        statusCode: HTTP_STATUS.CONFLICT
      }
    }

    return { isValid: true }
  },

  // 更新前的验证 - 权限检查
  beforeUpdate: async (data, id, req) => {
    const currentAdminId = req.user.id

    // 不允许修改自己的超级管理员状态
    if (String(id) === String(currentAdminId) && data.is_super !== undefined) {
      if (data.is_super === 0 || data.is_super === false) {
        return {
          isValid: false,
          message: '不能取消自己的超级管理员权限',
          code: RESPONSE_CODES.FORBIDDEN,
          statusCode: HTTP_STATUS.FORBIDDEN
        }
      }
    }

    // 只有超级管理员才能修改他人权限或设置超级管理员
    if (!req.user.isSuper && String(id) !== String(currentAdminId)) {
      return {
        isValid: false,
        message: '只有超级管理员才能修改其他管理员信息',
        code: RESPONSE_CODES.FORBIDDEN,
        statusCode: HTTP_STATUS.FORBIDDEN
      }
    }

    // 如果要设置为超级管理员，必须是超级管理员操作
    if (data.is_super === 1 || data.is_super === true) {
      if (!req.user.isSuper) {
        return {
          isValid: false,
          message: '只有超级管理员才能设置超级管理员权限',
          code: RESPONSE_CODES.FORBIDDEN,
          statusCode: HTTP_STATUS.FORBIDDEN
        }
      }
    }

    return { isValid: true }
  },

  // 删除前的验证 - 只有超级管理员才能删除
  beforeDelete: async (id, req) => {
    const currentAdminId = req.user.id

    // 不能删除自己
    if (String(id) === String(currentAdminId)) {
      return {
        isValid: false,
        message: '不能删除自己的账户',
        code: RESPONSE_CODES.FORBIDDEN,
        statusCode: HTTP_STATUS.FORBIDDEN
      }
    }

    // 只有超级管理员才能删除其他管理员
    if (!req.user.isSuper) {
      return {
        isValid: false,
        message: '只有超级管理员才能删除管理员账户',
        code: RESPONSE_CODES.FORBIDDEN,
        statusCode: HTTP_STATUS.FORBIDDEN
      }
    }

    return { isValid: true }
  }
}

const adminsHandlers = createCrudHandlers(adminsCrudConfig)

// 管理员CRUD路由
router.post('/admins', adminAuth, requirePermission('admins:create'), adminsHandlers.create)
router.put('/admins/:id', adminAuth, requirePermission('admins:edit'), adminsHandlers.update)
router.delete('/admins/:id', adminAuth, requirePermission('admins:delete'), adminsHandlers.deleteOne)
router.delete('/admins', adminAuth, requirePermission('admins:delete'), adminsHandlers.deleteMany)
router.get('/admins/:id', adminAuth, requirePermission('admins:view'), adminsHandlers.getOne)
router.get('/admins', adminAuth, requirePermission('admins:view'), adminsHandlers.getList)

// 监控页面API - 获取最近动态
router.get('/monitor/activities', adminAuth, requirePermission('monitor:view'), async (req, res) => {
  try {
    const activities = []
    const db = getDB();

    // 获取最近10个新注册用户
    const newUsers = await db('users')
      .select('id', 'user_id', 'nickname', 'avatar', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(10)

    // 获取最近10篇发布的笔记
    const newPosts = await db({ p: 'posts' })
      .leftJoin({ u: 'users' }, 'p.user_id', 'u.id')
      .where({ 'p.status': 0 })
      .select(
        'p.id', 'p.title', 'p.created_at',
        'u.user_id', 'u.nickname', 'u.avatar'
      )
      .orderByRaw('p.created_at DESC')
      .limit(10)

    // 获取最近10条评论
    const newComments = await db({ c: 'comments' })
      .leftJoin({ u: 'users' }, 'c.user_id', 'u.id')
      .leftJoin({ p: 'posts' }, 'c.post_id', 'p.id')
      .select(
        'c.id', 'c.content', 'c.post_id', 'c.created_at',
        'u.user_id', 'u.nickname', 'u.avatar',
        'p.title as post_title'
      )
      .orderByRaw('c.created_at DESC')
      .limit(10)

    // 合并所有动态
    newUsers.forEach(user => {
      activities.push({
        id: `user_${user.id}`,
        type: 'user_register',
        user_id: user.user_id,
        nickname: user.nickname,
        avatar: user.avatar,
        title: `新用户注册`,
        content: `用户 ${user.nickname} (${user.user_id}) 注册了账号`,
        target_id: user.id,
        created_at: user.created_at
      })
    })

    newPosts.forEach(post => {
      activities.push({
        id: `post_${post.id}`,
        type: 'post_publish',
        user_id: post.user_id,
        nickname: post.nickname,
        avatar: post.avatar,
        title: post.title,
        content: `${post.nickname} 发布了笔记《${post.title}》`,
        target_id: post.id,
        created_at: post.created_at
      })
    })

    newComments.forEach(comment => {
      activities.push({
        id: comment.id,
        type: 'comment_publish',
        user_id: comment.user_id,
        nickname: comment.nickname,
        avatar: comment.avatar,
        title: comment.post_title,
        content: comment.content, // 原始评论内容，用于CommentImage组件渲染
        description: `${comment.nickname} 在《${comment.post_title}》中发表了评论`,
        target_id: comment.post_id,
        created_at: comment.created_at
      })
    })

    // 按时间降序排序
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '获取动态成功',
      data: activities
    })
  } catch (error) {
    console.error('获取监控动态失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取动态失败',
      error: error.message
    })
  }
})

// 认证管理 CRUD 配置
const auditCrudConfig = {
  table: 'user_verification',
  name: '认证管理',
  requiredFields: ['user_id', 'type', 'real_name', 'id_card'],
  updateFields: ['type', 'status', 'real_name', 'id_card', 'contact_name', 'contact_phone', 'title', 'description'],
  searchFields: {
    user_id: { operator: '=' },
    type: { operator: '=' },
    status: { operator: '=' },
    user_display_id: { operator: '=' }
  },
  allowedSortFields: ['id', 'created_at', 'status'],
  defaultOrderBy: 'created_at DESC',

  // 创建后在audit表添加审核记录
  afterCreate: async (id, data, req) => {
    const { user_id, type } = data
    const db = getDB();
    await db('audit').insert({
      type: type.toString(),
      target_id: user_id.toString(),
      status: 0,
      created_at: db.fn.now()
    })
  },

  // 自定义查询，从user_verification表获取数据
  customQueries: {
    getList: async (req) => {
      const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'DESC', ...filters } = req.query
      const offset = (page - 1) * limit
      const db = getDB();

      // 构建基础查询
      let query = db({ uv: 'user_verification' })
        .leftJoin({ u: 'users' }, 'uv.user_id', 'u.id')
        .select(
          'uv.id', 'uv.user_id', 'uv.type', 'uv.status',
          'uv.real_name', 'uv.id_card', 'uv.contact_name',
          'uv.contact_phone', 'uv.title', 'uv.description',
          'uv.created_at',
          'u.user_id as user_display_id',
          'u.nickname', 'u.avatar'
        )

      // 处理筛选条件
      if (filters.user_id) {
        query = query.where({ 'uv.user_id': filters.user_id })
      }

      if (filters.user_display_id) {
        query = query.where('u.user_id', 'like', `%${filters.user_display_id}%`)
      }

      if (filters.type) {
        query = query.where({ 'uv.type': filters.type })
      }

      if (filters.status !== undefined && filters.status !== '') {
        query = query.where({ 'uv.status': parseInt(filters.status) })
      }

      // 构建排序
      const validSortFields = ['id', 'created_at', 'status']
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
      const order = sortOrder.toUpperCase() === 'ASC' ? 'asc' : 'desc'

      // 查询总数
      let countQuery = db({ uv: 'user_verification' }).leftJoin({ u: 'users' }, 'uv.user_id', 'u.id')

      if (filters.user_id) {
        countQuery = countQuery.where({ 'uv.user_id': filters.user_id })
      }
      if (filters.user_display_id) {
        countQuery = countQuery.where('u.user_id', 'like', `%${filters.user_display_id}%`)
      }
      if (filters.type) {
        countQuery = countQuery.where({ 'uv.type': filters.type })
      }
      if (filters.status !== undefined && filters.status !== '') {
        countQuery = countQuery.where({ 'uv.status': parseInt(filters.status) })
      }

      const [dataResult, countResult] = await Promise.all([
        query.orderByRaw(`uv.${sortField} ${order}`).limit(parseInt(limit)).offset(offset),
        countQuery.count('* as total').first()
      ])

      return {
        data: dataResult,
        total: parseInt(countResult.total),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    },

    getOne: async (req) => {
      const { id } = req.params
      const db = getDB();

      const result = await db({ uv: 'user_verification' })
        .leftJoin({ u: 'users' }, 'uv.user_id', 'u.id')
        .where({ 'uv.id': id })
        .select(
          'uv.id', 'uv.user_id', 'uv.type', 'uv.status',
          'uv.real_name', 'uv.id_card', 'uv.contact_name',
          'uv.contact_phone', 'uv.title', 'uv.description',
          'uv.created_at',
          'u.user_id as user_display_id',
          'u.nickname', 'u.avatar'
        )
        .first()

      return result || null
    }
  }
}

const auditHandlers = createCrudHandlers(auditCrudConfig)

// 认证管理路由
router.get('/audit', adminAuth, requirePermission('audit:view'), async (req, res) => {
  try {
    const result = await auditCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取认证列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取认证列表失败'
    })
  }
})
router.get('/audit/:id', adminAuth, requirePermission('audit:view'), async (req, res) => {
  try {
    const result = await auditCrudConfig.customQueries.getOne(req)
    if (!result) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '认证不存在'
      })
    }
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取认证详情失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取认证详情失败'
    })
  }
})
router.post('/audit', adminAuth, requirePermission('audit:create'), auditHandlers.create)
router.put('/audit/:id', adminAuth, requirePermission('audit:edit'), auditHandlers.update)
router.delete('/audit/:id', adminAuth, requirePermission('audit:delete'), auditHandlers.deleteOne)
router.delete('/audit', adminAuth, requirePermission('audit:delete'), auditHandlers.deleteMany)

// 认证审核操作
// 审核通过
router.put('/audit/:id/approve', adminAuth, requirePermission('audit:audit'), async (req, res) => {
  try {
    const { id } = req.params
    const adminId = req.user.id

    // 获取认证记录信息
    const db = getDB();
    const verificationResult = await db('user_verification').where({ id: id }).select('user_id', 'type')
    if (verificationResult.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.ERROR,
        message: '认证记录不存在'
      })
    }

    const { user_id, type } = verificationResult[0]

    // 使用 knex 事务 API（比 raw START TRANSACTION/COMMIT 更安全，自动处理连接和回滚）
    await db.transaction(async (trx) => {
      // 更新认证状态为通过 (1)
      await trx('user_verification').where({ id: id }).update({ status: 1 })

      // 根据认证类型更新用户的verified字段
      // type: 1-官方认证, 2-个人认证
      const verifiedValue = type === 1 ? 1 : (type === 2 ? 2 : 0)
      await trx('users').where({ id: String(user_id) }).update({ verified: verifiedValue })

      // 更新audit表中的审核记录
      await trx('audit')
        .where({ type: type, target_id: String(user_id), status: 0 })
        .update({
          status: 1,
          admin_id: adminId,
          audit_time: db.fn.now()
        })
    })

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '审核通过成功'
    })
  } catch (error) {
    console.error('审核通过失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '审核通过失败',
      error: error.message
    })
  }
})

// 拒绝申请
router.put('/audit/:id/reject', adminAuth, requirePermission('audit:audit'), async (req, res) => {
  try {
    const { id } = req.params
    const adminId = req.user.id

    // 获取认证记录信息
    const db = getDB();
    const verificationResult = await db('user_verification').where({ id: id }).select('user_id', 'type')
    if (verificationResult.length === 0) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.ERROR,
        message: '认证记录不存在'
      })
    }

    const { user_id, type } = verificationResult[0]

    // 使用 knex 事务 API（比 raw START TRANSACTION/COMMIT 更安全，自动处理连接和回滚）
    await db.transaction(async (trx) => {
      // 更新认证状态为拒绝 (2)
      await trx('user_verification').where({ id: id }).update({ status: 2 })

      // 拒绝认证申请时，将用户的verified字段设置为0（未认证）
      await trx('users').where({ id: String(user_id) }).update({ verified: 0 })

      // 更新audit表中的审核记录
      await trx('audit')
        .where({ type: type, target_id: String(user_id), status: 0 })
        .update({
          status: 2,
          admin_id: adminId,
          audit_time: db.fn.now()
        })
    })

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '拒绝申请成功'
    })
  } catch (error) {
    console.error('拒绝申请失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '拒绝申请失败',
      error: error.message
    })
  }
})

// Categories CRUD 配置
const categoriesCrudConfig = {
  table: 'categories',
  name: '分类',
  requiredFields: ['name', 'category_title'],
  updateFields: ['name', 'category_title'],
  uniqueFields: ['name', 'category_title'],
  cascadeRules: [
    { table: 'posts', field: 'category_id' }
  ],
  searchFields: {
    name: { operator: 'LIKE' },
    category_title: { operator: 'LIKE' }
  },
  allowedSortFields: ['id', 'name', 'created_at'],
  defaultOrderBy: 'id ASC',

  // 创建前的自定义验证
  beforeCreate: async (data) => {
    const { name, category_title } = data

    if (!name || name.trim() === '') {
      return { isValid: false, message: '分类名称不能为空' }
    }

    if (!category_title || category_title.trim() === '') {
      return { isValid: false, message: '分类英文标题不能为空' }
    }

    // 检查分类名称是否已存在
    const db = getDB();
    const existingName = await db('categories').where({ name: name.trim() }).select('id')

    if (existingName.length > 0) {
      return { isValid: false, message: '分类名称已存在' }
    }

    // 检查分类英文标题是否已存在
    const existingTitle = await db('categories').where({ category_title: category_title.trim() }).select('id')

    if (existingTitle.length > 0) {
      return { isValid: false, message: '分类英文标题已存在' }
    }

    // 清理数据
    data.name = name.trim()
    data.category_title = category_title.trim()

    return { isValid: true }
  },

  // 更新前的自定义验证
  beforeUpdate: async (data, id, req) => {
    const { name, category_title } = data

    if (name && name.trim() === '') {
      return { isValid: false, message: '分类名称不能为空' }
    }

    if (category_title && category_title.trim() === '') {
      return { isValid: false, message: '分类英文标题不能为空' }
    }

    if (name) {
      // 检查分类名称是否已存在（排除当前记录）
      const db = getDB();
      const existingName = await db('categories').where({ name: name.trim() }).whereNot({ id: id }).select('id')

      if (existingName.length > 0) {
        return { isValid: false, message: '分类名称已存在' }
      }

      data.name = name.trim()
    }

    if (category_title) {
      // 检查分类英文标题是否已存在（排除当前记录）
      const existingTitle = await db('categories').where({ category_title: category_title.trim() }).whereNot({ id: id }).select('id')

      if (existingTitle.length > 0) {
        return { isValid: false, message: '分类英文标题已存在' }
      }

      data.category_title = category_title.trim()
    }

    return { isValid: true }
  },

  // 删除前检查
  beforeDelete: async (id) => {
    // 检查是否有笔记使用此分类
    const db = getDB();
    const posts = await db('posts').where({ category_id: id }).count('* as count')
    const count = typeof posts === 'object' && posts[0] ? posts[0].count : posts

    if (parseInt(count) > 0) {
      return { isValid: false, message: `该分类下还有 ${count} 篇笔记，无法删除` }
    }

    return { isValid: true }
  },

  // 批量删除前检查
  beforeDeleteMany: async (ids) => {
    const db = getDB();
    const posts = await db('posts').whereIn('category_id', ids).select('category_id', db.raw('COUNT(*) as count')).groupBy('category_id')

    if (posts.length > 0) {
      const categoryIds = posts.map(p => p.category_id).join(', ')
      return { isValid: false, message: `分类 ${categoryIds} 下还有笔记，无法删除` }
    }

    return { isValid: true }
  },

  customQueries: {
    create: async (req) => {
      const { name, category_title } = req.body;

      if (!name || name.trim() === '') {
        throw new Error('分类名称不能为空');
      }

      if (!category_title || category_title.trim() === '') {
        throw new Error('分类英文标题不能为空');
      }

      // 检查分类名称是否已存在
      const db = getDB();
      const existingName = await db('categories').where({ name: name.trim() }).select('id');

      if (existingName.length > 0) {
        throw new Error('分类名称已存在');
      }

      // 检查分类英文标题是否已存在
      const existingTitle = await db('categories')
        .where({ category_title: category_title.trim() })
        .select('id');

      if (existingTitle.length > 0) {
        throw new Error('分类英文标题已存在');
      }

      // 创建分类
      // 使用 .returning('*') 获取插入的完整行（PostgreSQL兼容）
      const insertedRows = await db('categories').insert({
        name: name.trim(),
        category_title: category_title.trim()
      }).returning('*');

      const result = Array.isArray(insertedRows) && insertedRows.length > 0 ? insertedRows[0] : null;

      return {
        id: result?.id,
        name: name.trim(),
        category_title: category_title.trim()
      };
    },

    getList: async (req) => {
      const { page = 1, limit = 10, sortField = 'id', sortOrder = 'asc', name, category_title } = req.query
      const offset = (parseInt(page) - 1) * parseInt(limit)
      const db = getDB();

      // 构建基础查询
      let query = db({ c: 'categories' })
        .leftJoin({ p: 'posts' }, 'c.id', 'p.category_id')
        .select(
          'c.id', 'c.name', 'c.category_title', 'c.created_at',
          db.raw('COUNT(p.id) as post_count')
        )
        .groupBy('c.id', 'c.name', 'c.category_title', 'c.created_at')

      // 处理筛选条件
      if (name && typeof name === 'string' && name.trim()) {
        query = query.where('c.name', 'like', `%${name.trim()}%`)
      }

      if (category_title && typeof category_title === 'string' && category_title.trim()) {
        query = query.where('c.category_title', 'like', `%${category_title.trim()}%`)
      }

      // 使用对象映射验证排序字段
      const allowedSortFields = {
        'id': 'c.id',
        'name': 'c.name',
        'category_title': 'c.category_title',
        'created_at': 'c.created_at',
        'post_count': 'post_count'
      }
      const allowedSortOrders = { 'asc': 'asc', 'desc': 'desc' }

      const validSortField = allowedSortFields[sortField] || allowedSortFields['id']
      const validSortOrder = allowedSortOrders[sortOrder?.toLowerCase()] || allowedSortOrders['asc']

      // 获取总数
      let countQuery = db({ c: 'categories' })

      if (name && typeof name === 'string' && name.trim()) {
        countQuery = countQuery.where('c.name', 'like', `%${name.trim()}%`)
      }
      if (category_title && typeof category_title === 'string' && category_title.trim()) {
        countQuery = countQuery.where('c.category_title', 'like', `%${category_title.trim()}%`)
      }

      const [countResult, categories] = await Promise.all([
        countQuery.count('* as total').first(),
        query.orderByRaw(`${validSortField} ${validSortOrder}`).limit(parseInt(limit)).offset(offset)
      ])

      return {
        data: categories,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.total),
          totalPages: Math.ceil(parseInt(countResult.total) / parseInt(limit))
        }
      }
    }
  }
}

const categoriesHandlers = createCrudHandlers(categoriesCrudConfig)

// Categories 路由
// 分类管理路由
router.get('/categories', adminAuth, requirePermission('categories:view'), async (req, res) => {
  try {
    const result = await categoriesCrudConfig.customQueries.getList(req)
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: result
    })
  } catch (error) {
    console.error('获取分类列表失败:', error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取分类列表失败'
    })
  }
})
router.get('/categories/:id', adminAuth, requirePermission('categories:view'), categoriesHandlers.getOne)
router.post('/categories', adminAuth, requirePermission('categories:create'), categoriesHandlers.create)
router.put('/categories/:id', adminAuth, requirePermission('categories:edit'), categoriesHandlers.update)
router.delete('/categories/:id', adminAuth, requirePermission('categories:delete'), categoriesHandlers.deleteOne)
router.delete('/categories', adminAuth, requirePermission('categories:delete'), categoriesHandlers.deleteMany)

module.exports = router
