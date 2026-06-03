/**
 * 为 mc_textures 表添加 (profile_id, texture_type) 唯一约束
 * 用于支持 ON CONFLICT 语法（皮肤/披风上传去重）
 */

exports.up = async function(knex) {
  const client = knex.client.config.client;
  let exists = false;

  if (client === 'pg' || client === 'postgresql') {
    // PostgreSQL: 检查索引是否存在
    const result = await knex.raw(`
      SELECT 1 FROM pg_indexes
      WHERE tablename = 'mc_textures' AND indexdef LIKE '%mc_textures_profile_id_texture_type_unique%'
    `);
    exists = result.rows.length > 0;
  } else if (client === 'sqlite3') {
    // SQLite: 使用 PRAGMA 检查索引
    const result = await knex.raw(`PRAGMA index_list(mc_textures)`);
    if (Array.isArray(result)) {
      exists = result.some(idx => idx.name === 'mc_textures_profile_id_texture_type_unique');
    }
  } else {
    // 其他数据库使用通用查询
    const result = await knex.raw(`
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'mc_textures' AND constraint_name LIKE '%profile_id_texture_type%'
    `);
    exists = Array.isArray(result) && result.length > 0;
  }

  if (exists) {
    console.log('ℹ️  mc_textures 唯一约束已存在，跳过');
    return;
  }

  // 先清理可能的重复数据（使用跨数据库兼容的方式）
  if (client === 'pg' || client === 'postgresql') {
    // PostgreSQL: 使用 DELETE ... USING
    const duplicates = await knex.raw(`
      DELETE FROM mc_textures a
      USING mc_textures b
      WHERE a.profile_id = b.profile_id
        AND a.texture_type = b.texture_type
        AND a.id > b.id
    `);
    console.log(`🧹 清理了 ${duplicates.rowCount || 0} 条重复数据`);
  } else {
    // SQLite 和其他数据库: 使用子查询删除重复数据
    // 先找出需要保留的最小 id
    const subquery = knex('mc_textures as a')
      .join('mc_textures as b', function() {
        this.on('a.profile_id', '=', 'b.profile_id')
            .andOn('a.texture_type', '=', 'b.texture_type');
      })
      .whereRaw('a.id > b.id')
      .select('a.id');

    const duplicates = await knex('mc_textures')
      .whereIn('id', subquery)
      .delete();
    console.log(`🧹 清理了 ${duplicates || 0} 条重复数据`);
  }

  // 创建唯一索引（Knex 通用 API）
  await knex.schema.table('mc_textures', (table) => {
    table.unique(['profile_id', 'texture_type']);
  });

  console.log('✅ mc_textures 唯一约束 (profile_id, texture_type) 已添加');
};

exports.down = async function(knex) {
  const client = knex.client.config.client;

  // 回滚：删除唯一约束
  try {
    if (client === 'pg' || client === 'postgresql') {
      await knex.raw(`
        ALTER TABLE "mc_textures" DROP CONSTRAINT IF EXISTS "mc_textures_profile_id_texture_type_unique"
      `);
    } else if (client === 'sqlite3') {
      // SQLite 不支持 DROP CONSTRAINT，需要重建表
      // 这里使用 Knex 的通用方式尝试删除
      await knex.schema.alterTable('mc_textures', (table) => {
        // SQLite 中 dropUnique 可能不工作，需要手动处理
        table.dropUnique(['profile_id', 'texture_type']);
      });
    } else {
      await knex.schema.alterTable('mc_textures', (table) => {
        table.dropUnique(['profile_id', 'texture_type']);
      });
    }
    console.log('✅ mc_textures 唯一约束已删除');
  } catch (error) {
    console.log('ℹ️  约束不存在，无需回滚');
  }
};
