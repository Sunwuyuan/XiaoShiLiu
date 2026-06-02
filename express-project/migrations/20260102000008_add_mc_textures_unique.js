/**
 * 为 mc_textures 表添加 (profile_id, texture_type) 唯一约束
 * 用于支持 ON CONFLICT 语法（皮肤/披风上传去重）
 */

exports.up = async function(knex) {
  // 检查是否已存在
  const exists = await knex.raw(`
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'mc_textures' AND indexdef LIKE '%mc_textures_profile_id_texture_type_unique%'
  `);

  if (exists.rows.length > 0) {
    console.log('ℹ️  mc_textures 唯一约束已存在，跳过');
    return;
  }

  // 先清理可能的重复数据
  const duplicates = await knex.raw(`
    DELETE FROM mc_textures a
    USING mc_textures b
    WHERE a.profile_id = b.profile_id
      AND a.texture_type = b.texture_type
      AND a.id > b.id
  `);
  console.log(`🧹 清理了 ${duplicates.rowCount || 0} 条重复数据`);

  // 创建唯一索引
  await knex.schema.table('mc_textures', (table) => {
    table.unique(['profile_id', 'texture_type']);
  });

  console.log('✅ mc_textures 唯一约束 (profile_id, texture_type) 已添加');
};

exports.down = async function(knex) {
  // 回滚：删除唯一约束
  try {
    await knex.raw(`
      ALTER TABLE "mc_textures" DROP CONSTRAINT IF EXISTS "mc_textures_profile_id_texture_type_unique"
    `);
    console.log('✅ mc_textures 唯一约束已删除');
  } catch (error) {
    console.log('ℹ️  约束不存在，无需回滚');
  }
};
