/**
 * 悦社社区 - 经济系统 API 路由
 * 提供货币、等级、背包、商店、任务等经济系统接口
 *
 * @author zhaishis
 * @version v1.0.0
 */

const express = require('express');
const router = express.Router();
const {
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
} = require('./economyShared');

// ========== 任务奖励配置 ==========
const TASK_REWARDS = {
  daily: { pi: 10, alpha: 0, exp: 20 },
  weekly: { pi: 50, alpha: 0, exp: 100 },
  main: { pi: 100, alpha: 10, exp: 200 },
};

// ========== 任务定义 ==========
const TASK_DEFINITIONS = {
  // 每日任务
  daily_login:    { name: '每日登录',     description: '每天登录悦社（签到）',       task_type: 'daily',  target: 1 },
  daily_like:     { name: '每日点赞',     description: '每天点赞 3 篇内容',       task_type: 'daily',  target: 3 },
  daily_comment:  { name: '每日评论',     description: '每天发表 1 条评论',       task_type: 'daily',  target: 1 },
  daily_share:    { name: '每日分享',     description: '每天分享 1 篇内容',       task_type: 'daily',  target: 1 },
  daily_browse:   { name: '每日浏览',     description: '每天浏览 10 篇内容',      task_type: 'daily',  target: 10 },
  // 每周任务
  weekly_post:    { name: '每周发布',     description: '每周发布 2 篇笔记',       task_type: 'weekly', target: 2 },
  weekly_comment5: { name: '评论达人',     description: '每周发表 5 条评论',       task_type: 'weekly', target: 5 },
  weekly_like10:  { name: '点赞达人',     description: '每周点赞 10 篇内容',      task_type: 'weekly', target: 10 },
  weekly_login5:  { name: '活跃用户',     description: '每周登录 5 天',           task_type: 'weekly', target: 5 },
  // 主线任务
  main_first_post:   { name: '初来乍到',   description: '发布你的第一篇笔记',      task_type: 'main', target: 1 },
  main_post5:        { name: '小有名气',   description: '累计发布 5 篇笔记',       task_type: 'main', target: 5 },
  main_post20:       { name: '笔耕不辍',   description: '累计发布 20 篇笔记',      task_type: 'main', target: 20 },
  main_post50:       { name: '创作先锋',   description: '累计发布 50 篇笔记',      task_type: 'main', target: 50 },
  main_comment10:    { name: '社交蝴蝶',   description: '累计发表 10 条评论',      task_type: 'main', target: 10 },
  main_like100:      { name: '人气之星',   description: '累计获得 100 个点赞',     task_type: 'main', target: 100 },
  main_fans50:       { name: '魅力四射',   description: '累计获得 50 个粉丝',      task_type: 'main', target: 50 },
  main_level5:       { name: '成长之路',   description: '达到等级 5',              task_type: 'main', target: 1 },
  main_level10:      { name: '进阶之路',   description: '达到等级 10',             task_type: 'main', target: 1 },
};

/**
 * 确保用户在 user_equipped 表中有记录，没有则自动创建
 */
async function ensureEquippedRecord(db, userId) {
  const existing = await db('user_equipped').where({ user_id: userId }).first();
  if (!existing) {
    await db('user_equipped').insert({ user_id: userId });
  }
  return;
}

/**
 * 扣减用户货币并记录交易（会检查余额）
 * @returns {boolean} 是否扣减成功
 */
async function spendCurrency(db, userId, currency, amount, action, description) {
  const field = currency === 'pi' ? 'pi_keys' : 'alpha_keys';

  const record = await db('user_economy')
    .where({ user_id: userId })
    .select(field)
    .first();

  if (!record || record[field] < amount) {
    return false;
  }

  await db('user_economy')
    .where({ user_id: userId })
    .decrement(field, amount);

  await db('transactions').insert({
    user_id: userId,
    currency,
    amount,
    type: 'spend',
    action: action || null,
    description: description || null,
  });

  return true;
}

// ========== 经济信息接口 ==========

// GET /api/economy - 获取用户经济信息
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    await ensureEconomyRecord(db, userId);

    const economy = await db('user_economy')
      .where({ user_id: userId })
      .first();

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: {
        pi_keys: economy.pi_keys,
        alpha_keys: economy.alpha_keys,
        total_pi_earned: economy.total_pi_earned,
        total_alpha_earned: economy.total_alpha_earned,
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Economy] 获取经济信息失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// GET /api/economy/level - 获取用户等级信息
router.get('/level', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    await ensureLevelRecord(db, userId);

    const levelRecord = await db('user_levels')
      .where({ user_id: userId })
      .first();

    const levelInfo = calcLevel(levelRecord.exp);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: {
        level: levelInfo.level,
        title: levelInfo.title,
        exp: levelRecord.exp,
        total_exp: levelRecord.total_exp,
        current_level_exp: levelInfo.currentLevelExp,
        next_level_exp: levelInfo.nextLevelExp,
        exp_to_next: levelInfo.expToNext,
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Economy] 获取等级信息失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

/**
 * 获取用户装备摘要（内部复用）
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 装备摘要
 */
async function getUserEquippedSummary(userId) {
  const db = getDB();

  const equipped = await db('user_equipped')
    .where({ user_id: userId })
    .first();

  if (!equipped) {
    return {
      frame_id: null,
      accessory_id: null,
      name_style: null,
      card_bg_id: null,
      chat_bubble_id: null,
      cursor_id: null,
      enter_effect_id: null,
      loading_screen_id: null,
    };
  }

  const resultData = {
    frame_id: equipped.frame_id,
    accessory_id: equipped.accessory_id,
    name_style: equipped.name_style,
    card_bg_id: equipped.card_bg_id,
    chat_bubble_id: equipped.chat_bubble_id,
    cursor_id: equipped.cursor_id,
    enter_effect_id: equipped.enter_effect_id,
    loading_screen_id: equipped.loading_screen_id,
  };

  // 查询各装备的 style_config
  if (equipped.frame_id) {
    const frameItem = await db('user_inventory')
      .where({ user_id: userId, item_id: equipped.frame_id })
      .first();
    if (frameItem) {
      resultData.frame_config = typeof frameItem.style_config === 'string'
        ? JSON.parse(frameItem.style_config) : frameItem.style_config;
    }
  }

  if (equipped.accessory_id) {
    const accItem = await db('user_inventory')
      .where({ user_id: userId, item_id: equipped.accessory_id })
      .first();
    if (accItem) {
      resultData.accessory_config = typeof accItem.style_config === 'string'
        ? JSON.parse(accItem.style_config) : accItem.style_config;
    }
  }

  if (equipped.name_style) {
    const nameItem = await db('user_inventory')
      .where({ user_id: userId, item_id: equipped.name_style })
      .first();
    if (nameItem) {
      resultData.name_style_config = typeof nameItem.style_config === 'string'
        ? JSON.parse(nameItem.style_config) : nameItem.style_config;
    }
  }

  return resultData;
}

// GET /api/economy/equipped - 获取当前用户已装备的道具
router.get('/equipped', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    await ensureEquippedRecord(db, userId);
    const resultData = await getUserEquippedSummary(userId);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: resultData,
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Economy] 获取装备信息失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// GET /api/economy/equipped/:userId - 获取指定用户的装备摘要（公开接口）
router.get('/equipped/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '缺少 userId 参数',
      });
    }

    const resultData = await getUserEquippedSummary(userId);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: resultData,
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Economy] 获取用户装备信息失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// GET /api/economy/inventory - 获取背包
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    const query = db('user_inventory').where({ user_id: userId });

    // 支持 ?type= 过滤
    const itemType = req.query.type;
    if (itemType) {
      query.where({ item_type: itemType });
    }

    const inventory = await query
      .select('id', 'item_id', 'item_type', 'name', 'rarity', 'style_config', 'acquired_at', 'equipped')
      .orderBy('acquired_at', 'desc');

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: inventory,
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Economy] 获取背包失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// GET /api/economy/transactions - 获取交易记录（分页）
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [totalResult] = await db('transactions')
      .where({ user_id: userId })
      .count('* as total');
    const total = parseInt(totalResult.total);

    const transactions = await db('transactions')
      .where({ user_id: userId })
      .select('id', 'currency', 'amount', 'type', 'action', 'description', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Economy] 获取交易记录失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// POST /api/economy/equip - 装备道具
router.post('/equip', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();
    const { item_id, item_type } = req.body;

    if (!item_id || !item_type) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '缺少 item_id 或 item_type 参数',
      });
    }

    const validTypes = ['frame', 'accessory', 'name_style', 'card_bg', 'chat_bubble', 'cursor', 'enter_effect', 'loading_screen'];
    if (!validTypes.includes(item_type)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '无效的道具类型',
      });
    }

    // 检查背包中是否拥有该道具
    const inventoryItem = await db('user_inventory')
      .where({ user_id: userId, item_id, item_type })
      .first();

    if (!inventoryItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '背包中不存在该道具',
      });
    }

    await ensureEquippedRecord(db, userId);

    // 根据道具类型更新装备表
    const fieldMap = {
      frame: 'frame_id',
      accessory: 'accessory_id',
      card_bg: 'card_bg_id',
      chat_bubble: 'chat_bubble_id',
      cursor: 'cursor_id',
      enter_effect: 'enter_effect_id',
      loading_screen: 'loading_screen_id',
      name_style: 'name_style',
    };

    if (fieldMap[item_type]) {
      await db('user_equipped')
        .where({ user_id: userId })
        .update({ [fieldMap[item_type]]: item_id });
    }

    // 更新背包中道具的 equipped 状态
    await db('user_inventory')
      .where({ user_id: userId, item_id, item_type })
      .update({ equipped: true });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: { item_id, item_type },
      message: '装备成功',
    });
  } catch (error) {
    console.error('[Economy] 装备道具失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// POST /api/economy/unequip - 卸下道具
router.post('/unequip', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();
    const { item_id, item_type } = req.body;

    if (!item_id || !item_type) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '缺少 item_id 或 item_type 参数',
      });
    }

    const validTypes = ['frame', 'accessory', 'name_style', 'card_bg', 'chat_bubble', 'cursor', 'enter_effect', 'loading_screen'];
    if (!validTypes.includes(item_type)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '无效的道具类型',
      });
    }

    await ensureEquippedRecord(db, userId);

    // 根据道具类型清除装备
    const fieldMap = {
      frame: 'frame_id',
      accessory: 'accessory_id',
      name_style: 'name_style',
      card_bg: 'card_bg_id',
      chat_bubble: 'chat_bubble_id',
      cursor: 'cursor_id',
      enter_effect: 'enter_effect_id',
      loading_screen: 'loading_screen_id',
    };

    const field = fieldMap[item_type];
    if (field) {
      await db('user_equipped')
        .where({ user_id: userId })
        .update({ [field]: null });

      // 更新背包中道具的 equipped 状态
      await db('user_inventory')
        .where({ user_id: userId, item_id, item_type })
        .update({ equipped: false });
    }

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: { item_id, item_type },
      message: '卸下成功',
    });
  } catch (error) {
    console.error('[Economy] 卸下道具失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// ========== 商店接口 ==========

// GET /api/shop/items - 获取商店列表
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    const query = db('shop_items').where({ is_on_sale: true });

    // 支持 ?type= 过滤
    const itemType = req.query.type;
    if (itemType) {
      query.where({ item_type: itemType });
    }

    // 支持 ?rarity= 过滤
    const rarity = req.query.rarity;
    if (rarity) {
      query.where({ rarity });
    }

    const items = await query
      .select('item_id', 'item_type', 'name', 'description', 'rarity', 'price_pi', 'price_alpha', 'style_config', 'is_limited', 'limited_end')
      .orderBy('rarity', 'asc')
      .orderBy('price_pi', 'desc');

    // 查询用户已拥有的道具
    const ownedItems = await db('user_inventory')
      .where({ user_id: userId })
      .select('item_id');
    const ownedSet = new Set(ownedItems.map(i => i.item_id));

    // 合并 owned 状态
    const itemsWithOwned = items.map(item => ({
      ...item,
      owned: ownedSet.has(item.item_id),
    }));

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: itemsWithOwned,
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Economy] 获取商店列表失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// POST /api/shop/buy - 购买道具
router.post('/buy', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();
    const { item_id } = req.body;

    if (!item_id) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '缺少 item_id 参数',
      });
    }

    // 查询商品信息
    const shopItem = await db('shop_items')
      .where({ item_id, is_on_sale: true })
      .first();

    if (!shopItem) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '商品不存在或已下架',
      });
    }

    // 检查限时商品是否已过期
    if (shopItem.is_limited && shopItem.limited_end && new Date(shopItem.limited_end) < new Date()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '该限时商品已过期',
      });
    }

    // 检查是否已拥有
    const owned = await db('user_inventory')
      .where({ user_id: userId, item_id })
      .first();

    if (owned) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        code: RESPONSE_CODES.CONFLICT,
        message: '已拥有该道具',
      });
    }

    await ensureEconomyRecord(db, userId);

    // 检查并扣减 Pi 币
    if (shopItem.price_pi > 0) {
      const piSuccess = await spendCurrency(db, userId, 'pi', shopItem.price_pi, 'shop_buy', `购买道具: ${shopItem.name}`);
      if (!piSuccess) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          code: RESPONSE_CODES.VALIDATION_ERROR,
          message: 'Pi 币余额不足',
        });
      }
    }

    // 检查并扣减 Alpha 币
    if (shopItem.price_alpha > 0) {
      const alphaSuccess = await spendCurrency(db, userId, 'alpha', shopItem.price_alpha, 'shop_buy', `购买道具: ${shopItem.name}`);
      if (!alphaSuccess) {
        // 如果 Alpha 币不足，需要退还已扣减的 Pi 币
        if (shopItem.price_pi > 0) {
          await addCurrency(db, userId, 'pi', shopItem.price_pi, 'shop_refund', `购买失败退还: ${shopItem.name}`);
        }
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          code: RESPONSE_CODES.VALIDATION_ERROR,
          message: 'Alpha 币余额不足',
        });
      }
    }

    // 添加到背包
    await db('user_inventory').insert({
      user_id: userId,
      item_id: shopItem.item_id,
      item_type: shopItem.item_type,
      name: shopItem.name,
      rarity: shopItem.rarity,
      style_config: shopItem.style_config,
    });

    // 增加经验
    await ensureLevelRecord(db, userId);
    await addExp(db, userId, 10, 'shop_buy');

    // 触发成就检查（非阻塞，失败不影响主流程）
    checkAndUnlockAchievements(db, userId).catch(e => {
      console.error('[Economy] 购买道具后成就检查失败:', e);
    });

    console.log(`[Economy] 用户 ${userId} 购买道具: ${shopItem.name}`);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: {
        item_id: shopItem.item_id,
        item_type: shopItem.item_type,
        name: shopItem.name,
        rarity: shopItem.rarity,
      },
      message: '购买成功',
    });
  } catch (error) {
    console.error('[Economy] 购买道具失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// ========== 任务接口 ==========

// POST /api/tasks/check-in - 每日签到
router.post('/check-in', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 查询 daily_login 任务记录
    const task = await db('user_tasks')
      .where({ user_id: userId, task_id: 'daily_login', task_type: 'daily' })
      .first();

    // 检查今天是否已签到
    if (task && task.progress >= 1 && task.reset_at) {
      const resetDate = new Date(task.reset_at);
      resetDate.setHours(0, 0, 0, 0);
      if (resetDate.getTime() === today.getTime()) {
        return res.json({
          code: RESPONSE_CODES.SUCCESS,
          data: { alreadyCheckedIn: true },
          message: '今天已签到',
        });
      }
    }

    // 未签到，执行签到
    await ensureEconomyRecord(db, userId);
    await ensureLevelRecord(db, userId);

    if (task) {
      // 更新已有任务记录
      await db('user_tasks')
        .where({ id: task.id })
        .update({ progress: 1, completed: true, reset_at: new Date() });
    } else {
      // 创建新的任务记录
      await db('user_tasks').insert({
        user_id: userId,
        task_id: 'daily_login',
        task_type: 'daily',
        progress: 1,
        target: 1,
        completed: true,
        reset_at: new Date(),
      });
    }

    // 发放签到奖励：15 Pi + 30 EXP
    await addCurrency(db, userId, 'pi', 15, 'daily_check_in', '每日签到奖励');
    const levelResult = await addExp(db, userId, 30, 'daily_check_in');

    // 标记签到任务为已领取（奖励已在签到时发放）
    await db('user_tasks')
      .where({ user_id: userId, task_id: 'daily_login', task_type: 'daily' })
      .update({ claimed: true });

    console.log(`[Economy] 用户 ${userId} 每日签到成功`);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: {
        alreadyCheckedIn: false,
        rewards: { pi: 15, exp: 30 },
        level: levelResult.level,
        title: levelResult.title,
        leveledUp: levelResult.leveledUp,
      },
      message: '签到成功',
    });
  } catch (error) {
    console.error('[Economy] 每日签到失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// GET /api/tasks/list - 获取任务列表
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();

    // ========== 每日/每周任务重置检查 ==========
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 今天 0:00

    // 计算本周一 0:00（每周任务重置点）
    const dayOfWeek = now.getDay() || 7; // 周日=7
    const monday = new Date(today);
    monday.setDate(monday.getDate() - dayOfWeek + 1);

    // 查询需要检查重置的任务（每日 + 每周）
    const existingTasks = await db('user_tasks')
      .where({ user_id: userId })
      .whereIn('task_type', ['daily', 'weekly'])
      .select('id', 'task_type', 'reset_at', 'progress', 'completed', 'claimed');

    const resetBatch = [];
    for (const task of existingTasks) {
      const resetAt = task.reset_at ? new Date(task.reset_at) : null;
      let shouldReset = false;

      if (task.task_type === 'daily') {
        // 每日任务：reset_at 不是今天则重置
        if (!resetAt) {
          shouldReset = true;
        } else {
          const resetDay = new Date(resetAt.getFullYear(), resetAt.getMonth(), resetAt.getDate());
          shouldReset = resetDay.getTime() < today.getTime();
        }
      } else if (task.task_type === 'weekly') {
        // 每周任务：reset_at 早于本周一则重置
        if (!resetAt) {
          shouldReset = true;
        } else {
          const resetDay = new Date(resetAt.getFullYear(), resetAt.getMonth(), resetAt.getDate());
          shouldReset = resetDay.getTime() < monday.getTime();
        }
      }

      if (shouldReset) {
        resetBatch.push(task.id);
      }
    }

    // 批量重置过期任务
    if (resetBatch.length > 0) {
      await db('user_tasks')
        .whereIn('id', resetBatch)
        .update({
          progress: 0,
          completed: false,
          claimed: false,
          reset_at: now,
        });
      console.log(`[Tasks] 重置了 ${resetBatch.length} 个过期任务 (用户: ${userId})`);
    }

    // ========== 查询任务列表 ==========
    const taskType = req.query.type;
    const query = db('user_tasks').where({ user_id: userId });

    if (taskType) {
      query.where({ task_type: taskType });
    }

    const tasks = await query
      .select('id', 'task_id', 'task_type', 'progress', 'target', 'completed', 'claimed', 'reset_at', 'created_at')
      .orderBy('created_at', 'desc');

    // 合并任务定义，返回完整数据
    const mergedTasks = tasks.map(task => {
      const def = TASK_DEFINITIONS[task.task_id] || {};
      const rewards = TASK_REWARDS[task.task_type] || { pi: 0, alpha: 0, exp: 0 };
      return {
        ...task,
        name: def.name || task.task_id,
        description: def.description || '',
        reward_pi: rewards.pi,
        reward_alpha: rewards.alpha,
        reward_exp: rewards.exp,
      };
    });

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: mergedTasks,
      message: '获取成功',
    });
  } catch (error) {
    console.error('[Economy] 获取任务列表失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

// POST /api/tasks/claim - 领取任务奖励
router.post('/claim', authenticateToken, async (req, res) => {
  try {
    const userId = getUserId(req);
    const db = getDB();
    console.log('[Tasks/Claim] req.body:', JSON.stringify(req.body));
    const { task_id, task_type } = req.body;

    if (!task_id || !task_type) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '缺少 task_id 或 task_type 参数',
      });
    }

    const validTypes = ['daily', 'weekly', 'main'];
    if (!validTypes.includes(task_type)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '无效的任务类型',
      });
    }

    // 查询任务记录
    const task = await db('user_tasks')
      .where({ user_id: userId, task_id, task_type })
      .first();

    if (!task) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        code: RESPONSE_CODES.NOT_FOUND,
        message: '任务不存在',
      });
    }

    if (!task.completed) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '任务尚未完成',
      });
    }

    if (task.claimed) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '奖励已领取',
      });
    }

    const rewards = TASK_REWARDS[task_type] || { pi: 0, alpha: 0, exp: 0 };

    await ensureEconomyRecord(db, userId);
    await ensureLevelRecord(db, userId);

    // 发放奖励
    if (rewards.pi > 0) {
      await addCurrency(db, userId, 'pi', rewards.pi, 'task_claim', `领取${task_type}任务奖励: ${task_id}`);
    }
    if (rewards.alpha > 0) {
      await addCurrency(db, userId, 'alpha', rewards.alpha, 'task_claim', `领取${task_type}任务奖励: ${task_id}`);
    }
    if (rewards.exp > 0) {
      await addExp(db, userId, rewards.exp, 'task_claim');
    }

    // 标记为已领取
    await db('user_tasks')
      .where({ id: task.id })
      .update({ claimed: true });

    // 触发成就检查（非阻塞，失败不影响主流程）
    checkAndUnlockAchievements(db, userId).catch(e => {
      console.error('[Economy] 领取任务奖励后成就检查失败:', e);
    });

    console.log(`[Economy] 用户 ${userId} 领取任务奖励: ${task_id} (${task_type})`);

    res.json({
      code: RESPONSE_CODES.SUCCESS,
      data: {
        task_id,
        task_type,
        rewards,
      },
      message: '奖励领取成功',
    });
  } catch (error) {
    console.error('[Economy] 领取任务奖励失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '服务器内部错误',
    });
  }
});

module.exports = router;
