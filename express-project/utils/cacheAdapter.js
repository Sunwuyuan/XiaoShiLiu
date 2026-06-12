/**
 * CacheAdapter - 统一缓存接口 + 工厂函数
 *
 * 提供统一的缓存抽象层，通过工厂函数根据配置创建对应的缓存实例：
 *   - type === 'memory' → MemoryCacheAdapter（基于 Map 的内存缓存）
 *   - type === 'redis' 或默认 → RedisCacheAdapter（基于 Redis 的缓存）
 *
 * 使用示例：
 *   const config = { cache: { type: 'memory' } };
 *   const cache = createCacheAdapter(config);
 *   await cache.set('user:1', { name: 'test' }, 300);
 *   const user = await cache.get('user:1');
 */

const MemoryCacheAdapter = require('./memoryCache');
const RedisCacheAdapter = require('./redisCacheAdapter');

/**
 * 根据配置创建缓存适配器实例
 *
 * @param {Object} config - 应用配置对象
 * @param {Object} [config.cache] - 缓存配置
 * @param {string} [config.cache.type='redis'] - 缓存类型，'memory' 或 'redis'
 * @returns {MemoryCacheAdapter|RedisCacheAdapter} 缓存适配器实例
 *
 * @example
 * // 使用内存缓存
 * const cache = createCacheAdapter({ cache: { type: 'memory' } });
 *
 * @example
 * // 使用 Redis 缓存（默认）
 * const cache = createCacheAdapter({ cache: { type: 'redis' } });
 * const cache = createCacheAdapter({}); // 默认也是 Redis
 */
function createCacheAdapter(config) {
  const cacheType = (config && config.cache && config.cache.type) || 'redis';

  switch (cacheType) {
    case 'memory':
      console.log('[CacheAdapter] 使用内存缓存 (MemoryCacheAdapter)');
      return new MemoryCacheAdapter();

    case 'redis':
    default:
      console.log('[CacheAdapter] 使用 Redis 缓存 (RedisCacheAdapter)');
      return new RedisCacheAdapter();
  }
}

module.exports = {
  createCacheAdapter
};
