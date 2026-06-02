/**
 * 删除 admin 表的 password 字段
 * 密码认证已迁移到 Logto，不再需要本地存储密码
 */
exports.up = async function(knex) {
  // 检查字段是否存在
  const columnInfo = await knex.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'admin' AND column_name = 'password'
  `);

  if (columnInfo.rows.length === 0) {
    console.log('ℹ️  admin.password 字段不存在，跳过');
    return;
  }

  await knex.raw(`ALTER TABLE "admin" DROP COLUMN "password"`);
  console.log('✅ admin.password 字段已删除');
};

exports.down = async function(knex) {
  // 回滚：添加回 password 字段（VARCHAR(255)，允许为空）
  await knex.raw(`
    ALTER TABLE "admin"
    ADD COLUMN "password" VARCHAR(255)
  `);
  console.log('✅ admin.password 字段已恢复');
};
