<template>
  <div class="logto-callback">
    <div class="callback-container">
      <div class="loading-content" v-if="isLoading">
        <div class="loading-spinner"></div>
        <p class="loading-text">{{ loadingText }}</p>
      </div>
      <div class="error-content" v-else-if="error">
        <SvgIcon name="alert" class="error-icon" />
        <p class="error-text">{{ error }}</p>
        <button class="retry-btn" @click="goHome">返回首页</button>
      </div>
      <div class="success-content" v-else-if="success">
        <SvgIcon name="tick" class="success-icon" />
        <p class="success-text">登录成功！</p>
        <p class="redirect-text">即将跳转...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import { useUserStore } from '@/stores/user.js'
import { logtoApi } from '@/api/index.js'
import { isTauri, getDeepLinkUrl, parseCallbackParams, clearDeepLinkUrl, DEEP_LINK_SCHEME } from '@/utils/tauri.js'

const router = useRouter()
const userStore = useUserStore()

const isLoading = ref(true)
const loadingText = ref('正在登录...')
const error = ref('')
const success = ref(false)

const goHome = () => {
  router.push('/')
}

const processCallback = async (code, state, redirectUri) => {
  loadingText.value = '正在获取用户信息...'

  // 调用后端回调接口
  console.log('开始调用后端 callback 接口...')
  const response = await logtoApi.handleCallback({ code, state, redirectUri })

  console.log('后端响应:', response)

  if (response.success && response.data) {
    loadingText.value = '正在同步登录状态...'

    console.log('调用 userStore.loginWithLogto...')

    // 使用专门的 Logto 登录处理方法
    const result = await userStore.loginWithLogto(response.data)

    console.log('loginWithLogto 结果:', result)

    if (result.success) {
      success.value = true
      isLoading.value = false

      console.log('当前登录状态检查:', {
        userInfo: !!userStore.userInfo,
        isLoggedIn: userStore.isLoggedIn
      })

      console.log('localStorage 检查:', {
        userInfo: !!localStorage.getItem('userInfo')
      })

      console.log('等待 1.5 秒后跳转...')

      setTimeout(() => {
        console.log('跳转到首页...')
        router.push('/')
      }, 1500)
    } else {
      throw new Error(result.message)
    }
  } else {
    throw new Error(response.message || '登录失败')
  }
}

const handleCallback = async () => {
  try {
    console.log('=== Logto 回调开始处理 ===')

    let code = null
    let state = null
    // 先声明变量，确保后续使用时已定义
    let redirectUri = window.location.origin + '/callback'

    if (isTauri()) {
      // === Tauri 模式：优先从深链接获取参数 ===
      console.log('Tauri 环境：检查深链接回调...')
      const deepLinkUrl = await getDeepLinkUrl()
      if (deepLinkUrl) {
        console.log('发现深链接回调:', deepLinkUrl)
        clearDeepLinkUrl()
        const params = parseCallbackParams(deepLinkUrl)
        if (params && params.code) {
          code = params.code
          state = params.state
          redirectUri = DEEP_LINK_SCHEME
        }
      }

      // 深链接没有参数时，回退到 URL 参数（兼容直接访问 /callback 路由的情况）
      if (!code) {
        console.log('无深链接参数，回退到 URL 参数解析')
        const urlParams = new URLSearchParams(window.location.search)
        code = urlParams.get('code')
        state = urlParams.get('state')
        redirectUri = window.location.origin + '/callback'
      }
    } else {
      // === Web 浏览器模式：从 URL 参数获取 ===
      const urlParams = new URLSearchParams(window.location.search)
      code = urlParams.get('code')
      state = urlParams.get('state')
    }

    console.log('回调参数:', { code: !!code, state: !!state, redirectUri })

    if (!code) {
      throw new Error('缺少授权码')
    }

    await processCallback(code, state, redirectUri)
  } catch (err) {
    console.error('Logto 回调处理失败:', err)
    error.value = err.message || '登录失败，请稍后重试'
    isLoading.value = false
  }
}

onMounted(() => {
  console.log('LogtoCallback 组件已挂载')
  handleCallback()
})
</script>

<style scoped>
.logto-callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-color-primary);
  padding: 20px;
}

.callback-container {
  text-align: center;
  max-width: 400px;
}

.loading-content,
.error-content,
.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: var(--text-color-secondary);
}

.error-icon,
.success-icon {
  width: 60px;
  height: 60px;
}

.error-icon {
  color: #f4212e;
}

.success-icon {
  color: var(--primary-color);
}

.error-text,
.success-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.redirect-text {
  font-size: 14px;
  color: var(--text-color-secondary);
}

.retry-btn {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: var(--primary-color);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: var(--primary-color-dark);
}
</style>
