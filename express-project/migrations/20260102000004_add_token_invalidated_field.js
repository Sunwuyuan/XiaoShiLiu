exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('yggdrasil_tokens', 'is_temporarily_invalidated');
  
  if (!hasColumn) {
    await knex.schema.table('yggdrasil_tokens', (table) => {
      table.boolean('is_temporarily_invalidated').defaultTo(false).comment('是否暂时失效(角色改名后设置)').after('expires_at');
      table.index('is_temporarily_invalidated', 'idx_invalidated');
    });
    console.log('✅ yggdrasil_tokens 表已添加 is_temporarily_invalidated 字段');
  } else {
    console.log('ℹ️  is_temporarily_invalidated 字段已存在，跳过');
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('yggdrasil_tokens', 'is_temporarily_invalidated');
  
  if (hasColumn) {
    await knex.schema.table('yggdrasil_tokens', (table) => {
      table.dropIndex('idx_invalidated');
      table.dropColumn('is_temporarily_invalidated');
    });
    console.log('✅ yggdrasil_tokens 表已删除 is_temporarily_invalidated 字段');
  }
};
