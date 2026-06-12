/**
 * RedisCacheAdapter - 基于 redis.js 工具的 Redis 缓存适配器
 *
 * 包装 express-project/utils/redis.js 提供的 Redis 操作，
 * 实现与 MemoryCacheAdapter 相同的缓存接口。
 *
 * 特性：
 *   - Redis 不可用时静默失败，返回合理默认值
 *   - 所有方法均为 async，与 redis.js 的异步 API 保持一致
 */

const redis = require('./redis');

class RedisCacheAdapter {
  constructor() {
    // 无需额外初始化，redis.js 模块自行管理连接
  }

  // ==================== 基础缓存操作 ====================

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} [ttlSeconds] - 过期时间（秒），默认 300 秒
   * @returns {Promise<boolean>}
   */
  async set(key, value, ttlSeconds) {
    try {
      return await redis.setCache(key, value, ttlSeconds || 300);
    } catch (error) {
      console.error('[RedisCacheAdapter] set 失败:', error.message);
      return false;
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise<any|null>}
   */
  async get(key) {
    try {
      return await redis.getCache(key);
    } catch (error) {
      console.error('[RedisCacheAdapter] get 失败:', error.message);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>}
   */
  async del(key) {
    try {
      return await redis.delCache(key);
    } catch (error) {
      console.error('[RedisCacheAdapter] del 失败:', error.message);
      return false;
    }
  }

  // ==================== 计数器操作 ====================

  /**
   * 原子递增
   * @param {string} key - 计数器键
   * @param {number} [amount=1] - 递增量
   * @returns {Promise<number|null>}
   */
  async incr(key, amount = 1) {
    try {
      return await redis.incrCounter(key, amount);
    } catch (error) {
      console.error('[RedisCacheAdapter] incr 失败:', error.message);
      return null;
    }
  }

  /**
   * 原子递减
   * @param {string} key - 计数器键
   * @param {number} [amount=1] - 递减量
   * @returns {Promise<number|null>}
   */
  async decr(key, amount = 1) {
    try {
      return await redis.decrCounter(key, amount);
    } catch (error) {
      console.error('[RedisCacheAdapter] decr 失败:', error.message);
      return null;
    }
  }

  // ==================== 集合操作 ====================

  /**
   * 集合添加成员
   * @param {string} key - 集合键
   * @param {...string} members - 成员列表
   * @returns {Promise<boolean>}
   */
  async sadd(key, ...members) {
    try {
      // redis.js 的 sadd 每次只接受单个 member，需逐个添加
      for (const member of members) {
        await redis.sadd(key, member);
      }
      return true;
    } catch (error) {
      console.error('[RedisCacheAdapter] sadd 失败:', error.message);
      return false;
    }
  }

  /**
   * 集合移除成员
   * @param {string} key - 集合键
   * @param {...string} members - 成员列表
   * @returns {Promise<boolean>}
   */
  async srem(key, ...members) {
    try {
      for (const member of members) {
        await redis.srem(key, member);
      }
      return true;
    } catch (error) {
      console.error('[RedisCacheAdapter] srem 失败:', error.message);
      return false;
    }
  }

  /**
   * 判断成员是否在集合中
   * @param {string} key - 集合键
   * @param {string} member - 成员
   * @returns {Promise<boolean>}
   */
  async sismember(key, member) {
    try {
      return await redis.sismember(key, member);
    } catch (error) {
      console.error('[RedisCacheAdapter] sismember 失败:', error.message);
      return false;
    }
  }

  /**
   * 获取集合全部成员
   * @param {string} key - 集合键
   * @returns {Promise<string[]>}
   */
  async smembers(key) {
    try {
      return await redis.smembers(key);
    } catch (error) {
      console.error('[RedisCacheAdapter] smembers 失败:', error.message);
      return [];
    }
  }

  // ==================== 过期与可用性 ====================

  /**
   * 设置过期时间
   * @param {string} key - 缓存键
   * @param {number} ttlSeconds - 过期时间（秒）
   * @returns {Promise<boolean>}
   */
  async expire(key, ttlSeconds) {
    try {
      if (!redis.isRedisAvailable()) return false;
      const client = redis.getRedisClient();
      await client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      console.error('[RedisCacheAdapter] expire 失败:', error.message);
      return false;
    }
  }

  /**
   * 检查 Redis 缓存是否可用
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return redis.isRedisAvailable();
  }
}

module.exports = RedisCacheAdapter;
