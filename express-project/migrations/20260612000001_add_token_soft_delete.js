/**
 * 添加 Token 软删除字段
 * 用于实现 token 过期/注销后立即失效，而非物理删除
 * 解决"能启动但进不去服务器"的问题
 *
 * @version 1.0.0
 * @date 2026-06-12
 */

exports.up = async function(knex) {
  // 添加 is_revoked 字段（是否已撤销）
  const hasRevokedColumn = await knex.schema.hasColumn('yggdrasil_tokens', 'is_revoked');

  if (!hasRevokedColumn) {
    await knex.schema.table('yggdrasil_tokens', (table) => {
      table.boolean('is_revoked').notNullable().defaultTo(0).comment('是否已撤销(0=有效, 1=已撤销)').after('is_temporarily_invalidated');
      table.timestamp('revoked_at').nullable().comment('撤销时间').after('is_revoked');
      table.string('revoked_reason', 100).nullable().comment('撤销原因').after('revoked_at');
      table.index(['is_revoked', 'expires_at'], 'idx_revoked_tokens'); // 复合索引，加速查询有效token
    });
    console.log('✅ yggdrasil_tokens 表已添加软删除字段 (is_revoked, revoked_at, revoked_reason)');
  } else {
    console.log('ℹ️  软删除字段已存在，跳过');
  }

  // 验证现有数据：确保所有现有token的 is_revoked 为 0
  const result = await knex('yggdrasil_tokens')
    .whereNull('is_revoked')
    .orWhere('is_revoked', null)
    .update({ is_revoked: 0 });

  if (result > 0) {
    console.log(`✅ 已修复 ${result} 条记录的 is_revoked 字段`);
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('yggdrasil_tokens', 'is_revoked');

  if (hasColumn) {
    await knex.schema.table('yggdrasil_tokens', (table) => {
      table.dropIndex('idx_revoked_tokens');
      table.dropColumn('revoked_reason');
      table.dropColumn('revoked_at');
      table.dropColumn('is_revoked');
    });
    console.log('✅ yggdrasil_tokens 表已删除软删除字段');
  }
};
