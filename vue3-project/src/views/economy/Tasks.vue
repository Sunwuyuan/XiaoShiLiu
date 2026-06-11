<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEconomyStore } from '@/stores/economy.js'
import { checkIn } from '@/api/economy.js'
import LoadingSpinner from '@/components/spinner/LoadingSpinner.vue'
import EconomyStatusBar from '@/components/economy/EconomyStatusBar.vue'
import messageManager from '@/utils/messageManager.js'

const economyStore = useEconomyStore()

// 当前 Tab
const activeTab = ref('daily')

// 签到状态
const checkedIn = ref(false)
const checkingIn = ref(false)

// Tab 选项
const tabs = [
  { id: 'daily', label: '每日任务' },
  { id: 'weekly', label: '每周任务' },
  { id: 'main', label: '主线任务' }
]

// 任务列表
const taskList = computed(() => {
  if (!economyStore.tasks) return []
  return economyStore.tasks[activeTab.value] || []
})

// 检查是否已签到
function checkSignInStatus() {
  const dailyTasks = economyStore.tasks?.daily || []
  const loginTask = dailyTasks.find(t => t.task_id === 'daily_login')
  checkedIn.value = loginTask && loginTask.progress >= 1
}

// 每日签到
async function handleCheckIn() {
  if (checkingIn.value || checkedIn.value) return
  checkingIn.value = true

  try {
    const res = await checkIn()
    if (res.success) {
      if (res.data.alreadyCheckedIn) {
        messageManager.info('今天已签到')
        checkedIn.value = true
      } else {
        const rewards = res.data.rewards || {}
        const msg = []
        if (rewards.pi) msg.push(`+${rewards.pi} Pi`)
        if (rewards.exp) msg.push(`+${rewards.exp} EXP`)
        messageManager.success(`签到成功！${msg.join(' ')}`)
        checkedIn.value = true
        // 刷新任务列表和经济信息
        economyStore.fetchTasks()
        economyStore.fetchEconomy()
        economyStore.fetchLevel()
      }
    } else {
      messageManager.error(res.message || '签到失败')
    }
  } catch (error) {
    messageManager.error('签到失败')
  } finally {
    checkingIn.value = false
  }
}

// 判断任务是否完成
function isTaskCompleted(task) {
  return task.progress >= task.target
}

// 判断任务是否已领取奖励
function isTaskClaimed(task) {
  return task.claimed === true
}

// 进度百分比
function getProgress(task) {
  if (!task.target) return 0
  return Math.min(Math.round((task.progress / task.target) * 100), 100)
}

// 领取状态
const claimingId = ref(null)

// 领取任务奖励
async function handleClaim(task) {
  if (claimingId.value) return
  claimingId.value = task.task_id

  try {
    const res = await economyStore.doClaimTask({ task_id: task.task_id, task_type: activeTab.value })
    if (res.success) {
      messageManager.success('领取成功')
    } else {
      messageManager.error(res.message || '领取失败')
    }
  } catch (error) {
    messageManager.error('领取失败')
  } finally {
    claimingId.value = null
  }
}

onMounted(() => {
  economyStore.fetchTasks().then(() => {
    checkSignInStatus()
  })
})
</script>

<template>
  <div class="tasks-container">
    <!-- 经济状态栏 -->
    <EconomyStatusBar />

    <!-- 页面标题 -->
    <div class="tasks-header">
      <h1 class="page-title">任务</h1>
      <p class="page-desc">完成任务获取 Pi 和 Alpha 奖励</p>
    </div>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab-item', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 加载状态 -->
    <LoadingSpinner v-if="economyStore.isLoadingTasks" />

    <!-- 任务列表 -->
    <div v-else class="task-list">
      <div
        v-for="task in taskList"
        :key="task.task_id"
        class="task-card"
        :class="{
          'task-card--completed': isTaskCompleted(task),
          'task-card--claimed': isTaskClaimed(task)
        }"
      >
        <div class="task-main">
          <div class="task-info">
            <div class="task-name">
              <span class="task-name-text">{{ task.name }}</span>
              <span v-if="isTaskClaimed(task)" class="task-claimed-tag">已领取</span>
            </div>
            <p class="task-desc">{{ task.description }}</p>
          </div>

          <div class="task-rewards">
            <span v-if="task.reward_pi" class="reward-tag reward-pi">
              <svg class="reward-icon" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1"/>
                <path d="M6 3.5v5M5 4.5c0-.55.45-1 1-1h.5c.55 0 1 .45 1 1s-.45 1-1 1h-1C5 6.5 4.5 7 4.5 7.5S5 8.5 5.5 8.5h.5c.55 0 1-.45 1-1" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              </svg>
              {{ task.reward_pi }}
            </span>
            <span v-if="task.reward_alpha" class="reward-tag reward-alpha">
              <svg class="reward-icon" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1"/>
                <path d="M7 3L4 9h1.5l1.5-2.25L8.5 9H10L7 3z" fill="currentColor"/>
              </svg>
              {{ task.reward_alpha }}
            </span>
            <span v-if="task.reward_exp" class="reward-tag reward-exp">
              +{{ task.reward_exp }} EXP
            </span>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="task-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :class="{ 'progress-fill--complete': isTaskCompleted(task) }"
              :style="{ width: getProgress(task) + '%' }"
            />
          </div>
          <span class="progress-text">
            {{ task.progress }} / {{ task.target }}
          </span>
        </div>

        <!-- 操作按钮 -->
        <div class="task-action">
          <button
            v-if="isTaskClaimed(task)"
            class="btn btn-claimed"
            disabled
          >
            已领取
          </button>
          <button
            v-else-if="task.task_id === 'daily_login' && !isTaskCompleted(task)"
            class="btn btn-check-in"
            :disabled="checkingIn"
            @click="handleCheckIn"
          >
            {{ checkingIn ? '签到中...' : '签到' }}
          </button>
          <button
            v-else-if="isTaskCompleted(task)"
            class="btn btn-claim"
            :disabled="claimingId === task.task_id"
            @click="handleClaim(task)"
          >
            {{ claimingId === task.task_id ? '...' : '领取奖励' }}
          </button>
          <button
            v-else
            class="btn btn-in-progress"
            disabled
          >
            进行中
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!economyStore.isLoadingTasks && taskList.length === 0" class="empty-state">
      <svg viewBox="0 0 64 64" fill="none" class="empty-icon">
        <rect x="8" y="8" width="48" height="48" rx="8" stroke="currentColor" stroke-width="2"/>
        <path d="M24 24h16M24 32h10M24 40h6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        <path d="M44 20l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
      </svg>
      <p>暂无任务</p>
    </div>
  </div>
</template>

<style scoped>
.tasks-container {
  padding: 20px;
  padding-top: 92px;
  min-height: calc(100vh - 120px);
}

.tasks-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-color-primary);
  margin: 0 0 4px 0;
}

.page-desc {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
}

/* 签到按钮（任务项内） */
.btn-check-in {
  padding: 6px 16px;
  border: none;
  border-radius: 16px;
  background: var(--primary-color);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-check-in:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-check-in:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Tab 切换 */
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color-primary);
  padding-bottom: 0;
}

.tab-item {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;
}

.tab-item:hover {
  color: var(--text-color-primary);
}

.tab-item.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
  font-weight: 600;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card {
  background: var(--bg-color-primary);
  border: 1px solid var(--border-color-primary);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s ease;
}

.task-card:hover {
  border-color: var(--border-color-secondary);
}

.task-card--claimed {
  opacity: 0.6;
}

.task-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.task-name-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.task-claimed-tag {
  font-size: 11px;
  color: var(--text-color-tertiary);
  background: var(--bg-color-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.task-desc {
  font-size: 13px;
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.4;
}

.task-rewards {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.reward-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
}

.reward-icon {
  width: 12px;
  height: 12px;
}

.reward-pi {
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.1);
}

.reward-alpha {
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.1);
}

.reward-exp {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

/* 进度条 */
.task-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: var(--bg-color-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-fill--complete {
  background: #10B981;
}

.progress-text {
  font-size: 12px;
  color: var(--text-color-tertiary);
  white-space: nowrap;
  min-width: 60px;
  text-align: right;
}

/* 操作按钮 */
.task-action {
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-claim {
  background: var(--primary-color);
  color: #fff;
}

.btn-claim:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-claim:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-in-progress {
  background: var(--bg-color-tertiary);
  color: var(--text-color-tertiary);
  cursor: default;
}

.btn-claimed {
  background: var(--bg-color-tertiary);
  color: var(--text-color-tertiary);
  cursor: default;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  color: var(--text-color-tertiary);
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-color-secondary);
  margin: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .tasks-container {
    padding: 16px;
  }

  .task-main {
    flex-direction: column;
  }

  .task-rewards {
    align-self: flex-start;
  }

  .tab-bar {
    overflow-x: auto;
  }

  .tab-item {
    white-space: nowrap;
    padding: 10px 14px;
  }
}
</style>
