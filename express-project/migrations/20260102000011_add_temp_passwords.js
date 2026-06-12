/**
 * 临时密码功能 - 数据库迁移文件
 * 用于角色安全分享，支持设置登录次数限制和截止日期
 */

exports.up = async function(knex) {
  await knex.schema.createTable('mc_temp_passwords', (table) => {
    table.bigIncrements('id').primary().comment('主键ID');
    table.bigInteger('profile_id').notNullable().references('id').inTable('mc_profiles').onDelete('CASCADE').comment('关联的MC角色ID');
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').comment('创建者社区用户ID');

    // 临时密码信息
    table.string('temp_password_hash', 255).notNullable().comment('临时密码bcrypt哈希');
    table.string('temp_password_plain', 32).defaultTo(null).comment('临时密码明文（安全考虑不再存储，字段保留兼容）');

    // 限制条件
    table.integer('max_uses').defaultTo(1).comment('最大允许登录次数');
    table.integer('used_count').defaultTo(0).comment('已使用次数');
    table.timestamp('expires_at').notNullable().comment('过期时间');

    // 状态
    table.boolean('is_revoked').defaultTo(false).comment('是否已被手动撤销');
    table.timestamp('revoked_at').defaultTo(null).comment('撤销时间');
    table.string('revoke_reason', 100).defaultTo(null).comment('撤销原因');

    // 使用记录（最后一次）
    table.string('last_used_ip', 45).defaultTo(null).comment('最后使用IP');
    table.timestamp('last_used_at').defaultTo(null).comment('最后使用时间');

    table.timestamps(true, true);

    // 索引
    table.index(['profile_id', 'is_revoked', 'expires_at']);
    table.index(['profile_id', 'created_at']);
  });

  console.log('✅ 临时密码表创建完成');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('mc_temp_passwords');
  console.log('✅ 临时密码表已删除');
};
