/**
 * 删除 admin 表的 password 字段
 * 密码认证已迁移到 Logto，不再需要本地存储密码
 */
exports.up = async function(knex) {
  const client = knex.client.config.client;
  let columnExists = false;

  if (client === 'pg' || client === 'postgresql') {
    // PostgreSQL: 检查字段是否存在
    const columnInfo = await knex.raw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'admin' AND column_name = 'password'
    `);
    columnExists = columnInfo.rows.length > 0;
  } else if (client === 'sqlite3') {
    // SQLite: 使用 PRAGMA 检查
    const columnInfo = await knex.raw(`PRAGMA table_info(admin)`);
    if (Array.isArray(columnInfo)) {
      columnExists = columnInfo.some(c => c.name === 'password');
    }
  } else {
    // 其他数据库使用通用查询
    const columnInfo = await knex.raw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'admin' AND column_name = 'password'
    `);
    columnExists = Array.isArray(columnInfo) && columnInfo.length > 0;
  }

  if (!columnExists) {
    console.log('ℹ️  admin.password 字段不存在，跳过');
    return;
  }

  // 使用 Knex 通用 API 删除字段（支持 PostgreSQL 和 SQLite3）
  await knex.schema.alterTable('admin', (table) => {
    table.dropColumn('password');
  });

  console.log('✅ admin.password 字段已删除');
};

exports.down = async function(knex) {
  const client = knex.client.config.client;

  // 回滚：添加回 password 字段（VARCHAR(255)，允许为空）
  await knex.schema.alterTable('admin', (table) => {
    table.string('password', 255).nullable();
  });

  console.log('✅ admin.password 字段已恢复');
};
