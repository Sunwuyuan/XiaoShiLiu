const { getDB } = require('./db');

async function checkAndMigrateAdminTable() {
  try {
    console.log('检查 admin 表结构...');
    const db = getDB();

    const columnsToCheck = [
      { name: 'logto_id', type: 'string', length: 128 },
      { name: 'permissions', type: 'json' },
      { name: 'is_super', type: 'boolean', default: false },
      { name: 'created_by', type: 'bigint' },
      { name: 'updated_at', type: 'timestamp' },
      { name: 'nickname', type: 'string', length: 100 }
    ];

    for (const col of columnsToCheck) {
      const exists = await db.schema.hasColumn('admin', col.name);
      
      if (!exists) {
        await db.schema.table('admin', (table) => {
          switch(col.type) {
            case 'string':
              table.string(col.name, col.length || 255).defaultTo(null).alter();
              break;
            case 'json':
              table.json(col.name).defaultTo(null).alter();
              break;
            case 'boolean':
              table.boolean(col.name).defaultTo(col.default || false).alter();
              break;
            case 'bigint':
              table.bigInteger(col.name).defaultTo(null).alter();
              break;
            case 'timestamp':
              table.timestamp(col.name).defaultTo(db.fn.now()).alter();
              break;
          }
        });
        console.log(`添加字段: ${col.name}`);
      }
    }

    const admin = await db('admin').where('is_super', 1).first();

    if (!admin) {
      await db('admin')
        .where('id', db('admin').min('id'))
        .update({
          is_super: 1,
          nickname: db.raw('COALESCE(nickname, username)')
        });
    }

    console.log('Admin 表迁移完成');
    
    return true;
  } catch (error) {
    console.error('Admin 表迁移失败:', error.message);
    return false;
  }
}

module.exports = { checkAndMigrateAdminTable };
