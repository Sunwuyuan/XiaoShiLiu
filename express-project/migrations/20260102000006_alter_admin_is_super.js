/**
 * 修改 admin.is_super 字段: boolean -> smallint NULL DEFAULT 0
 * 是否超级管理员: 1-是, 0-否
 */
exports.up = async function(knex) {
  const columnInfo = await knex.raw(`
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'admin' AND column_name = 'is_super'
  `);
  const currentType = columnInfo.rows[0]?.data_type;

  if (currentType === 'smallint' || currentType === 'integer') {
    console.log('ℹ️  admin.is_super 已经是 smallint 类型，跳过');
    return;
  }

  // 分步执行：先删默认值 -> 改类型 -> 允许NULL -> 设新默认值
  await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" DROP DEFAULT`);
  await knex.raw(`
    ALTER TABLE "admin"
    ALTER COLUMN "is_super" TYPE SMALLINT
    USING CASE WHEN "is_super" = true THEN 1 ELSE 0 END
  `);
  await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" DROP NOT NULL`);
  await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" SET DEFAULT 0`);

  console.log('✅ admin.is_super 字段已修改为 smallint NULL DEFAULT 0');
};

exports.down = async function(knex) {
  // 回滚：smallint -> boolean NOT NULL DEFAULT false
  await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" DROP DEFAULT`);
  await knex.raw(`
    ALTER TABLE "admin"
    ALTER COLUMN "is_super" TYPE BOOLEAN
    USING CASE WHEN "is_super" = 1 THEN true ELSE false END
  `);
  await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" SET NOT NULL`);
  await knex.raw(`ALTER TABLE "admin" ALTER COLUMN "is_super" SET DEFAULT false`);

  console.log('✅ admin.is_super 已回滚为 boolean NOT NULL DEFAULT false');
};
