<script setup>
import { ref } from 'vue'
import { gameApi } from '@/api/game'
import messageManager from '@/utils/messageManager'

const props = defineProps({
  profile: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'updated'])

const activeTab = ref('info')
const newName = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmNewPassword = ref('')
const isSubmitting = ref(false)
const showOldPassword = ref(false)
const showNewPassword = ref(false)

newName.value = props.profile.player_name

const tabs = [
  { key: 'info', label: '基本信息' },
  { key: 'password', label: '修改密码' }
]

async function handleUpdateName() {
  if (!newName.value.trim()) {
    messageManager.error('玩家名称不能为空')
    return
  }

  if (newName.value.trim() === props.profile.player_name) {
    messageManager.info('名称未修改')
    return
  }

  isSubmitting.value = true

  try {
    const res = await gameApi.updateProfileName(props.profile.id, newName.value.trim())
    
    if (res.success) {
      emit('updated', { player_name: newName.value.trim() })
      messageManager.success('名称修改成功')
    } else {
      messageManager.error(res.message || '修改失败')
    }
  } catch (error) {
    console.error('修改名称失败:', error)
    messageManager.error(error.response?.data?.message || '修改失败')
  } finally {
    isSubmitting.value = false
  }
}

async function handleUpdatePassword() {
  if (!oldPassword.value || !newPassword.value || !confirmNewPassword.value) {
    messageManager.error('请填写所有密码字段')
    return
  }

  if (newPassword.value.length < 8) {
    messageManager.error('新密码长度至少为8位')
    return
  }

  if (oldPassword.value === newPassword.value) {
    messageManager.error('新密码不能与旧密码相同')
    return
  }

  if (newPassword.value !== confirmNewPassword.value) {
    messageManager.error('两次输入的新密码不一致')
    return
  }

  isSubmitting.value = true

  try {
    const res = await gameApi.updateProfilePassword(
      props.profile.id,
      oldPassword.value,
      newPassword.value
    )

    if (res.success) {
      oldPassword.value = ''
      newPassword.value = ''
      confirmNewPassword.value = ''
      messageManager.success('密码修改成功！请使用新密码登录MC客户端')
    } else {
      messageManager.error(res.message || '修改失败')
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    messageManager.error(error.response?.data?.message || '修改失败')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <h2>编辑角色 - {{ profile.player_name }}</h2>
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="tabs">
        <button 
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-btn', { active: activeTab === tab.key }]"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="modal-body">
        <!-- 基本信息 Tab -->
        <div v-if="activeTab === 'info'" class="tab-content">
          <form @submit.prevent="handleUpdateName" class="edit-form">
            <div class="form-group">
              <label>玩家名称</label>
              <input 
                v-model="newName"
                type="text"
                placeholder="3-16位字符（字母/数字/下划线）"
                maxlength="16"
                :disabled="isSubmitting"
              />
            </div>

            <div class="uuid-display">
              <label>UUID</label>
              <p>{{ profile.uuid }}</p>
            </div>

            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="isSubmitting || newName === profile.player_name"
              >
                {{ isSubmitting ? '保存中...' : '保存修改' }}
              </button>
            </div>
          </form>
        </div>

        <!-- 修改密码 Tab -->
        <div v-if="activeTab === 'password'" class="tab-content">
          <form @submit.prevent="handleUpdatePassword" class="edit-form">
            <div class="warning-box">
              修改密码后需要使用新密码重新登录MC客户端
            </div>

            <div class="form-group">
              <label>当前密码 *</label>
              <input 
                v-model="oldPassword"
                :type="showOldPassword ? 'text' : 'password'"
                placeholder="输入当前独立密码"
                :disabled="isSubmitting"
              />
            </div>

            <div class="form-group">
              <label>新密码 *</label>
              <input 
                v-model="newPassword"
                :type="showNewPassword ? 'text' : 'password'"
                placeholder="至少8位（大小写+数字）"
                :disabled="isSubmitting"
              />
            </div>

            <div class="form-group">
              <label>确认新密码 *</label>
              <input 
                v-model="confirmNewPassword"
                type="password"
                placeholder="再次输入新密码"
                :disabled="isSubmitting"
              />
            </div>

            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary"
                :disabled="isSubmitting"
              >
                {{ isSubmitting ? '修改中...' : '确认修改' }}
              </button>
            </div>
          </form>
        </div>

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
  max-width: 560px;
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
  font-size: 18px;
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

.tabs {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-color-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: var(--bg-color-tertiary);
  color: var(--primary-color);
}

.tab-btn.active {
  background: var(--primary-color);
  color: white;
}

.modal-body {
  padding: 24px;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-shadow);
}

.form-group input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.uuid-display {
  padding: 12px 16px;
  background: var(--bg-color-primary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.uuid-display label {
  font-size: 13px;
  color: var(--text-color-secondary);
  display: block;
  margin-bottom: 6px;
}

.uuid-display p {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-color-primary);
  word-break: break-all;
  margin: 0;
}

.warning-box {
  padding: 12px 16px;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  color: #92400e;
  font-size: 13px;
}

.form-actions {
  display: flex;
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
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--primary-color-shadow);
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

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-sm {
  padding: 8px 16px;
  font-size: 13px;
}

@media (max-width: 480px) {
  .modal-container {
    max-width: 100%;
    margin: 10px;
  }

  .modal-body {
    padding: 16px;
  }

  .tabs {
    padding: 12px 16px;
  }

  .tab-btn {
    padding: 8px 14px;
    font-size: 13px;
  }
}
</style>
