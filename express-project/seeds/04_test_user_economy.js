/**
 * 测试用户经济数据种子
 * 给 zhaishis 添加 9999 Pi 和 999 Alpha
 */

exports.seed = async function(knex) {
  // 查找用户 zhaishis
  const user = await knex('users').where({ nickname: 'zhaishis' }).first();

  if (!user) {
    console.log('⚠️ 用户 zhaishis 不存在，跳过测试数据插入');
    return;
  }

  const userId = user.user_id;
  console.log(`✅ 找到用户: ${user.nickname} (ID: ${userId})`);

  // 确保用户经济记录存在
  const existingEconomy = await knex('user_economy').where({ user_id: userId }).first();

  if (existingEconomy) {
    await knex('user_economy')
      .where({ user_id: userId })
      .update({
        pi_keys: 9999,
        alpha_keys: 999,
        total_pi_earned: 9999,
        total_alpha_earned: 999,
        updated_at: knex.fn.now()
      });
    console.log(`✅ 已更新用户 ${user.nickname} 的经济数据: 9999 Pi, 999 Alpha`);
  } else {
    await knex('user_economy').insert({
      user_id: userId,
      pi_keys: 9999,
      alpha_keys: 999,
      total_pi_earned: 9999,
      total_alpha_earned: 999,
      updated_at: knex.fn.now()
    });
    console.log(`✅ 已创建用户 ${user.nickname} 的经济数据: 9999 Pi, 999 Alpha`);
  }

  // 确保用户等级记录存在
  const existingLevel = await knex('user_levels').where({ user_id: userId }).first();

  if (existingLevel) {
    console.log(`✅ 用户 ${user.nickname} 已存在等级记录`);
  } else {
    await knex('user_levels').insert({
      user_id: userId,
      level: 1,
      exp: 0,
      total_exp: 0,
      title: 'Esc',
      updated_at: knex.fn.now()
    });
    console.log(`✅ 已创建用户 ${user.nickname} 的等级记录`);
  }

  // 确保用户装备记录存在
  const existingEquipped = await knex('user_equipped').where({ user_id: userId }).first();

  if (existingEquipped) {
    console.log(`✅ 用户 ${user.nickname} 已存在装备记录`);
  } else {
    await knex('user_equipped').insert({
      user_id: userId,
      updated_at: knex.fn.now()
    });
    console.log(`✅ 已创建用户 ${user.nickname} 的装备记录`);
  }

  console.log('✅ 测试用户经济数据插入完成');
};
