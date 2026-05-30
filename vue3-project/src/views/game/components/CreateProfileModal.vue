<script setup>
import { ref, computed } from 'vue'
import { gameApi } from '@/api/game'
import messageManager from '@/utils/messageManager'

const props = defineProps({
  maxCount: {
    type: Number,
    default: 3
  },
  currentCount: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['close', 'created'])

const playerName = ref('')
const password = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)
const showPassword = ref(false)

const canCreate = computed(() => props.currentCount < props.maxCount)

const passwordStrength = computed(() => {
  if (!password.value) return null
  
  let strength = 0
  const pwd = password.value

  if (pwd.length >= 8) strength += 20
  if (pwd.length >= 12) strength += 20
  if (/[a-z]/.test(pwd)) strength += 15
  if (/[A-Z]/.test(pwd)) strength += 15
  if (/\d/.test(pwd)) strength += 15
  if (/[^a-zA-Z\d]/.test(pwd)) strength += 15

  return {
    score: Math.min(strength, 100),
    label: strength < 40 ? '弱' : strength < 70 ? '中' : '强',
    color: strength < 40 ? '#ef4444' : strength < 70 ? '#f59e0b' : '#10b981'
  }
})

function validatePlayerName() {
  const name = playerName.value.trim()
  
  if (!name) return '玩家名称不能为空'
  if (name.length < 3 || name.length > 16) return '长度必须在3-16位之间'
  if (/^\d/.test(name)) return '不能以数字开头'
  if (!/^[a-zA-Z0-9_]+$/.test(name)) return '只能包含字母、数字和下划线'
  
  const reservedNames = ['steve', 'alex', 'notch', 'mojang']
  if (reservedNames.includes(name.toLowerCase())) return '该名称为保留名称'

  return null
}

async function handleSubmit() {
  const nameError = validatePlayerName()
  if (nameError) {
    messageManager.error(nameError)
    return
  }

  if (!password.value || password.value.length < 8) {
    messageManager.error('密码长度至少为8位')
    return
  }

  if (password.value !== confirmPassword.value) {
    messageManager.error('两次输入的密码不一致')
    return
  }

  isSubmitting.value = true

  try {
    const res = await gameApi.createProfile({
      player_name: playerName.value.trim(),
      password: password.value
    })

    if (res.success) {
      emit('created', res.data)
      emit('close')
      messageManager.success('角色创建成功！请牢记您的独立密码')
    } else {
      messageManager.error(res.message || '创建失败')
    }
  } catch (error) {
    console.error('创建角色失败:', error)
    
    if (error.response?.data?.message) {
      messageManager.error(error.response.data.message)
    } else {
      messageManager.error('创建失败，请稍后重试')
    }
  } finally {
    isSubmitting.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-container">
      <div class="modal-header">
        <h2>⚔️ 创建游戏角色</h2>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>

      <div class="modal-body">
        <div v-if="!canCreate" class="warning-box">
          ⚠️ 您已达到角色数量上限（{{ currentCount }}/{{ maxCount }}）
        </div>

        <form @submit.prevent="handleSubmit" class="create-form">
          <div class="form-group">
            <label>玩家名称 *</label>
            <input 
              v-model="playerName"
              type="text"
              placeholder="输入3-16位字符（字母/数字/下划线）"
              maxlength="16"
              :disabled="isSubmitting"
            />
            <p v-if="playerName && validatePlayerName()" class="error-text">
              {{ validatePlayerName() }}
            </p>
          </div>

          <div class="form-group">
            <label>独立密码 *</label>
            <div class="password-input-wrapper">
              <input 
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="至少8位（大小写+数字）"
                :disabled="isSubmitting"
              />
              <button 
                type="button" 
                class="toggle-password"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>

            <div v-if="passwordStrength" class="strength-bar">
              <div 
                class="strength-fill"
                :style="{ width: passwordStrength.score + '%', background: passwordStrength.color }"
              ></div>
            </div>
            <p v-if="passwordStrength" class="strength-text" :style="{ color: passwordStrength.color }">
              密码强度: {{ passwordStrength.label }} ({{ passwordStrength.score }}%)
            </p>
          </div>

          <div class="form-group">
            <label>确认密码 *</label>
            <input 
              v-model="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              :disabled="isSubmitting"
            />
            <p v-if="confirmPassword && password !== confirmPassword" class="error-text">
              密码不一致
            </p>
          </div>

          <div class="info-box">
            💡 <strong>重要提示：</strong><br/>
            • 独立密码与社区账户密码不同<br/>
            • 用于MC客户端登录验证<br/>
            • 请妥善保管，忘记后只能修改
          </div>

          <div class="form-actions">
            <button 
              type="button" 
              class="btn btn-secondary" 
              @click="handleClose"
              :disabled="isSubmitting"
            >
              取消
            </button>
            <button 
              type="submit" 
              class="btn btn-primary" 
              :disabled="isSubmitting || !canCreate"
            >
              {{ isSubmitting ? '创建中...' : '确认创建' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: var(--bg-color-secondary);
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-color-primary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  transform: rotate(90deg);
}

.modal-body {
  padding: 24px;
}

.warning-box {
  padding: 12px 16px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  color: #92400e;
  margin-bottom: 20px;
  font-size: 14px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.form-group input[type="text"],
.form-group input[type="password"] {
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  transition: all 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.password-input-wrapper {
  position: relative;
}

.toggle-password {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
}

.strength-bar {
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 4px;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.strength-text {
  font-size: 12px;
  margin-top: 4px;
}

.error-text {
  font-size: 12px;
  color: #ef4444;
  margin: 4px 0 0 0;
}

.info-box {
  padding: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-color-secondary);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-color-tertiary);
  color: var(--text-color-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--hover-bg-color);
}

@media (max-width: 480px) {
  .modal-container {
    max-width: 100%;
    margin: 10px;
  }

  .modal-body {
    padding: 16px;
  }
}
</style>
