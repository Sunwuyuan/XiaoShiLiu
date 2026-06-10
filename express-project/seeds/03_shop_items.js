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
    }
  ]);

  console.log('✅ 商店初始数据已插入');
};
