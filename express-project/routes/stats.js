const express = require('express');
const router = express.Router();
const { success, error } = require('../utils/responseHelper');
const { getMultipleTableStats } = require('../utils/statsHelper');
const { getCache, setCache } = require('../utils/redis');
const { authenticateToken } = require('../middleware/auth');

const CACHE_KEY = 'stats:summary';
const CACHE_TTL = 600; // 10分钟

// 获取系统统计信息（需要登录）
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 尝试从缓存获取
    const cached = await getCache(CACHE_KEY);
    if (cached) {
      return success(res, cached, '获取统计信息成功（缓存）');
    }

    // 定义需要统计的表（只统计有效数据）
    const tables = [
      { table: 'users', alias: 'users', where: { is_active: true } },
      { table: 'posts', alias: 'posts', where: { status: 0 } },
      { table: 'comments', alias: 'comments' },
      { table: 'likes', alias: 'likes' }
    ];

    const stats = await getMultipleTableStats(tables);

    // 写入缓存
    await setCache(CACHE_KEY, stats, CACHE_TTL);

    success(res, stats, '获取统计信息成功');
  } catch (err) {
    console.error('获取统计信息失败:', err);
    error(res, '获取统计信息失败');
  }
});

module.exports = router;
