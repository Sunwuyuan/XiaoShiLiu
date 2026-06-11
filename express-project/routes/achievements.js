/**
 * 悦社社区 - 成就系统 API 路由
 * 提供成就列表、领取成就奖励等接口
 */

const express = require('express');
const router = express.Router();

// 导入共享的常量和工具函数
const {
  RESPONSE_CODES,
  HTTP_STATUS,
  authenticateToken,
  getUserId,
  getDB,
  ensureEconomyRecord,
  ensureLevelRecord,
  addCurrency,
  addExp,
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_REWARDS,
  calcLoginStreak,
  checkAndUnlockAchievements,
} = require('./economyShared');

// GET /api/achievements/list - 获取成就列表
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    // 获取用户统计信息（用于计算进度）
    const userStats = await db('users')
      .where({ user_id: userId })
      .select('id', 'like_count', 'follow_count as fans_count')
      .first();

    const [postCount, commentCount, inventoryCount, levelInfo] = await Promise.all([
      userStats ? db('posts').where({ user_id: userStats.id, status: 0 }).count('* as count').first() : { count: 0 },
      userStats ? db('comments').where({ user_id: userStats.id }).count('* as count').first() : { count: 0 },
      db('user_inventory').where({ user_id: userId }).count('* as count').first(),
      db('user_levels').where({ user_id: userId }).select('level').first(),
    ]);

    // 计算连续登录天数
    const loginStreak = await calcLoginStreak(db, userId);

    // 进度映射表
    const progressMap = {
      first_post:     { progress: postCount.count, target: 1 },
      first_comment:  { progress: commentCount.count, target: 1 },
      level_5:        { progress: levelInfo ? levelInfo.level : 0, target: 5 },
      level_10:       { progress: levelInfo ? levelInfo.level : 0, target: 10 },
      level_20:       { progress: levelInfo ? levelInfo.level : 0, target: 20 },
      collector_10:   { progress: inventoryCount.count, target: 10 },
      collector_50:   { progress: inventoryCount.count, target: 50 },
      shop_first_buy: { progress: 0, target: 1 },
      like_50:        { progress: userStats ? userStats.like_count : 0, target: 50 },
      like_500:       { progress: userStats ? userStats.like_count : 0, target: 500 },
      fans_10:        { progress: userStats ? userStats.fans_count : 0, target: 10 },
      fans_100:       { progress: userStats ? userStats.fans_count : 0, target: 100 },
      post_10:        { progress: postCount.count, target: 10 },
      post_100:       { progress: postCount.count, target: 100 },
      comment_50:     { progress: commentCount.count, target: 50 },
      login_30:       { progress: loginStreak, target: 30 },
    };

    // shop_first_buy 特殊处理
    const hasPurchase = await db('transactions')
      .where({ user_id: userId, type: 'purchase' })
      .first();
    if (hasPurchase) {
      progressMap.shop_first_buy.progress = 1;
    }

    // 获取用户已完成的成就
    const completed = await db('user_achievements')
      .where({ user_id: userId })
      .select('achievement_id', 'completed_at', 'claimed');

    const completedMap = {};
    completed.forEach(a => {
      completedMap[a.achievement_id] = {
        completed: true,
        completed_at: a.completed_at,
        claimed: a.claimed,
      };
    });

    // 返回所有成就定义，合并用户完成状态和进度
    const allAchievements = Object.entries(ACHIEVEMENT_DEFINITIONS).map(([id, def]) => {
      const rewards = ACHIEVEMENT_REWARDS[id] || { pi: 0, alpha: 0, exp: 0 };
      const userProgress = completedMap[id] || {};
      const prog = progressMap[id] || { progress: 0, target: 1 };
      return {
        achievement_id: id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        reward_pi: rewards.pi,
        reward_alpha: rewards.alpha,
        reward_exp: rewards.exp,
        completed: !!userProgress.completed,
        completed_at: userProgress.completed_at || null,
        claimed: !!userProgress.claimed,
        progress: prog.progress,
        target: prog.target,
      };
    });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: allAchievements,
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Achievements] 获取成就列表失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// POST /api/achievements/claim - 领取成就奖励
router.post('/claim', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();
    const { achievement_id } = req.body;

    if (!achievement_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '缺少 achievement_id 参数',
      });
    }

    // 查询成就记录
    const achievement = await db('user_achievements')
      .where({ user_id: userId, achievement_id })
      .first();

    if (!achievement) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '成就不存在',
      });
    }

    if (achievement.claimed) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '奖励已领取',
      });
    }

    const rewards = ACHIEVEMENT_REWARDS[achievement_id] || { pi: 0, alpha: 0, exp: 0 };

    await ensureEconomyRecord(db, userId);
    await ensureLevelRecord(db, userId);

    // 发放奖励
    if (rewards.pi > 0) {
      await addCurrency(db, userId, 'pi', rewards.pi, 'achievement_claim', `领取成就奖励: ${achievement_id}`);
    }
    if (rewards.alpha > 0) {
      await addCurrency(db, userId, 'alpha', rewards.alpha, 'achievement_claim', `领取成就奖励: ${achievement_id}`);
    }
    if (rewards.exp > 0) {
      await addExp(db, userId, rewards.exp, 'achievement_claim');
    }

    // 标记为已领取
    await db('user_achievements')
      .where({ id: achievement.id })
      .update({ claimed: true });

    console.log(`[Achievements] 用户 ${userId} 领取成就奖励: ${achievement_id}`);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: {
        achievement_id,
        rewards,
      },
      message: '奖励领取成功',
    });
  } catch (error) {
    console.error('[Achievements] 领取成就奖励失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

module.exports = router;
module.exports.checkAndUnlockAchievements = checkAndUnlockAchievements;
