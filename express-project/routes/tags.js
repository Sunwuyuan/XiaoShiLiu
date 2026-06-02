const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES, ERROR_MESSAGES } = require('../constants');
const { getDB } = require('../utils/db');

// 获取所有标签
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const rows = await db('tags')
      .select('*')
      .orderBy('name', 'asc');

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: rows
    });
  } catch (error) {
    console.error('获取标签列表失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// 获取热门标签
router.get('/hot', async (req, res) => {
  try {
    const db = getDB();
    const limit = parseInt(req.query.limit) || 10;
    
    const rows = await db('tags')
      .select('*')
      .where('use_count', '>', 0)
      .orderBy('use_count', 'desc')
      .orderBy('name', 'asc')
      .limit(limit);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: 'success',
      data: rows
    });
  } catch (error) {
    console.error('获取热门标签失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ code: RESPONSE_CODES.ERROR, message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

module.exports = router;
