exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('mc_profiles', 'is_deleted');
  
  if (!hasColumn) {
    await knex.schema.table('mc_profiles', (table) => {
      table.boolean('is_deleted').defaultTo(false).comment('是否已删除(0=正常,1=已软删除)').after('is_banned');
      table.index(['user_id', 'is_deleted'], 'idx_user_deleted');
    });
    console.log('✅ mc_profiles 表已添加 is_deleted 字段');
  } else {
    console.log('ℹ️  is_deleted 字段已存在，跳过');
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('mc_profiles', 'is_deleted');
  
  if (hasColumn) {
    await knex.schema.table('mc_profiles', (table) => {
      table.dropIndex('idx_user_deleted');
      table.dropColumn('is_deleted');
    });
    console.log('✅ mc_profiles 表已删除 is_deleted 字段');
  }
};
