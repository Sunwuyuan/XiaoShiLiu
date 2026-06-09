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
      // 跳转到 Logto 登录页面
      // 在实际部署中，这里应该配置正确的回调处理
      console.log('跳转到 云认证 登录:', response.data.signInUrl)
      
      // 对于 SPA 应用，我们需要处理 OAuth 回调
      // 这里我们打开一个新窗口或者重定向
      window.location.href = response.data.signInUrl
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
