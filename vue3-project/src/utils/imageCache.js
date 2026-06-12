import { ref, reactive } from 'vue'

/**
 * 图片本地缓存工具（基于 IndexedDB）
 *
 * 原理：
 *   首次加载图片 → fetch → 存入 IndexedDB → 返回 Object URL
 *   再次访问     → 查 IndexedDB 命中 → 直接返回 Object URL（秒开）
 *   缓存过期     → 删除旧记录 → 重新 fetch
 */

const DB_NAME = 'image_cache_db'
const DB_VERSION = 1
const STORE_NAME = 'images'

// 缓存有效期：7 天（毫秒）
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000

let dbInstance = null

// 打开/创建 IndexedDB
function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onerror = () => {
      console.error('[ImageCache] 打开数据库失败:', request.error)
      reject(request.error)
    }
  })
}

// 用 URL 生成缓存 key（取 hash 避免过长 key）
function urlToKey(url) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return 'img_' + Math.abs(hash).toString(36)
}

// 清理过期缓存
async function cleanupExpired() {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('timestamp')
    const now = Date.now()
    const range = IDBKeyRange.upperBound(now - CACHE_TTL)

    // 获取过期记录的 keys
    const expiredKeys = await new Promise((resolve, reject) => {
      const req = index.openCursor(range)
      const keys = []
      req.onsuccess = () => {
        const cursor = req.result
        if (cursor) {
          keys.push(cursor.value.key)
          cursor.continue()
        } else {
          resolve(keys)
        }
      }
      req.onerror = () => resolve([])
    })

    // 批量删除
    for (const key of expiredKeys) {
      store.delete(key)
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    // ignore cleanup errors
  }
}

/**
 * 从缓存获取图片，返回 Object URL 或 null
 */
export async function getCachedImage(url) {
  const key = urlToKey(url)
  if (!key) return null

  try {
    const db = await openDB()
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })

    if (!result) return null

    // 检查是否过期
    if (Date.now() - result.timestamp > CACHE_TTL) {
      // 过期则删除并返回 null
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      return null
    }

    // 返回 Object URL
    return URL.createObjectURL(result.blob)
  } catch (e) {
    return null
  }
}

/**
 * 将图片写入缓存
 */
export async function setCachedImage(url, blob) {
  const key = urlToKey(url)
  if (!key || !blob) return

  try {
    const db = await openDB()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put({
        key,
        blob,
        timestamp: Date.now(),
        originalUrl: url
      })
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } catch (e) {
    console.warn('[ImageCache] 写入缓存失败:', e)
  }
}

/**
 * 加载图片（带缓存逻辑）
 * @param {string} url - 图片原始 URL
 * @returns {Promise<string>} - 可直接用于 img src 的 URL（Object URL 或原始 URL）
 */
export async function loadImage(url) {
  if (!url) return url

  // data: / blob: / 本地资源 不缓存
  if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) {
    return url
  }

  // 1. 先查缓存
  const cachedUrl = await getCachedImage(url)
  if (cachedUrl) return cachedUrl

  // 2. 缓存未命中，fetch 并存储
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob = await response.blob()

    // 写入缓存
    await setCachedImage(url, blob)

    // 返回 Object URL
    return URL.createObjectURL(blob)
  } catch (e) {
    console.warn('[ImageCache] 加载图片失败:', url, e)
    // 降级返回原始 URL
    return url
  }
}

/**
 * Vue composable: useImageCache
 * 用于在组件中获取带缓存的图片 URL
 */
export function useImageCache() {
  const loadingUrls = ref(new Map())

  /**
   * 获取带缓存的图片 URL
   * @param {string} url - 原始图片地址
   * @returns {Ref<string>} - 响应式的图片 URL（初始为空字符串或占位图）
   */
  function getCachedUrl(url) {
    const state = reactive({
      url: '',
      loading: true,
      error: false
    })

    if (!url) {
      state.url = ''
      state.loading = false
      return state
    }

    // data:/blob:/本地资源 直接返回
    if (url.startsWith('data:') || url.startsWith('blob:') || !url.startsWith('http')) {
      state.url = url
      state.loading = false
      return state
    }

    // 检查是否已有正在进行的请求（去重）
    if (loadingUrls.value.has(url)) {
      const existing = loadingUrls.value.get(url)
      existing.watchers.push(state)
      return state
    }

    const request = { watchers: [state] }
    loadingUrls.value.set(url, request)

    // 异步加载
    ;(async () => {
      try {
        // 先查缓存
        const cachedUrl = await getCachedImage(url)
        if (cachedUrl) {
          request.watchers.forEach(w => {
            w.url = cachedUrl
            w.loading = false
          })
          loadingUrls.value.delete(url)
          return
        }

        // 未命中则 fetch
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()

        // 写入缓存
        await setCachedImage(url, blob)

        // 生成 Object URL
        const objectUrl = URL.createObjectURL(blob)
        request.watchers.forEach(w => {
          w.url = objectUrl
          w.loading = false
        })
      } catch (e) {
        console.warn('[ImageCache] 加载失败:', url, e)
        request.watchers.forEach(w => {
          w.url = url // 降级用原 URL
          w.loading = false
          w.error = true
        })
      } finally {
        loadingUrls.value.delete(url)
      }
    })()

    return state
  }

  /**
   * 预加载一组图片到缓存
   */
  async function preloadImages(urls) {
    const validUrls = [...new Set(urls)].filter(u =>
      u && u.startsWith('http') && !u.startsWith('data:')
    )
    await Promise.allSettled(validUrls.map(loadImage))
  }

  /**
   * 清除指定图片的缓存
   */
  async function removeCache(url) {
    const key = urlToKey(url)
    if (!key) return
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(key)
      await new Promise(r => { tx.oncomplete = r })
    } catch (e) {
      // ignore
    }
  }

  /**
   * 清空所有缓存
   */
  async function clearAllCache() {
    try {
      const db = await openDB()
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).clear()
      await new Promise(r => { tx.oncomplete = r })
    } catch (e) {
      // ignore
    }
  }

  return {
    getCachedUrl,
    preloadImages,
    removeCache,
    clearAllCache
  }
}

// 页面启动时清理一次过期缓存
if (typeof window !== 'undefined' && window.indexedDB) {
  setTimeout(cleanupExpired, 3000)
}
