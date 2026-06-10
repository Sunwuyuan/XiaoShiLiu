// 版本检测工具 - build 时注入 __GIT_SHA__，运行时从 GitHub 获取最新版本对比
const BUILD_SHA = typeof __GIT_SHA__ !== 'undefined' ? __GIT_SHA__ : 'dev'
const VERSION_KEY = 'app_version_sha'

// 从当前仓库远程 URL 解析: dy-ci/XiaoShiLiu
const GITHUB_OWNER = 'dy-ci'
const GITHUB_REPO = 'XiaoShiLiu'
const GITHUB_BRANCH = 'master'

/**
 * 获取本地构建版本
 */
export function getBuildVersion() {
  return BUILD_SHA
}

/**
 * 从 GitHub API 获取最新 commit sha
 */
export async function fetchGitHubVersion() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.sha ? data.sha.substring(0, 7) : null
  } catch (err) {
    console.warn('[Version] GitHub API 请求失败:', err)
    return null
  }
}

/**
 * 获取本地存储的版本
 */
export function getStoredVersion() {
  try {
    return localStorage.getItem(VERSION_KEY)
  } catch {
    return null
  }
}

/**
 * 保存版本到本地
 */
export function storeVersion(sha) {
  try {
    localStorage.setItem(VERSION_KEY, sha)
  } catch {
    // ignore
  }
}

/**
 * 检测并处理版本更新
 */
export async function checkVersion() {
  // 开发环境跳过
  if (BUILD_SHA === 'dev') return false

  const latestSha = await fetchGitHubVersion()
  if (!latestSha) return false

  const stored = getStoredVersion()

  // 首次访问
  if (!stored) {
    storeVersion(BUILD_SHA)
    return false
  }

  // 本地已是最新
  if (stored === latestSha) {
    return false
  }

  console.log(`[Version] 检测到新版本: ${stored} -> ${latestSha}`)
  storeVersion(latestSha)
  reloadPage()
  return true
}

/**
 * 刷新页面（清理缓存）
 */
export function reloadPage() {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name))
    }).finally(() => {
      window.location.reload(true)
    })
  } else {
    window.location.reload(true)
  }
}

/**
 * 启动版本轮询检测
 * @param {number} interval - 检测间隔（毫秒），默认 5 分钟
 */
export function startVersionPolling(interval = 5 * 60 * 1000) {
  // 首次检测
  checkVersion()

  // 定时检测
  const timer = setInterval(() => {
    checkVersion()
  }, interval)

  // 页面可见时检测
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion()
    }
  })

  return () => clearInterval(timer)
}

export default {
  getBuildVersion,
  fetchGitHubVersion,
  checkVersion,
  startVersionPolling,
  reloadPage
}
