exports.up = async function(knex) {
  const columns = [
    { name: 'logto_id', type: 'string', length: 128, unique: true, comment: 'Logto用户唯一ID' },
    { name: 'permissions', type: 'jsonb', comment: '权限列表' },
    { name: 'is_super', type: 'boolean', default: false, comment: '是否超级管理员' },
    { name: 'created_by', type: 'bigInteger', comment: '创建者管理员ID' },
    { name: 'updated_at', type: 'timestamp', comment: '更新时间' },
    { name: 'nickname', type: 'string', length: 100, comment: '昵称' }
  ];

  for (const col of columns) {
    const hasColumn = await knex.schema.hasColumn('admin', col.name);
    
    if (!hasColumn) {
      await knex.schema.table('admin', (table) => {
        let column;
        
        switch (col.type) {
          case 'string':
            column = table.string(col.name, col.length || 255).defaultTo(null).comment(col.comment || '');
            break;
          case 'jsonb':
            column = table.jsonb(col.name).defaultTo(null).comment(col.comment || '');
            break;
          case 'boolean':
            column = table.boolean(col.name).defaultTo(col.default || false).comment(col.comment || '');
            break;
          case 'bigInteger':
            column = table.bigInteger(col.name).defaultTo(null).comment(col.comment || '');
            break;
          case 'timestamp':
            column = table.timestamp(col.name).defaultTo(knex.fn.now()).comment(col.comment || '');
            break;
        }

        if (col.unique && col.type === 'string') {
          column.unique(`idx_${col.name}`);
        }
      });
      console.log(`✅ admin 表已添加 ${col.name} 字段`);
    } else {
      console.log(`ℹ️  ${col.name} 字段已存在，跳过`);
    }
  }
};

exports.down = async function(knex) {
  const columns = ['logto_id', 'permissions', 'is_super', 'created_by', 'updated_at', 'nickname'];
  
  for (const colName of columns) {
    const hasColumn = await knex.schema.hasColumn('admin', colName);
    
    if (hasColumn) {
      await knex.schema.table('admin', (table) => {
        if (colName === 'logto_id') {
          table.dropIndex('idx_logto_id');
        }
        table.dropColumn(colName);
      });
      console.log(`✅ admin 表已删除 ${colName} 字段`);
    }
  }
};
