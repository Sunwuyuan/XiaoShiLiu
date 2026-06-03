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

    // 使用事务包裹所有操作，确保原子性
    await db.transaction(async (trx) => {
      for (const col of columnsToCheck) {
        const exists = await trx.schema.hasColumn('admin', col.name);

        if (!exists) {
          await trx.schema.table('admin', (table) => {
            switch(col.type) {
              case 'string':
                table.string(col.name, col.length || 255).defaultTo(null);
                break;
              case 'json':
                table.json(col.name).defaultTo(null);
                break;
              case 'boolean':
                table.boolean(col.name).defaultTo(col.default || false);
                break;
              case 'bigint':
                table.bigInteger(col.name).defaultTo(null);
                break;
              case 'timestamp':
                table.timestamp(col.name).defaultTo(trx.fn.now());
                break;
            }
          });
          console.log(`添加字段: ${col.name}`);
        }
      }

      // 在事务内查询和更新
      const admin = await trx('admin').where('is_super', 1).first();

      if (!admin) {
        // 使用子查询获取最小 id
        const minIdResult = await trx('admin').min('id as min_id').first();
        const minId = minIdResult ? minIdResult.min_id : null;

        if (minId) {
          await trx('admin')
            .where('id', minId)
            .update({
              is_super: 1,
              nickname: trx.raw('COALESCE(nickname, username)')
            });
        }
      }
    });

    console.log('Admin 表迁移完成');
    return true;
  } catch (error) {
    console.error('Admin 表迁移失败:', error.message);
    throw error; // 向上抛出错误，让调用方知道迁移失败
  }
}

module.exports = { checkAndMigrateAdminTable };
