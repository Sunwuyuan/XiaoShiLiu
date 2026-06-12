/**
 * MemoryCacheAdapter - 基于 JavaScript Map 的内存缓存实现
 *
 * 特性：
 *   - set/get/del 基础缓存操作
 *   - incr/decr 原子计数器（单线程无需锁）
 *   - sadd/srem/sismember/smembers 集合操作（Map 中存 Set）
 *   - TTL 过期自动清理（setTimeout）
 *   - 所有方法出错时 console.error 并返回合理默认值，不抛错
 *   - 提供 destroy() 方法清除所有定时器和数据
 */

class MemoryCacheAdapter {
  constructor() {
    /** @type {Map<string, any>} 数据存储 */
    this._store = new Map();
    /** @type {Map<string, Set>} 集合存储 */
    this._sets = new Map();
    /** @type {Map<string, NodeJS.Timeout>} 过期定时器 */
    this._timers = new Map();
  }

  // ==================== 基础缓存操作 ====================

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} [ttlSeconds] - 过期时间（秒），不传则永不过期
   */
  set(key, value, ttlSeconds) {
    try {
      this._clearTimer(key);
      this._store.set(key, value);

      if (ttlSeconds && ttlSeconds > 0) {
        const timer = setTimeout(() => {
          this._store.delete(key);
          this._sets.delete(key);
          this._timers.delete(key);
        }, ttlSeconds * 1000);
        // 不引用 unref，保持与 Node.js 默认行为一致
        this._timers.set(key, timer);
      }
    } catch (error) {
      console.error('[MemoryCache] set 失败:', error.message);
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {any|null} 缓存值，不存在返回 null
   */
  get(key) {
    try {
      return this._store.has(key) ? this._store.get(key) : null;
    } catch (error) {
      console.error('[MemoryCache] get 失败:', error.message);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  del(key) {
    try {
      this._clearTimer(key);
      this._store.delete(key);
      this._sets.delete(key);
    } catch (error) {
      console.error('[MemoryCache] del 失败:', error.message);
    }
  }

  // ==================== 计数器操作 ====================

  /**
   * 原子递增
   * @param {string} key - 计数器键
   * @param {number} [amount=1] - 递增量
   * @returns {number} 递增后的值
   */
  incr(key, amount = 1) {
    try {
      const current = this._store.has(key) ? Number(this._store.get(key)) || 0 : 0;
      const newValue = current + amount;
      this._store.set(key, newValue);
      return newValue;
    } catch (error) {
      console.error('[MemoryCache] incr 失败:', error.message);
      return 0;
    }
  }

  /**
   * 原子递减
   * @param {string} key - 计数器键
   * @param {number} [amount=1] - 递减量
   * @returns {number} 递减后的值
   */
  decr(key, amount = 1) {
    try {
      const current = this._store.has(key) ? Number(this._store.get(key)) || 0 : 0;
      const newValue = current - amount;
      this._store.set(key, newValue);
      return newValue;
    } catch (error) {
      console.error('[MemoryCache] decr 失败:', error.message);
      return 0;
    }
  }

  // ==================== 集合操作 ====================

  /**
   * 集合添加成员
   * @param {string} key - 集合键
   * @param {...string} members - 成员列表
   */
  sadd(key, ...members) {
    try {
      if (!this._sets.has(key)) {
        this._sets.set(key, new Set());
      }
      const set = this._sets.get(key);
      members.forEach((member) => set.add(String(member)));
    } catch (error) {
      console.error('[MemoryCache] sadd 失败:', error.message);
    }
  }

  /**
   * 集合移除成员
   * @param {string} key - 集合键
   * @param {...string} members - 成员列表
   */
  srem(key, ...members) {
    try {
      if (!this._sets.has(key)) return;
      const set = this._sets.get(key);
      members.forEach((member) => set.delete(String(member)));
    } catch (error) {
      console.error('[MemoryCache] srem 失败:', error.message);
    }
  }

  /**
   * 判断成员是否在集合中
   * @param {string} key - 集合键
   * @param {string} member - 成员
   * @returns {boolean}
   */
  sismember(key, member) {
    try {
      if (!this._sets.has(key)) return false;
      return this._sets.get(key).has(String(member));
    } catch (error) {
      console.error('[MemoryCache] sismember 失败:', error.message);
      return false;
    }
  }

  /**
   * 获取集合全部成员
   * @param {string} key - 集合键
   * @returns {string[]}
   */
  smembers(key) {
    try {
      if (!this._sets.has(key)) return [];
      return Array.from(this._sets.get(key));
    } catch (error) {
      console.error('[MemoryCache] smembers 失败:', error.message);
      return [];
    }
  }

  // ==================== 过期与可用性 ====================

  /**
   * 设置过期时间
   * @param {string} key - 缓存键
   * @param {number} ttlSeconds - 过期时间（秒）
   */
  expire(key, ttlSeconds) {
    try {
      if (!this._store.has(key) && !this._sets.has(key)) return;
      this._clearTimer(key);

      const timer = setTimeout(() => {
        this._store.delete(key);
        this._sets.delete(key);
        this._timers.delete(key);
      }, ttlSeconds * 1000);
      this._timers.set(key, timer);
    } catch (error) {
      console.error('[MemoryCache] expire 失败:', error.message);
    }
  }

  /**
   * 检查缓存是否可用
   * @returns {boolean} 内存缓存始终可用
   */
  isAvailable() {
    return true;
  }

  // ==================== 生命周期管理 ====================

  /**
   * 清除指定键的过期定时器
   * @param {string} key - 缓存键
   * @private
   */
  _clearTimer(key) {
    if (this._timers.has(key)) {
      clearTimeout(this._timers.get(key));
      this._timers.delete(key);
    }
  }

  /**
   * 销毁缓存实例，清除所有定时器和数据
   */
  destroy() {
    this._timers.forEach((timer) => clearTimeout(timer));
    this._store.clear();
    this._sets.clear();
    this._timers.clear();
  }
}

module.exports = MemoryCacheAdapter;
