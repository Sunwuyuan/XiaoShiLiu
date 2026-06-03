const knex = require('knex');
const getConfig = require('../knexfile');

let db = null;

/**
 * 获取数据库连接实例（单例模式）
 * 添加连接健康检查和错误处理
 */
const getDB = () => {
  if (!db) {
    const config = getConfig();
    db = knex(config);

    // 监听查询错误
    db.on('query-error', (error, query) => {
      console.error('[DB] 查询错误:', error.message);
      console.error('[DB] 问题查询:', query.sql);
    });

    // 监听连接错误
    db.on('error', (error) => {
      console.error('[DB] 连接错误:', error.message);
      // 如果连接断开，重置实例以便下次重新连接
      if (error.code === 'ECONNRESET' || error.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('[DB] 连接已断开，将在下次请求时重新连接');
        db = null;
      }
    });
  }
  return db;
};

/**
 * 销毁数据库连接
 */
const destroyDB = async () => {
  if (db) {
    try {
      await db.destroy();
    } catch (error) {
      console.error('[DB] 销毁连接失败:', error.message);
    } finally {
      db = null;
    }
  }
};

/**
 * 健康检查 - 测试数据库连接
 */
const healthCheck = async () => {
  try {
    const instance = getDB();
    await instance.raw('SELECT 1');
    return { healthy: true };
  } catch (error) {
    console.error('[DB] 健康检查失败:', error.message);
    // 重置连接以便下次重新连接
    db = null;
    return { healthy: false, error: error.message };
  }
};

module.exports = { getDB, destroyDB, healthCheck };
