<template>
  <button 
    class="logto-login-btn"
    :class="{ loading: isLoading }"
    :disabled="isLoading"
    @click="handleLogin"
  >
    <svg v-if="!isLoading" class="logto-icon" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
    </svg>
    <span v-if="!isLoading" class="btn-text">
      {{ buttonText }}
    </span>
    <div v-else class="loading-spinner"></div>
  </button>
</template>

<script setup>
import { ref, computed } from 'vue'
import { logtoApi } from '@/api/index.js'
import { useUserStore } from '@/stores/user.js'
import {
  isTauri,
  isTauriDesktop,
  openInBrowser,
  waitForDeepLinkCallback,
  parseCallbackParams,
  clearDeepLinkUrl,
  DEEP_LINK_SCHEME,
} from '@/utils/tauri.js'

const props = defineProps({
  buttonText: {
    type: String,
    default: '使用 云认证 登录'
  }
})

const emit = defineEmits(['success', 'error'])

const isLoading = ref(false)
const userStore = useUserStore()

const handleLogin = async () => {
  try {
    isLoading.value = true

    // 获取 Logto 登录 URL
    const response = await logtoApi.getSignInUrl()

    if (response.success && response.data) {
      let signInUrl = response.data.signInUrl

      // 检测是否为 Tauri 桌面端（支持深链接协议回调）
      const desktop = isTauri() ? await isTauriDesktop() : false

      if (desktop) {
        // === Tauri 桌面端模式：打开系统浏览器 + 深链接回调 ===
        signInUrl = replaceRedirectUri(signInUrl, DEEP_LINK_SCHEME)
        console.log('Tauri 桌面端模式：打开系统浏览器登录:', signInUrl)

        await openInBrowser(signInUrl)

        // 等待深链接回调
        const callbackUrl = await waitForDeepLinkCallback(120000)
        if (!callbackUrl) {
          throw new Error('等待登录回调超时，请重试')
        }

        console.log('收到深链接回调:', callbackUrl)
        clearDeepLinkUrl()

        const params = parseCallbackParams(callbackUrl)
        if (!params || !params.code) {
          throw new Error('无效的登录回调参数')
        }

        // 调用后端完成登录
        const cbResponse = await logtoApi.handleCallback({
          code: params.code,
          state: params.state,
          redirect_uri: DEEP_LINK_SCHEME,
        })

        if (cbResponse.success && cbResponse.data) {
          const result = await userStore.loginWithLogto(cbResponse.data)
          if (result.success) {
            emit('success', result)
            return
          }
          throw new Error(result.message)
        }
        throw new Error(cbResponse.message || '登录失败')
      } else {
        // === Web 浏览器模式 / Tauri 移动端模式（原有逻辑）===
        console.log('跳转到 云认证 登录:', response.data.signInUrl)
        window.location.href = response.data.signInUrl
      }
    } else {
      throw new Error(response.message || '获取登录地址失败')
    }
  } catch (error) {
    console.error('Logto 登录失败:', error)
    emit('error', error)
  } finally {
    isLoading.value = false
  }
}

/**
 * 替换 URL 中的 redirect_uri 参数
 */
function replaceRedirectUri(url, newRedirectUri) {
  try {
    const urlObj = new URL(url)
    urlObj.searchParams.set('redirect_uri', newRedirectUri)
    return urlObj.toString()
  } catch {
    return url
  }
}
</script>

<style scoped>
.logto-login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: #1d9bf0;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logto-login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(29, 155, 240, 0.3);
}

.logto-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.logto-icon {
  width: 20px;
  height: 20px;
}

.btn-text {
  font-size: 16px;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
