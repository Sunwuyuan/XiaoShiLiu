/**
 * 修改 admin.is_super 字段: boolean -> smallint NULL DEFAULT 0
 * 是否超级管理员: 1-是, 0-否
 */
exports.up = async function(knex) {
  // 获取当前数据库客户端类型
  const client = knex.client.config.client;

  // 检查字段是否存在及其当前类型
  let currentType = null;

  if (client === 'pg' || client === 'postgresql') {
    const columnInfo = await knex.raw(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'admin' AND column_name = 'is_super'
    `);
    currentType = columnInfo.rows[0]?.data_type;
  } else if (client === 'sqlite3') {
    // SQLite 类型检查
    const columnInfo = await knex.raw(`PRAGMA table_info(admin)`);
    const column = columnInfo.find ? columnInfo.find(c => c.name === 'is_super') : null;
    currentType = column ? column.type : null;
  } else {
    // 其他数据库使用通用查询
    const columnInfo = await knex.raw(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'admin' AND column_name = 'is_super'
    `);
    currentType = Array.isArray(columnInfo) && columnInfo[0] ? columnInfo[0].data_type : null;
  }

  if (currentType === 'smallint' || currentType === 'integer' || currentType === 'INTEGER') {
    console.log('ℹ️  admin.is_super 已经是 smallint/integer 类型，跳过');
    return;
  }

  if (client === 'pg' || client === 'postgresql') {
    // PostgreSQL: 分步执行类型转换
    await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" DROP DEFAULT`);
    await knex.raw(`
      ALTER TABLE "admin"
      ALTER COLUMN "is_super" TYPE SMALLINT
      USING CASE WHEN "is_super" = true THEN 1 ELSE 0 END
    `);
    await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" DROP NOT NULL`);
    await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" SET DEFAULT 0`);
  } else if (client === 'sqlite3') {
    // SQLite: 使用 Knex 通用 API（SQLite 对 ALTER COLUMN 支持有限）
    // 需要重建表来修改列类型
    await knex.schema.alterTable('admin', (table) => {
      // SQLite 中先删除默认值再修改
      table.integer('is_super').defaultTo(0).alter();
    });
  } else {
    // 其他数据库使用通用方式
    await knex.schema.alterTable('admin', (table) => {
      table.integer('is_super').defaultTo(0).alter();
    });
  }

  console.log('✅ admin.is_super 字段已修改为 smallint NULL DEFAULT 0');
};

exports.down = async function(knex) {
  const client = knex.client.config.client;

  if (client === 'pg' || client === 'postgresql') {
    // PostgreSQL: 回滚到 boolean
    await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" DROP DEFAULT`);
    await knex.raw(`
      ALTER TABLE "admin"
      ALTER COLUMN "is_super" TYPE BOOLEAN
      USING CASE WHEN "is_super" = 1 THEN true ELSE false END
    `);
    await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" SET NOT NULL`);
    await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" SET DEFAULT false`);
  } else if (client === 'sqlite3') {
    // SQLite: 使用 Knex 通用 API
    await knex.schema.alterTable('admin', (table) => {
      table.boolean('is_super').defaultTo(false).notNullable().alter();
    });
  } else {
    // 其他数据库使用通用方式
    await knex.schema.alterTable('admin', (table) => {
      table.boolean('is_super').defaultTo(false).notNullable().alter();
    });
  }

  console.log('✅ admin.is_super 已回滚为 boolean NOT NULL DEFAULT false');
};
