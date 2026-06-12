/**
 * 修复临时密码表 temp_password_plain 字段非空约束
 * 业务代码不再存储明文密码（安全考虑），字段应允许 NULL
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('mc_temp_passwords', (table) => {
    table.string('temp_password_plain', 32).nullable().alter();
  });
  console.log('✅ mc_temp_passwords.temp_password_plain 已改为允许 NULL');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('mc_temp_passwords', (table) => {
    table.string('temp_password_plain', 32).notNullable().alter();
  });
  console.log('✅ mc_temp_passwords.temp_password_plain 已恢复 NOT NULL');
};
