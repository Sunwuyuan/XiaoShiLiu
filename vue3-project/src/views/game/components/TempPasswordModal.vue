<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { gameApi } from '@/api/game'
import messageManager from '@/utils/messageManager'
import SvgIcon from '@/components/SvgIcon.vue'

const props = defineProps({
  profile: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const tempPasswords = ref([])
const isLoading = ref(false)
const isCreating = ref(false)
const showCreateForm = ref(false)
const newlyCreated = ref(null)

// 创建表单
const form = reactive({
  max_uses: 1,
  expires_at: ''
})

// 计算默认过期时间（24小时后）
const defaultExpiresAt = computed(() => {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return toLocalDateTimeInput(date)
})

function toLocalDateTimeInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function parseLocalDateTimeInput(value) {
  if (!value) return null
  return new Date(value)
}

const canCreate = computed(() => {
  const uses = parseInt(form.max_uses)
  const expires = parseLocalDateTimeInput(form.expires_at)
  return uses >= 1 && uses <= 100 && expires && expires > new Date()
})

onMounted(() => {
  form.expires_at = defaultExpiresAt.value
  fetchTempPasswords()
})

async function fetchTempPasswords() {
  isLoading.value = true
  try {
    const res = await gameApi.getTempPasswords(props.profile.id)
    if (res.success) {
      tempPasswords.value = res.data || []
    }
  } catch (error) {
    console.error('获取临时密码失败:', error)
    messageManager.error('获取临时密码列表失败')
  } finally {
    isLoading.value = false
  }
}

async function handleCreate() {
  if (!canCreate.value) return

  isCreating.value = true
  try {
    const expiresDate = parseLocalDateTimeInput(form.expires_at)
    const res = await gameApi.createTempPassword(props.profile.id, {
      max_uses: parseInt(form.max_uses),
      expires_at: expiresDate.toISOString()
    })

    if (res.success) {
      newlyCreated.value = res.data
      messageManager.success('临时密码创建成功')
      await fetchTempPasswords()
      showCreateForm.value = false
      form.max_uses = 1
      form.expires_at = defaultExpiresAt.value
    } else {
      messageManager.error(res.message || '创建失败')
    }
  } catch (error) {
    console.error('创建临时密码失败:', error)
    if (error.response?.data?.message) {
      messageManager.error(error.response.data.message)
    } else {
      messageManager.error('创建失败，请稍后重试')
    }
  } finally {
    isCreating.value = false
  }
}

async function handleRevoke(tempId) {
  if (!confirm('确定要撤销这个临时密码吗？撤销后该密码将立即失效')) {
    return
  }

  try {
    const res = await gameApi.revokeTempPassword(props.profile.id, tempId)
    if (res.success) {
      messageManager.success('临时密码已撤销')
      await fetchTempPasswords()
    } else {
      messageManager.error(res.message || '撤销失败')
    }
  } catch (error) {
    console.error('撤销临时密码失败:', error)
    messageManager.error('撤销失败')
  }
}

function copyPassword(password) {
  navigator.clipboard.writeText(password).then(() => {
    messageManager.success('密码已复制到剪贴板')
  }).catch(() => {
    messageManager.error('复制失败')
  })
}

function formatTime(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diff = date - now

  if (diff <= 0) return '已过期'
  if (diff < 60000) return '即将过期'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟后过期`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时后过期`
  return `${Math.floor(diff / 86400000)} 天后过期`
}

function formatDateTime(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div class="header-left">
          <h2>临时密码管理</h2>
          <p class="header-subtitle">{{ profile.player_name }}@dy.ci</p>
        </div>
        <button class="close-btn" @click="emit('close')">
          <SvgIcon name="close" />
        </button>
      </div>

      <div class="modal-body">
        <!-- 创建成功提示 -->
        <div v-if="newlyCreated" class="success-banner">
          <div class="banner-content">
            <p class="banner-title">临时密码已生成</p>
            <div class="password-display">
              <code class="password-code">{{ newlyCreated.password }}</code>
              <button class="copy-btn" @click="copyPassword(newlyCreated.password)" title="复制">
                <SvgIcon name="copy" />
              </button>
            </div>
            <p class="banner-meta">
              有效期至 {{ formatDateTime(newlyCreated.expires_at) }} · 可用 {{ newlyCreated.max_uses }} 次
            </p>
          </div>
          <button class="banner-dismiss" @click="newlyCreated = null">
            <SvgIcon name="close" />
          </button>
        </div>

        <!-- 创建表单 -->
        <div v-if="showCreateForm" class="create-form">
          <h3 class="form-title">创建临时密码</h3>
          <div class="form-row">
            <div class="form-group">
              <label>最大登录次数</label>
              <input
                v-model.number="form.max_uses"
                type="number"
                min="1"
                max="100"
                placeholder="1-100"
              />
              <p class="hint">该密码可被使用的最大次数</p>
            </div>
            <div class="form-group">
              <label>过期时间</label>
              <input
                v-model="form.expires_at"
                type="datetime-local"
              />
              <p class="hint">密码将在此时间后自动失效</p>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="showCreateForm = false">取消</button>
            <button
              class="btn btn-primary"
              :disabled="!canCreate || isCreating"
              @click="handleCreate"
            >
              {{ isCreating ? '创建中...' : '创建临时密码' }}
            </button>
          </div>
        </div>

        <!-- 创建按钮 -->
        <div v-else class="create-trigger">
          <button class="btn btn-primary" @click="showCreateForm = true">
            <SvgIcon name="plus" class="btn-icon" />
            创建临时密码
          </button>
          <p class="hint">临时密码可用于安全分享账号，可设置使用次数和过期时间</p>
        </div>

        <!-- 列表 -->
        <div class="list-section">
          <h3 class="list-title">
            现有临时密码
            <span class="count">({{ tempPasswords.length }})</span>
          </h3>

          <div v-if="isLoading" class="loading-state">
            <SvgIcon name="loading" class="spin" />
            <span>加载中...</span>
          </div>

          <div v-else-if="tempPasswords.length === 0" class="empty-state">
            <SvgIcon name="game" class="empty-icon" />
            <p>暂无临时密码</p>
          </div>

          <div v-else class="temp-password-list">
            <div
              v-for="item in tempPasswords"
              :key="item.id"
              class="temp-password-item"
            >
              <div class="item-main">
                <div class="item-header">
                  <code class="password-code">{{ item.password }}</code>
                  <button class="copy-btn-sm" @click="copyPassword(item.password)" title="复制">
                    <SvgIcon name="copy" />
                  </button>
                </div>
                <div class="item-meta">
                  <span class="meta-tag uses">
                    <SvgIcon name="play" />
                    {{ item.used_count }} / {{ item.max_uses }} 次
                  </span>
                  <span class="meta-tag expires" :class="{ 'urgent': item.remaining_uses <= 0 || new Date(item.expires_at) <= new Date() }">
                    <SvgIcon name="clock" />
                    {{ formatTime(item.expires_at) }}
                  </span>
                  <span v-if="item.last_used_at" class="meta-tag last-used">
                    最后使用: {{ formatDateTime(item.last_used_at) }}
                  </span>
                </div>
              </div>
              <div class="item-actions">
                <button class="action-btn revoke" @click="handleRevoke(item.id)" title="撤销">
                  <SvgIcon name="delete" />
                </button>
              </div>
            </div>
          </div>
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
  background: var(--overlay-bg);
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
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color-primary);
}

.header-left h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-color-primary);
}

.header-subtitle {
  font-size: 13px;
  color: var(--text-color-tertiary);
  margin: 4px 0 0 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-secondary);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.close-btn:hover {
  background: var(--bg-color-tertiary);
  color: var(--text-color-primary);
}

.modal-body {
  padding: 20px 24px;
}

/* 成功横幅 */
.success-banner {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.banner-content {
  flex: 1;
  min-width: 0;
}

.banner-title {
  font-size: 14px;
  font-weight: 600;
  color: #16a34a;
  margin: 0 0 10px 0;
}

.password-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.password-code {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color-primary);
  background: var(--bg-color-primary);
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color-primary);
  letter-spacing: 1px;
  word-break: break-all;
}

.copy-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: var(--bg-color-primary);
  color: var(--text-color-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.copy-btn:hover {
  background: var(--primary-color);
  color: white;
}

.copy-btn-sm {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-color-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.copy-btn-sm:hover {
  background: var(--bg-color-tertiary);
  color: var(--primary-color);
}

.banner-meta {
  font-size: 12px;
  color: var(--text-color-tertiary);
  margin: 0;
}

.banner-dismiss {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-color-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.banner-dismiss:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-color-primary);
}

/* 创建表单 */
.create-form {
  background: var(--bg-color-primary);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid var(--border-color-primary);
}

.form-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 14px 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.form-group input {
  padding: 10px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  transition: all 0.2s ease;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px var(--primary-color-shadow);
}

.hint {
  font-size: 12px;
  color: var(--text-color-tertiary);
  margin: 0;
}

/* 创建触发区 */
.create-trigger {
  text-align: center;
  padding: 16px;
  margin-bottom: 20px;
}

.create-trigger .hint {
  margin-top: 8px;
}

/* 按钮 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--bg-color-tertiary);
  color: var(--text-color-primary);
  border: 1px solid var(--border-color-primary);
}

.btn-secondary:hover {
  background: var(--bg-color-secondary);
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 14px;
}

/* 列表 */
.list-section {
  margin-top: 8px;
}

.list-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 12px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.count {
  font-size: 13px;
  color: var(--text-color-tertiary);
  font-weight: 400;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--text-color-tertiary);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-color-tertiary);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* 临时密码列表项 */
.temp-password-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.temp-password-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-color-primary);
  border: 1px solid var(--border-color-primary);
  border-radius: 12px;
  transition: all 0.2s ease;
}

.temp-password-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.item-header .password-code {
  font-size: 15px;
  padding: 4px 10px;
}

.item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--bg-color-secondary);
  color: var(--text-color-secondary);
}

.meta-tag.uses {
  color: var(--primary-color);
  background: var(--primary-color-shadow);
}

.meta-tag.expires {
  color: #059669;
  background: rgba(5, 150, 105, 0.1);
}

.meta-tag.expires.urgent {
  color: var(--danger-color);
  background: rgba(255, 12, 48, 0.1);
}

.meta-tag.last-used {
  color: var(--text-color-tertiary);
}

.item-actions {
  flex-shrink: 0;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-color-tertiary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 12, 48, 0.1);
  color: var(--danger-color);
}

/* 移动端适配 */
@media (max-width: 480px) {
  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }

  .modal-container {
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .temp-password-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .item-actions {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .password-display {
    flex-direction: column;
    align-items: stretch;
  }

  .password-code {
    font-size: 15px !important;
    text-align: center;
  }
}
</style>
