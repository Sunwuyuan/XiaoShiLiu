<script setup>
import { ref, computed, onMounted } from 'vue'
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

const sessions = ref([])
const isLoading = ref(false)

const tempSessions = computed(() => sessions.value.filter(s => s.auth_type === 'temp'))
const mainSessions = computed(() => sessions.value.filter(s => s.auth_type === 'main'))

onMounted(() => {
  fetchSessions()
})

async function fetchSessions() {
  isLoading.value = true
  try {
    const res = await gameApi.getSessions(props.profile.id)
    if (res.success) {
      sessions.value = res.data || []
    }
  } catch (error) {
    console.error('获取会话列表失败:', error)
    messageManager.error('获取会话列表失败')
  } finally {
    isLoading.value = false
  }
}

async function handleKick(sessionId) {
  if (!confirm('确定要踢出这个会话吗？该用户将立即被强制下线')) {
    return
  }

  try {
    const res = await gameApi.kickSession(props.profile.id, sessionId)
    if (res.success) {
      messageManager.success('会话已踢出')
      await fetchSessions()
    } else {
      messageManager.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('踢出会话失败:', error)
    messageManager.error('踢出失败')
  }
}

async function handleKickAllTemp() {
  if (tempSessions.value.length === 0) return

  if (!confirm(`确定要踢出所有 ${tempSessions.value.length} 个临时密码会话吗？`)) {
    return
  }

  try {
    const res = await gameApi.kickAllTempSessions(props.profile.id)
    if (res.success) {
      messageManager.success(res.message || '已踢出所有临时密码会话')
      await fetchSessions()
    } else {
      messageManager.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('批量踢出失败:', error)
    messageManager.error('操作失败')
  }
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

function formatTimeRemaining(dateString) {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const now = new Date()
  const diff = date - now

  if (diff <= 0) return '已过期'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟后过期`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时后过期`
  return `${Math.floor(diff / 86400000)} 天后过期`
}

function parseUserAgent(ua) {
  if (!ua) return '未知'
  // Minecraft 启动器通常包含 "Minecraft" 或 "Launcher"
  if (ua.includes('Minecraft') || ua.includes('minecraft')) {
    const match = ua.match(/Minecraft[^\s]*/i)
    return match ? match[0] : 'Minecraft 启动器'
  }
  if (ua.includes('Java')) return 'Java 客户端'
  if (ua.includes('curl')) return '命令行工具'
  if (ua.length > 40) return ua.substring(0, 40) + '...'
  return ua
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-container">
      <div class="modal-header">
        <div class="header-left">
          <h2>会话管理</h2>
          <p class="header-subtitle">{{ profile.player_name }}@dy.ci · {{ sessions.length }} 个活跃会话</p>
        </div>
        <button class="close-btn" @click="emit('close')">
          <SvgIcon name="close" />
        </button>
      </div>

      <div class="modal-body">
        <!-- 批量操作 -->
        <div v-if="tempSessions.length > 0" class="batch-actions">
          <button class="btn btn-danger-outline" @click="handleKickAllTemp">
            <SvgIcon name="delete" class="btn-icon" />
            踢出所有临时会话 ({{ tempSessions.length }})
          </button>
        </div>

        <!-- 加载中 -->
        <div v-if="isLoading" class="loading-state">
          <SvgIcon name="loading" class="spin" />
          <span>加载中...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="sessions.length === 0" class="empty-state">
          <SvgIcon name="shield" class="empty-icon" />
          <p>当前没有活跃会话</p>
        </div>

        <!-- 会话列表 -->
        <div v-else class="session-list">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="session-item"
            :class="{ 'temp-session': session.auth_type === 'temp' }"
          >
            <div class="session-main">
              <div class="session-header">
                <span class="auth-badge" :class="session.auth_type">
                  {{ session.auth_type === 'main' ? '主密码' : '临时密码' }}
                </span>
                <span v-if="session.temp_remark" class="session-remark">{{ session.temp_remark }}</span>
                <span v-if="session.is_invalidated" class="status-badge invalidated">已失效</span>
              </div>

              <div class="session-details">
                <div class="detail-row">
                  <span class="detail-label">IP 地址</span>
                  <span class="detail-value">{{ session.ip_address || '未知' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">客户端</span>
                  <span class="detail-value client">{{ parseUserAgent(session.user_agent) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">登录时间</span>
                  <span class="detail-value">{{ formatDateTime(session.created_at) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">过期时间</span>
                  <span class="detail-value">{{ formatTimeRemaining(session.expires_at) }}</span>
                </div>
              </div>
            </div>

            <button class="kick-btn" @click="handleKick(session.id)" title="踢出会话">
              <SvgIcon name="close" />
            </button>
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

/* 批量操作 */
.batch-actions {
  margin-bottom: 16px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon {
  width: 14px;
  height: 14px;
}

.btn-danger-outline {
  background: rgba(244, 33, 46, 0.08);
  color: var(--danger-color);
  border: 1px solid rgba(244, 33, 46, 0.2);
}

.btn-danger-outline:hover {
  background: rgba(244, 33, 46, 0.15);
}

/* 加载和空状态 */
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

/* 会话列表 */
.session-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.session-item {
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

.session-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.session-item.temp-session {
  border-left: 3px solid #8b5cf6;
}

.session-main {
  flex: 1;
  min-width: 0;
}

.session-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.auth-badge {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.auth-badge.main {
  background: var(--primary-color-shadow);
  color: var(--primary-color);
}

.auth-badge.temp {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

.session-remark {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.status-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
}

.status-badge.invalidated {
  background: rgba(244, 33, 46, 0.1);
  color: var(--danger-color);
}

.session-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 16px;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.detail-label {
  font-size: 12px;
  color: var(--text-color-tertiary);
  white-space: nowrap;
}

.detail-value {
  font-size: 12px;
  color: var(--text-color-primary);
  font-family: 'Courier New', monospace;
}

.detail-value.client {
  font-family: inherit;
}

.kick-btn {
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
  flex-shrink: 0;
}

.kick-btn:hover {
  background: rgba(244, 33, 46, 0.1);
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

  .session-details {
    grid-template-columns: 1fr;
  }

  .session-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .kick-btn {
    align-self: flex-end;
  }
}
</style>
