const { getDB } = require('./db');

/**
 * 获取表的记录总数
 * @param {string} table - 表名
 * @param {Object} where - WHERE条件（可选）
 * @returns {Promise<number>} 记录总数
 */
async function getTableCount(table, where = {}) {
  try {
    const db = getDB();
    const result = await db(table)
      .where(where)
      .count('* as count')
      .first();
    return parseInt(result.count);
  } catch (error) {
    console.error(`获取${table}表记录数失败:`, error.message);
    throw error;
  }
}

/**
 * 获取多个表的统计信息 - 使用 Promise.all 并行查询替代 N+1 循环
 * @param {Array} tables - 表配置数组，每个元素包含 {table, alias, where?}
 * @returns {Promise<Object>} 统计结果对象
 */
async function getMultipleTableStats(tables) {
  try {
    // 使用 Promise.all 并行执行所有查询，避免 N+1 问题
    const countPromises = tables.map(config => {
      const { table, alias, where = {} } = config;
      return getTableCount(table, where).then(count => ({ alias: alias || table, count }));
    });

    const results = await Promise.all(countPromises);

    // 将结果转换为对象
    const stats = {};
    results.forEach(({ alias, count }) => {
      stats[alias] = count;
    });

    return stats;
  } catch (error) {
    console.error('获取多表统计信息失败:', error.message);
    throw error;
  }
}

/**
 * 获取分页查询的总数和数据 - 优化为单次查询
 * @param {string} table - 表名
 * @param {Object} options - 查询选项
 * @param {string} options.fields - 查询字段，默认为 '*'
 * @param {Object} options.where - WHERE条件对象
 * @param {string} options.orderBy - 排序条件，默认 'id DESC'
 * @param {number} options.page - 页码，默认1
 * @param {number} options.limit - 每页数量，默认20
 * @returns {Promise<Object>} 包含total和data的对象
 */
async function getPaginatedData(table, options = {}) {
  const {
    fields = '*',
    where = {},
    orderBy = 'id',
    orderDir = 'desc',
    page = 1,
    limit = 20
  } = options;

  try {
    const db = getDB();

    // 获取分页数据
    const offset = (page - 1) * limit;

    // 使用窗口函数或子查询在单次查询中获取总数（PostgreSQL 支持）
    // 对于 Knex，我们仍然需要两次查询，但可以优化为并行执行
    const [countResult, data] = await Promise.all([
      db(table)
        .where(where)
        .count('* as count')
        .first(),
      db(table)
        .where(where)
        .select(fields === '*' ? '*' : fields.split(','))
        .orderBy(orderBy, orderDir)
        .limit(limit)
        .offset(offset)
    ]);

    const total = parseInt(countResult.count);

    return {
      total,
      data,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('获取分页数据失败:', error.message);
    throw error;
  }
}

module.exports = {
  getTableCount,
  getMultipleTableStats,
  getPaginatedData
};
