<template>
  <div class="auth-modal-overlay" :class="{ 'animating': isAnimating }" v-click-outside.mousedown="closeModal"
    v-escape-key="closeModal">
    <div class="auth-modal" @click.stop :class="{ 'scale-in': isAnimating }">
      <button class="close-btn" @click="closeModal">
        <SvgIcon name="close" />
      </button>

      <div class="auth-content">
        <div class="auth-header">
          <h2 class="auth-title">登录小石榴</h2>
          <p class="auth-subtitle">欢迎回来！</p>
        </div>

        <div v-if="submitError" class="submit-error">
          {{ submitError }}
        </div>

        <div v-if="unifiedMessage" class="unified-message">
          <SvgIcon name="alert" width="16" height="16" />
          {{ unifiedMessage }}
        </div>

        <!-- 云认证登录按钮 - 使用原有按钮风格 -->
        <button class="submit-btn" :disabled="isSubmitting" :class="{ 'loading': isSubmitting }" @click="handleLogtoLogin">
          <span v-if="isSubmitting" class="loading-spinner"></span>
          {{ isSubmitting ? '加载中...' : '使用 云认证 登录' }}
        </button>
      </div>
    </div>

    <MessageToast v-if="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import MessageToast from '@/components/MessageToast.vue'
import { logtoApi } from '@/api/index.js'
import { useUserStore } from '@/stores/user.js'
import { useScrollLock } from '@/composables/useScrollLock'

const emit = defineEmits(['close', 'success'])

const userStore = useUserStore()

const { lock, unlock } = useScrollLock()

const isAnimating = ref(false)
const isSubmitting = ref(false)
const submitError = ref('')
const unifiedMessage = ref('')

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// 点击登录
const handleLogtoLogin = async () => {
  try {
    isSubmitting.value = true
    submitError.value = ''
    unifiedMessage.value = ''

    console.log('正在获取 Logto 登录地址...')
    const response = await logtoApi.getSignInUrl()
    if (response.success && response.data && response.data.signInUrl) {
      console.log('跳转到 Logto 登录地址:', response.data.signInUrl)
      window.location.href = response.data.signInUrl
    } else {
      throw new Error(response.message || '获取登录地址失败')
    }
  } catch (error) {
    console.error('登录失败:', error)
    if (error && error.message && error.message.includes('配置')) {
      unifiedMessage.value = error.message
    } else {
      submitError.value = error.message || '网络错误，请稍后重试'
    }
  } finally {
    isSubmitting.value = false
  }
}

const showToastMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

const handleToastClose = () => {
  showToast.value = false
}

const closeModal = () => {
  isAnimating.value = false
  unlock()
  setTimeout(() => {
    emit('close')
  }, 200)
}

onMounted(() => {
  lock()
  isAnimating.value = true
})
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  opacity: 0;
  transition: opacity 0.2s ease;
  width: 100vw;
  height: 100%;
}

.auth-modal-overlay.animating {
  opacity: 1;
}

.auth-modal {
  background: var(--bg-color-primary);
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  transform: scale(0.9);
  transition: transform 0.2s ease;
  box-shadow: 0 20px 40px var(--shadow-color);
}

.auth-modal.scale-in {
  transform: scale(1);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  background: var(--bg-color-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: var(--text-color-primary);
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: var(--text-color-secondary);
  transform: scale(1.1);
  transition: all 0.2s ease;
}

.auth-content {
  padding: 32px;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color-primary);
  margin: 0 0 8px 0;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
}

.submit-error {
  padding: 12px;
  background: rgba(var(--primary-color), 0.1);
  border: 1px solid var(--primary-color);
  border-radius: 8px;
  color: var(--primary-color);
  font-size: 14px;
  text-align: center;
  margin-bottom: 16px;
}

.unified-message {
  display: flex;
  flex-direction: row;
  align-items: center;
  color: var(--primary-color);
  font-size: 14px;
  margin-bottom: 16px;
  text-align: center;
  justify-content: center;
  gap: 8px;
}

.submit-btn {
  padding: 14px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  width: 100%;
}

.submit-btn:hover {
  background-color: var(--primary-color-dark);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

@media (max-width: 480px) {
  .auth-content {
    padding: 24px;
  }

  .auth-title {
    font-size: 20px;
  }
}
</style>
