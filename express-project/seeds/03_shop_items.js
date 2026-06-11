/**
 * 商店初始数据种子
 */

exports.seed = async function(knex) {
  // 清空现有数据
  await knex('shop_items').del();

  // 插入初始商店物品
  await knex('shop_items').insert([
    // 头像框
    {
      item_id: 'frame_gold',
      item_type: 'frame',
      name: '金色边框',
      description: '闪耀的金色头像框，彰显尊贵身份',
      rarity: 'rare',
      price_pi: 500,
      price_alpha: 0,
      style_config: JSON.stringify({ borderColor: '#FFD700', borderWidth: 3, glowColor: '#FFD700' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'frame_rainbow',
      item_type: 'frame',
      name: '彩虹边框',
      description: '七彩流光头像框，梦幻而绚丽',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 50,
      style_config: JSON.stringify({ borderColor: 'linear-gradient(45deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)', borderWidth: 3, animated: true }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'frame_neon',
      item_type: 'frame',
      name: '霓虹边框',
      description: '赛博朋克风格的霓虹发光边框',
      rarity: 'legendary',
      price_pi: 0,
      price_alpha: 200,
      style_config: JSON.stringify({ borderColor: '#00ff88', borderWidth: 2, glowColor: '#00ff88', glowIntensity: 15 }),
      is_limited: true,
      limited_end: new Date('2026-12-31'),
      is_on_sale: true
    },
    // 头饰
    {
      item_id: 'accessory_crown',
      item_type: 'accessory',
      name: '皇冠',
      description: '小王冠，佩戴后尽显王者风范',
      rarity: 'legendary',
      price_pi: 0,
      price_alpha: 300,
      style_config: JSON.stringify({ type: 'crown', color: '#FFD700', position: 'top' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'accessory_halo',
      item_type: 'accessory',
      name: '天使光环',
      description: '纯洁的天使光环，散发柔和光芒',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 100,
      style_config: JSON.stringify({ type: 'halo', color: '#FFF8DC', glowColor: '#FFF8DC' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'accessory_ears',
      item_type: 'accessory',
      name: '猫耳',
      description: '可爱的猫耳装饰',
      rarity: 'common',
      price_pi: 100,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'ears', color: '#FFB6C1', position: 'top' }),
      is_limited: false,
      is_on_sale: true
    },
    // 用户名样式
    {
      item_id: 'name_gradient_blue',
      item_type: 'name_style',
      name: '渐变蓝',
      description: '蓝色渐变用户名效果',
      rarity: 'rare',
      price_pi: 300,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'gradient', colors: ['#4facfe', '#00f2fe'], direction: 'to right' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'name_rainbow',
      item_type: 'name_style',
      name: '彩虹字',
      description: '七彩动态彩虹用户名',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 80,
      style_config: JSON.stringify({ type: 'rainbow', animation: 'hue-rotate 3s linear infinite' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'name_neon_green',
      item_type: 'name_style',
      name: '霓虹绿',
      description: '赛博朋克霓虹绿色发光用户名',
      rarity: 'legendary',
      price_pi: 0,
      price_alpha: 150,
      style_config: JSON.stringify({ type: 'neon', color: '#00ff88', glowColor: '#00ff88', glowIntensity: 10 }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'name_shimmer',
      item_type: 'name_style',
      name: '流光字',
      description: '文字上有流光扫过效果',
      rarity: 'mythic',
      price_pi: 0,
      price_alpha: 500,
      style_config: JSON.stringify({ type: 'shimmer', color: '#ffffff', shimmerColor: '#FFD700' }),
      is_limited: true,
      limited_end: new Date('2026-12-31'),
      is_on_sale: true
    },
    // 卡片背景
    {
      item_id: 'cardbg_starry',
      item_type: 'card_bg',
      name: '星空背景',
      description: '深邃星空背景卡片',
      rarity: 'rare',
      price_pi: 400,
      price_alpha: 0,
      style_config: JSON.stringify({ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', stars: true }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'cardbg_sakura',
      item_type: 'card_bg',
      name: '樱花背景',
      description: '粉色樱花飘落背景卡片',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 60,
      style_config: JSON.stringify({ background: 'linear-gradient(135deg, #ffeef8 0%, #ffd6e7 100%)', particles: 'sakura' }),
      is_limited: false,
      is_on_sale: true
    },
    // 聊天气泡
    {
      item_id: 'bubble_cloud',
      item_type: 'chat_bubble',
      name: '云朵气泡',
      description: '可爱的云朵形状聊天气泡',
      rarity: 'common',
      price_pi: 150,
      price_alpha: 0,
      style_config: JSON.stringify({ shape: 'cloud', background: '#f0f8ff', borderColor: '#b0c4de' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'bubble_heart',
      item_type: 'chat_bubble',
      name: '爱心气泡',
      description: '粉色爱心形状聊天气泡',
      rarity: 'rare',
      price_pi: 350,
      price_alpha: 0,
      style_config: JSON.stringify({ shape: 'heart', background: '#ffe4e1', borderColor: '#ff69b4' }),
      is_limited: false,
      is_on_sale: true
    },
    // ========== 新增商品 ==========
    // 头像框（frame）
    {
      item_id: 'frame_pink',
      item_type: 'frame',
      name: '粉色甜心框',
      description: '甜美可爱的粉色头像框',
      rarity: 'common',
      price_pi: 80,
      price_alpha: 0,
      style_config: JSON.stringify({ borderColor: '#FFB6C1', borderWidth: 3, glowColor: '#FFB6C1' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'frame_star',
      item_type: 'frame',
      name: '星辰框',
      description: '星光璀璨的星辰头像框',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 60,
      style_config: JSON.stringify({ borderColor: '#FFD700', borderWidth: 3, glowColor: '#FFD700', stars: true }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'frame_flame',
      item_type: 'frame',
      name: '烈焰框',
      description: '燃烧的烈焰头像框，霸气十足',
      rarity: 'legendary',
      price_pi: 0,
      price_alpha: 150,
      style_config: JSON.stringify({ borderColor: '#ff4500', borderWidth: 3, glowColor: '#ff4500', glowIntensity: 12, animated: true }),
      is_limited: true,
      limited_end: new Date('2027-06-30'),
      is_on_sale: true
    },
    // 头饰（accessory）
    {
      item_id: 'accessory_glasses',
      item_type: 'accessory',
      name: '墨镜',
      description: '酷炫的黑色墨镜',
      rarity: 'common',
      price_pi: 80,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'glasses', color: '#1a1a1a', position: 'face' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'accessory_witch_hat',
      item_type: 'accessory',
      name: '女巫帽',
      description: '神秘的紫色女巫帽',
      rarity: 'rare',
      price_pi: 200,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'hat', color: '#6a0dad', position: 'top' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'accessory_devil_horns',
      item_type: 'accessory',
      name: '恶魔角',
      description: '俏皮的恶魔角装饰',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 80,
      style_config: JSON.stringify({ type: 'horns', color: '#cc0000', position: 'top' }),
      is_limited: false,
      is_on_sale: true
    },
    // 名字样式（name_style）
    {
      item_id: 'name_fire',
      item_type: 'name_style',
      name: '烈焰字',
      description: '燃烧的烈焰效果用户名',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 70,
      style_config: JSON.stringify({ type: 'fire' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'name_ice',
      item_type: 'name_style',
      name: '冰霜字',
      description: '冰蓝色渐变用户名效果',
      rarity: 'rare',
      price_pi: 250,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'gradient', colors: ['#00d2ff', '#3a7bd5'], direction: 'to right' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'name_sunset',
      item_type: 'name_style',
      name: '落日字',
      description: '温暖的落日渐变用户名效果',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 60,
      style_config: JSON.stringify({ type: 'gradient', colors: ['#f12711', '#f5af19'], direction: 'to right' }),
      is_limited: false,
      is_on_sale: true
    },
    // 名片背景（card_bg）
    {
      item_id: 'cardbg_ocean',
      item_type: 'card_bg',
      name: '深海背景',
      description: '神秘深海背景卡片',
      rarity: 'common',
      price_pi: 120,
      price_alpha: 0,
      style_config: JSON.stringify({ background: 'linear-gradient(135deg, #0c2461 0%, #1e3799 50%, #0a3d62 100%)' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'cardbg_forest',
      item_type: 'card_bg',
      name: '森林背景',
      description: '清新自然森林背景卡片',
      rarity: 'rare',
      price_pi: 300,
      price_alpha: 0,
      style_config: JSON.stringify({ background: 'linear-gradient(135deg, #2d5016 0%, #4a7c23 50%, #1a3a0a 100%)', particles: 'leaves' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'cardbg_galaxy',
      item_type: 'card_bg',
      name: '银河背景',
      description: '璀璨银河背景卡片，星光闪烁',
      rarity: 'legendary',
      price_pi: 0,
      price_alpha: 180,
      style_config: JSON.stringify({ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', stars: true, nebula: true }),
      is_limited: true,
      limited_end: new Date('2027-06-30'),
      is_on_sale: true
    },
    // 聊天气泡（chat_bubble）
    {
      item_id: 'bubble_star',
      item_type: 'chat_bubble',
      name: '星星气泡',
      description: '可爱的星星形状聊天气泡',
      rarity: 'common',
      price_pi: 120,
      price_alpha: 0,
      style_config: JSON.stringify({ shape: 'star', background: '#fffacd', borderColor: '#ffd700' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'bubble_rainbow',
      item_type: 'chat_bubble',
      name: '彩虹气泡',
      description: '七彩渐变彩虹聊天气泡',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 70,
      style_config: JSON.stringify({ shape: 'round', background: 'linear-gradient(135deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff)', borderColor: '#ff69b4' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'bubble_gift',
      item_type: 'chat_bubble',
      name: '礼物气泡',
      description: '精致的礼物盒形状聊天气泡',
      rarity: 'rare',
      price_pi: 280,
      price_alpha: 0,
      style_config: JSON.stringify({ shape: 'gift', background: '#fff5ee', borderColor: '#de3163' }),
      is_limited: false,
      is_on_sale: true
    },

    // ========== 光标皮肤 ==========
    {
      item_id: 'cursor_pink_heart',
      item_type: 'cursor',
      name: '粉色爱心光标',
      description: '鼠标指针变成粉色爱心',
      rarity: 'common',
      price_pi: 80,
      price_alpha: 0,
      style_config: JSON.stringify({ cursor: 'crosshair', icon: 'heart', color: '#ff69b4' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'cursor_sword',
      item_type: 'cursor',
      name: '勇者之剑光标',
      description: '鼠标指针变成一把剑',
      rarity: 'rare',
      price_pi: 200,
      price_alpha: 0,
      style_config: JSON.stringify({ cursor: 'crosshair' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'cursor_magic_wand',
      item_type: 'cursor',
      name: '魔法棒光标',
      description: '鼠标指针变成魔法棒，带星星拖尾',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 50,
      style_config: JSON.stringify({ cursor: 'help', glow: true }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'cursor_golden',
      item_type: 'cursor',
      name: '黄金光标',
      description: '奢华金色鼠标指针',
      rarity: 'legendary',
      price_pi: 0,
      price_alpha: 150,
      style_config: JSON.stringify({ cursor: 'pointer', color: '#ffd700' }),
      is_limited: true,
      limited_end: '2027-06-30',
      is_on_sale: true
    },

    // ========== 入场特效 ==========
    {
      item_id: 'enter_confetti',
      item_type: 'enter_effect',
      name: '彩带入场',
      description: '进入页面时彩带飘落',
      rarity: 'common',
      price_pi: 100,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'confetti', colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'] }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'enter_spotlight',
      item_type: 'enter_effect',
      name: '聚光灯入场',
      description: '进入页面时聚光灯打在你身上',
      rarity: 'rare',
      price_pi: 250,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'spotlight', color: '#ffffff' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'enter_fireworks',
      item_type: 'enter_effect',
      name: '烟花入场',
      description: '进入页面时烟花绽放',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 80,
      style_config: JSON.stringify({ type: 'fireworks', colors: ['#ff4757', '#2ed573', '#1e90ff', '#ffa502'] }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'enter_portal',
      item_type: 'enter_effect',
      name: '传送门入场',
      description: '从紫色漩涡中现身',
      rarity: 'legendary',
      price_pi: 0,
      price_alpha: 200,
      style_config: JSON.stringify({ type: 'portal', color: '#8e44ad' }),
      is_limited: true,
      limited_end: '2027-06-30',
      is_on_sale: true
    },

    // ========== 加载画面 ==========
    {
      item_id: 'loading_cat',
      item_type: 'loading_screen',
      name: '猫咪加载',
      description: '一只可爱的猫咪在加载',
      rarity: 'common',
      price_pi: 120,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'animation', animation: 'cat', text: '猫咪正在搬运数据...' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'loading_space',
      item_type: 'loading_screen',
      name: '太空加载',
      description: '在星空中穿梭加载',
      rarity: 'rare',
      price_pi: 300,
      price_alpha: 0,
      style_config: JSON.stringify({ type: 'animation', animation: 'stars', text: '穿越星际中...' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'loading_matrix',
      item_type: 'loading_screen',
      name: '黑客帝国加载',
      description: '绿色代码雨加载画面',
      rarity: 'epic',
      price_pi: 0,
      price_alpha: 60,
      style_config: JSON.stringify({ type: 'animation', animation: 'matrix', text: '正在解密数据流...' }),
      is_limited: false,
      is_on_sale: true
    },
    {
      item_id: 'loading_zen',
      item_type: 'loading_screen',
      name: '禅意加载',
      description: '水墨画风格的加载画面',
      rarity: 'legendary',
      price_pi: 0,
      price_alpha: 180,
      style_config: JSON.stringify({ type: 'animation', animation: 'ink', text: '静候佳音...' }),
      is_limited: true,
      limited_end: '2027-06-30',
      is_on_sale: true
    }
  ]);

  console.log('✅ 商店初始数据已插入');
};
