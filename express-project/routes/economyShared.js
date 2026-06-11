/**
 * 经济系统共享模块
 * 导出 economy.js 和 achievements.js 共用的常量、函数
 */

const { HTTP_STATUS, RESPONSE_CODES } = require('../constants');
const { authenticateToken } = require('../middleware/auth');
const { getDB } = require('../utils/db');

// ========== 等级配置 ==========
const LEVEL_CONFIG = [
  { level: 1, title: 'Esc', exp: 0 },
  { level: 2, title: 'F1', exp: 50 },
  { level: 3, title: 'F2', exp: 150 },
  { level: 4, title: 'Tab', exp: 300 },
  { level: 5, title: 'Tab', exp: 500 },
  { level: 6, title: 'Tab', exp: 800 },
  { level: 7, title: 'Shift', exp: 1500 },
  { level: 8, title: 'Shift', exp: 2200 },
  { level: 9, title: 'Shift', exp: 3000 },
  { level: 10, title: 'Shift', exp: 4000 },
  { level: 11, title: 'Ctrl', exp: 7000 },
  { level: 12, title: 'Ctrl', exp: 9000 },
  { level: 13, title: 'Ctrl', exp: 12000 },
  { level: 14, title: 'Ctrl', exp: 15000 },
  { level: 15, title: 'Ctrl', exp: 20000 },
  { level: 16, title: 'Alt', exp: 35000 },
  { level: 17, title: 'Alt', exp: 45000 },
  { level: 18, title: 'Alt', exp: 60000 },
  { level: 19, title: 'Alt', exp: 80000 },
  { level: 20, title: 'Space', exp: 150000 },
];

// ========== 成就定义 ==========
const ACHIEVEMENT_DEFINITIONS = {
  first_post:     { name: '初出茅庐',     description: '发布你的第一篇笔记',       icon: 'post' },
  first_comment:  { name: '开口说话',     description: '发表你的第一条评论',       icon: 'comment' },
  level_5:        { name: '崭露头角',     description: '达到等级 5',              icon: 'level' },
  level_10:       { name: '小有成就',     description: '达到等级 10',             icon: 'level' },
  level_20:       { name: '登峰造极',     description: '达到等级 20',             icon: 'level' },
  collector_10:   { name: '初级收藏家',   description: '背包中拥有 10 件道具',     icon: 'bag' },
  collector_50:   { name: '资深收藏家',   description: '背包中拥有 50 件道具',     icon: 'bag' },
  shop_first_buy: { name: '初次购物',     description: '在商店购买第一件道具',     icon: 'shop' },
  like_50:        { name: '人气萌芽',     description: '累计获得 50 个点赞',       icon: 'like' },
  like_500:       { name: '人气爆棚',     description: '累计获得 500 个点赞',      icon: 'like' },
  fans_10:        { name: '初具魅力',     description: '累计获得 10 个粉丝',       icon: 'fans' },
  fans_100:       { name: '魅力无限',     description: '累计获得 100 个粉丝',      icon: 'fans' },
  post_10:        { name: '勤奋作者',     description: '累计发布 10 篇笔记',       icon: 'post' },
  post_100:       { name: '高产作家',     description: '累计发布 100 篇笔记',      icon: 'post' },
  comment_50:     { name: '评论达人',     description: '累计发表 50 条评论',      icon: 'comment' },
  login_30:       { name: '坚持打卡',     description: '连续登录 30 天',          icon: 'calendar' },
};

// ========== 成就奖励配置 ==========
const ACHIEVEMENT_REWARDS = {
  first_post: { pi: 20, alpha: 0, exp: 50 },
  first_comment: { pi: 10, alpha: 0, exp: 30 },
  level_5: { pi: 100, alpha: 5, exp: 0 },
  level_10: { pi: 500, alpha: 20, exp: 0 },
  level_20: { pi: 2000, alpha: 100, exp: 0 },
  collector_10: { pi: 50, alpha: 0, exp: 100 },
  collector_50: { pi: 200, alpha: 10, exp: 300 },
  shop_first_buy: { pi: 0, alpha: 0, exp: 50 },
  like_50: { pi: 30, alpha: 0, exp: 50 },
  like_500: { pi: 200, alpha: 10, exp: 200 },
  fans_10: { pi: 30, alpha: 0, exp: 50 },
  fans_100: { pi: 300, alpha: 15, exp: 300 },
  post_10: { pi: 50, alpha: 0, exp: 100 },
  post_100: { pi: 500, alpha: 20, exp: 500 },
  comment_50: { pi: 100, alpha: 5, exp: 150 },
  login_30: { pi: 200, alpha: 10, exp: 200 },
};

// ========== 共享函数 ==========

function getUserId(req) {
  return req.user.user_id || req.user.userId || req.user.id;
}

function calcLevel(exp) {
  let current = LEVEL_CONFIG[0];
  let next = LEVEL_CONFIG[1] || null;
  for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_CONFIG[i].exp) {
      current = LEVEL_CONFIG[i];
      next = LEVEL_CONFIG[i + 1] || null;
      break;
    }
  }
  return {
    level: current.level,
    title: current.title,
    currentLevelExp: current.exp,
    nextLevelExp: next ? next.exp : null,
    expToNext: next ? next.exp - exp : null,
  };
}

async function ensureEconomyRecord(db, userId) {
  const existing = await db('user_economy').where({ user_id: userId }).first();
  if (!existing) {
    await db('user_economy').insert({ user_id: userId });
  }
}

async function ensureLevelRecord(db, userId) {
  const existing = await db('user_levels').where({ user_id: userId }).first();
  if (!existing) {
    await db('user_levels').insert({ user_id: userId });
  }
}

async function addCurrency(db, userId, currency, amount, action, description) {
  const field = currency === 'pi' ? 'pi_keys' : 'alpha_keys';
  const totalField = currency === 'pi' ? 'total_pi_earned' : 'total_alpha_earned';
  await db('user_economy')
    .where({ user_id: userId })
    .increment(field, amount)
    .increment(totalField, amount);
  await db('transactions').insert({
    user_id: userId,
    currency,
    amount,
    type: 'earn',
    action: action || null,
    description: description || null,
  });
}

async function addExp(db, userId, expGained, action) {
  await db('user_levels')
    .where({ user_id: userId })
    .increment('exp', expGained)
    .increment('total_exp', expGained);
  await db('exp_records').insert({
    user_id: userId,
    action: action || null,
    exp_gained: expGained,
  });
  const record = await db('user_levels')
    .where({ user_id: userId })
    .first();
  const levelInfo = calcLevel(record.exp);
  if (levelInfo.level !== record.level) {
    await db('user_levels')
      .where({ user_id: userId })
      .update({ level: levelInfo.level, title: levelInfo.title });
  }
  return { ...levelInfo, leveledUp: levelInfo.level !== record.level };
}

/**
 * 计算连续登录天数
 */
async function calcLoginStreak(db, userId) {
  try {
    const user = await db('users')
      .where({ user_id: userId })
      .select('last_login_at', 'created_at')
      .first();
    if (!user || !user.last_login_at) return 0;
    const lastLogin = new Date(user.last_login_at);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastLoginDay = new Date(lastLogin);
    lastLoginDay.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - lastLoginDay) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) return 0;
    return 1;
  } catch (err) {
    console.error('[EconomyShared] 计算登录连续天数失败:', err.message);
    return 0;
  }
}

/**
 * 检查并解锁成就
 */
async function checkAndUnlockAchievements(db, userId) {
  const [userStats, levelInfo] = await Promise.all([
    db('users').where({ user_id: userId }).select('id', 'like_count', 'follow_count as fans_count').first(),
    db('user_levels').where({ user_id: userId }).select('level', 'exp').first()
  ]);
  if (!userStats) return [];

  const [postCount, commentCount, inventoryCount] = await Promise.all([
    db('posts').where({ user_id: userStats.id, status: 0 }).count('* as count').first(),
    db('comments').where({ user_id: userStats.id }).count('* as count').first(),
    db('user_inventory').where({ user_id: userId }).count('* as count').first()
  ]);

  const existing = await db('user_achievements').where({ user_id: userId }).select('achievement_id');
  const existingSet = new Set(existing.map(a => a.achievement_id));
  const newAchievements = [];

  const checks = {
    first_post: postCount.count >= 1,
    first_comment: commentCount.count >= 1,
    level_5: levelInfo && levelInfo.level >= 5,
    level_10: levelInfo && levelInfo.level >= 10,
    level_20: levelInfo && levelInfo.level >= 20,
    collector_10: inventoryCount.count >= 10,
    collector_50: inventoryCount.count >= 50,
    like_50: userStats.like_count >= 50,
    like_500: userStats.like_count >= 500,
    fans_10: userStats.fans_count >= 10,
    fans_100: userStats.fans_count >= 100,
    post_10: postCount.count >= 10,
    post_100: postCount.count >= 100,
    comment_50: commentCount.count >= 50,
  };

  for (const [achievementId, condition] of Object.entries(checks)) {
    if (condition && !existingSet.has(achievementId)) {
      await db('user_achievements').insert({
        user_id: userId,
        achievement_id: achievementId,
        completed_at: db.fn.now(),
        claimed: false
      });
      newAchievements.push(achievementId);
    }
  }

  return newAchievements;
}

module.exports = {
  HTTP_STATUS,
  RESPONSE_CODES,
  authenticateToken,
  getUserId,
  getDB,
  ensureEconomyRecord,
  ensureLevelRecord,
  addCurrency,
  addExp,
  calcLevel,
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_REWARDS,
  calcLoginStreak,
  checkAndUnlockAchievements,
};
