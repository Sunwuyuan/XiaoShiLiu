const express = require('express');
const router = express.Router();
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/responseHelper');

/**
 * @api {get} /api/categories 获取分类列表
 * @apiName GetCategories
 * @apiGroup Categories
 * @apiDescription 获取所有分类列表
 * 
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} message 响应消息
 * @apiSuccess {Array} data 分类列表
 * @apiSuccess {Number} data.id 分类ID
 * @apiSuccess {String} data.name 分类名称
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "code": 200,
 *       "message": "获取成功",
 *       "data": [
 *         {
 *           "id": 1,
 *           "name": "推荐"
 *         },
 *         {
 *           "id": 2,
 *           "name": "学习"
 *         }
 *       ]
 *     }
 */
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const { sortField = 'id', sortOrder = 'asc', name, category_title } = req.query;

    const allowedSortFields = {
      'id': 'c.id',
      'name': 'c.name',
      'created_at': 'c.created_at',
      'post_count': 'post_count'
    };
    const allowedSortOrders = {
      'asc': 'asc',
      'desc': 'desc'
    };
    const validSortField = allowedSortFields[sortField] || allowedSortFields['id'];
    const validSortOrder = allowedSortOrders[sortOrder?.toLowerCase()] || allowedSortOrders['asc'];

    // 构建查询
    let query = db({ c: 'categories' })
      .leftJoin({ p: 'posts' }, 'c.id', 'p.category_id')
      .select(
        'c.id',
        'c.name',
        'c.category_title',
        'c.created_at'
      )
      .count('p.id as post_count')
      .groupBy('c.id', 'c.name', 'c.category_title', 'c.created_at')
      .orderByRaw(`${validSortField} ${validSortOrder}`);

    if (name && typeof name === 'string' && name.trim()) {
      query.where('c.name', 'like', `%${name.trim()}%`);
    }

    if (category_title && typeof category_title === 'string' && category_title.trim()) {
      query.where('c.category_title', 'like', `%${category_title.trim()}%`);
    }

    const categories = await query;

    success(res, categories, '获取成功');
  } catch (err) {
    console.error('获取分类列表失败:', err);
    error(res, '获取分类列表失败');
  }
});
module.exports = router;
