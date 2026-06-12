/**
 * Tauri 桌面端工具函数
 * 用于检测 Tauri 环境、打开系统浏览器、处理深链接回调等
 */

// 是否运行在 Tauri 环境中（桌面端 + 移动端）
export const isTauri = () => {
  return '__TAURI_INTERNALS__' in window
}

// 是否运行在 Tauri 桌面端（Windows/macOS/Linux）—— 支持深链接协议回调
// 通过 User-Agent 简单检测移动端，避免依赖 @tauri-apps/api/os
export const isTauriDesktop = async () => {
  if (!isTauri()) return false
  // 移动端 UA 通常包含 Android、iPhone、iPad、Mobile 等
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua)
  return !isMobile
}

// OAuth 回调使用的自定义协议（与 Logto 控制台配置的 Redirect URI 一致）
export const DEEP_LINK_SCHEME = 'dynamic://callback'

/**
 * 在系统默认浏览器中打开 URL（仅 Tauri 桌面端有效）
 * 非 Tauri 环境或移动端则回退到 window.location.href
 */
export const openInBrowser = async (url) => {
  if (isTauri()) {
    const desktop = await isTauriDesktop()
    if (desktop) {
      const { open } = await import('@tauri-apps/plugin-shell')
      await open(url)
      return
    }
    // 移动端走 WebView 内跳转
  }
  window.location.href = url
}

/**
 * 获取 Tauri 深链接回调 URL
 * 用于 OAuth 登录完成后，浏览器通过自定义协议回调到应用
 */
export const getDeepLinkUrl = async () => {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke('get_deep_link_url')
  } catch {
    return null
  }
}

/**
 * 清除已消费的深链接 URL
 */
export const clearDeepLinkUrl = async () => {
  if (!isTauri()) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('clear_deep_link_url')
  } catch {
    // ignore
  }
}

/**
 * 监听深链接回调事件
 * 浏览器完成 OAuth 认证后通过 dynamic:// 协议回调时触发
 * @param {function} callback - 收到回调时的处理函数，参数为完整 URL 字符串
 * @returns {Promise<Function>} 返回 unlisten 函数，用于取消监听
 */
export const onDeepLinkReceived = async (callback) => {
  if (!isTauri()) return () => {}
  try {
    const { listen } = await import('@tauri-apps/api/event')
    return await listen('deep-link-received', (event) => {
      callback(event.payload)
    })
  } catch {
    return () => {}
  }
}

/**
 * 等待深链接回调（用于登录流程，仅桌面端有效）
 * 同时检查已存储的 URL 和实时事件
 * @param {number} timeoutMs - 超时时间（毫秒），默认 2 分钟
 * @returns {Promise<string|null>} 回调 URL 或超时返回 null
 */
export const waitForDeepLinkCallback = (timeoutMs = 120000) => {
  return new Promise(async (resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(null)
      }
    }, timeoutMs)

    // 1. 先检查是否已经有存储的回调 URL（应用被重新激活时可能已经存入）
    const storedUrl = await getDeepLinkUrl()
    if (storedUrl) {
      clearTimeout(timer)
      settled = true
      resolve(storedUrl)
      return
    }

    // 2. 监听实时事件
    const unlisten = await onDeepLinkReceived((url) => {
      if (!settled) {
        clearTimeout(timer)
        settled = true
        resolve(url)
      }
    })

    // 超时时清理监听
    setTimeout(() => {
      if (!settled) {
        unlisten?.()
      }
    }, timeoutMs + 1000)
  })
}

/**
 * 从深链接 URL 中解析 OAuth 回调参数
 * @param {string} url - 完整的深链接 URL，如 dynamic://callback?code=xxx&state=yyy
 * @returns {{ code: string, state: string } | null}
 */
export const parseCallbackParams = (url) => {
  if (!url) return null
  try {
    const queryString = url.includes('?') ? url.split('?')[1] : ''
    const params = new URLSearchParams(queryString)
    const code = params.get('code')
    const state = params.get('state')
    if (code) return { code, state }
    return null
  } catch {
    return null
  }
}
