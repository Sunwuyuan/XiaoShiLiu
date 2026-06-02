exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'logto_id');
  
  if (!hasColumn) {
    await knex.schema.table('users', (table) => {
      table.string('logto_id', 128).unique().defaultTo(null).comment('Logto 用户唯一标识符').after('id');
    });
    console.log('✅ users 表已添加 logto_id 字段');
  } else {
    console.log('ℹ️  logto_id 字段已存在，跳过');
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'logto_id');
  
  if (hasColumn) {
    await knex.schema.table('users', (table) => {
      table.dropColumn('logto_id');
    });
    console.log('✅ users 表已删除 logto_id 字段');
  }
};
