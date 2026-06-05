/**
 * 会话管理与临时密码备注 - 数据库迁移文件
 * 1. mc_temp_passwords 添加 remark 备注字段
 * 2. yggdrasil_tokens 添加 auth_type（登录方式）和 temp_password_id（关联临时密码）字段
 */

exports.up = async function(knex) {
  // 临时密码表添加备注
  const hasRemark = await knex.schema.hasColumn('mc_temp_passwords', 'remark');
  if (!hasRemark) {
    await knex.schema.table('mc_temp_passwords', (table) => {
      table.string('remark', 100).defaultTo(null).comment('备注说明');
    });
    console.log('✅ mc_temp_passwords 表已添加 remark 字段');
  }

  // Token 表添加登录方式
  const hasAuthType = await knex.schema.hasColumn('yggdrasil_tokens', 'auth_type');
  if (!hasAuthType) {
    await knex.schema.table('yggdrasil_tokens', (table) => {
      table.string('auth_type', 20).defaultTo('main').comment('登录方式: main=主密码, temp=临时密码');
    });
    console.log('✅ yggdrasil_tokens 表已添加 auth_type 字段');
  }

  // Token 表添加关联临时密码ID
  const hasTempPwdId = await knex.schema.hasColumn('yggdrasil_tokens', 'temp_password_id');
  if (!hasTempPwdId) {
    await knex.schema.table('yggdrasil_tokens', (table) => {
      table.bigInteger('temp_password_id').defaultTo(null).references('id').inTable('mc_temp_passwords').onDelete('SET NULL').comment('关联的临时密码ID');
    });
    console.log('✅ yggdrasil_tokens 表已添加 temp_password_id 字段');
  }

  // 添加索引
  const hasIndex = await knex.schema.hasColumn('yggdrasil_tokens', 'auth_type');
  if (hasIndex) {
    // knex 不支持检查索引是否存在，直接添加，如果已存在会忽略
    try {
      await knex.schema.table('yggdrasil_tokens', (table) => {
        table.index(['profile_id', 'auth_type']);
      });
    } catch (e) {
      // 索引已存在，忽略
    }
  }
};

exports.down = async function(knex) {
  await knex.schema.table('yggdrasil_tokens', (table) => {
    table.dropColumn('temp_password_id');
    table.dropColumn('auth_type');
  });
  await knex.schema.table('mc_temp_passwords', (table) => {
    table.dropColumn('remark');
  });
  console.log('✅ 已回滚会话管理和备注相关字段');
};
