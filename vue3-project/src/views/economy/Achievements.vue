<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEconomyStore } from '@/stores/economy.js'
import LoadingSpinner from '@/components/spinner/LoadingSpinner.vue'
import EconomyStatusBar from '@/components/economy/EconomyStatusBar.vue'
import messageManager from '@/utils/messageManager.js'

const economyStore = useEconomyStore()

// 筛选状态
const activeFilter = ref('all')

// 筛选选项
const filters = [
  { id: 'all', label: '全部' },
  { id: 'completed', label: '已完成' },
  { id: 'incomplete', label: '未完成' }
]

// 过滤后的成就列表
const filteredAchievements = computed(() => {
  const list = Array.isArray(economyStore.achievements) ? economyStore.achievements : []
  if (activeFilter.value === 'completed') {
    return list.filter(a => a.completed)
  }
  if (activeFilter.value === 'incomplete') {
    return list.filter(a => !a.completed)
  }
  return list
})

// 统计数据
const stats = computed(() => {
  const list = Array.isArray(economyStore.achievements) ? economyStore.achievements : []
  const total = list.length
  const completed = list.filter(a => a.completed).length
  return { total, completed }
})

// 进度百分比
const completionPercentage = computed(() => {
  if (!stats.value.total) return 0
  return Math.round((stats.value.completed / stats.value.total) * 100)
})

// 判断成就是否已领取奖励
function isClaimed(achievement) {
  return achievement.claimed === true
}

// 进度百分比
function getProgress(achievement) {
  if (!achievement.target) return 0
  return Math.min(Math.round((achievement.progress / achievement.target) * 100), 100)
}

// 领取状态
const claimingId = ref(null)

// 领取成就奖励
async function handleClaim(achievement) {
  if (claimingId.value) return
  claimingId.value = achievement.achievement_id

  try {
    const res = await economyStore.doClaimAchievement({ achievement_id: achievement.achievement_id })
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
  economyStore.fetchAchievements()
})
</script>

<template>
  <div class="achievements-container">
    <!-- 经济状态栏 -->
    <EconomyStatusBar />

    <!-- 页面标题 -->
    <div class="achievements-header">
      <div class="header-info">
        <h1 class="page-title">成就</h1>
        <p class="page-desc">完成成就解锁特殊奖励</p>
      </div>
      <div class="header-stats">
        <div class="stats-ring">
          <svg viewBox="0 0 48 48" class="ring-svg">
            <circle cx="24" cy="24" r="20" fill="none" stroke="var(--bg-color-tertiary)" stroke-width="3"/>
            <circle
              cx="24" cy="24" r="20"
              fill="none"
              stroke="var(--primary-color)"
              stroke-width="3"
              stroke-linecap="round"
              :stroke-dasharray="`${completionPercentage * 1.256} 125.6`"
              transform="rotate(-90 24 24)"
            />
          </svg>
          <span class="ring-text">{{ completionPercentage }}%</span>
        </div>
        <span class="stats-label">{{ stats.completed }} / {{ stats.total }}</span>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-tags">
        <button
          v-for="filter in filters"
          :key="filter.id"
          :class="['filter-tag', { active: activeFilter === filter.id }]"
          @click="activeFilter = filter.id"
        >
          {{ filter.label }}
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <LoadingSpinner v-if="economyStore.isLoadingAchievements" />

    <!-- 成就列表 -->
    <div v-else class="achievement-list">
      <div
        v-for="achievement in filteredAchievements"
        :key="achievement.achievement_id"
        class="achievement-card"
        :class="{
          'achievement-card--completed': achievement.completed,
          'achievement-card--claimed': isClaimed(achievement)
        }"
      >
        <div class="achievement-icon-wrap">
          <div class="achievement-icon" :class="{ 'achievement-icon--done': achievement.completed }">
            <!-- 已完成显示勾选 -->
            <svg v-if="achievement.completed" viewBox="0 0 24 24" fill="none" class="check-icon">
              <circle cx="12" cy="12" r="10" fill="var(--primary-color)"/>
              <path d="M8 12l3 3 5-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <!-- 未完成显示锁 -->
            <svg v-else viewBox="0 0 24 24" fill="none" class="lock-icon">
              <circle cx="12" cy="12" r="10" fill="var(--bg-color-tertiary)" stroke="var(--border-color-secondary)" stroke-width="1.5"/>
              <rect x="9" y="11" width="6" height="5" rx="1" stroke="var(--text-color-tertiary)" stroke-width="1.5"/>
              <path d="M10 11V9a2 2 0 014 0v2" stroke="var(--text-color-tertiary)" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </div>
        </div>

        <div class="achievement-main">
          <div class="achievement-info">
            <div class="achievement-name" :class="{ 'achievement-name--done': achievement.completed }">
              {{ achievement.name }}
            </div>
            <p class="achievement-desc">{{ achievement.description }}</p>
          </div>

          <div class="achievement-right">
            <!-- 奖励 -->
            <div class="achievement-rewards">
              <span v-if="achievement.reward_pi" class="reward-tag reward-pi">
                <svg class="reward-icon" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1"/>
                  <path d="M6 3.5v5M5 4.5c0-.55.45-1 1-1h.5c.55 0 1 .45 1 1s-.45 1-1 1h-1C5 6.5 4.5 7 4.5 7.5S5 8.5 5.5 8.5h.5c.55 0 1-.45 1-1" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
                </svg>
                {{ achievement.reward_pi }}
              </span>
              <span v-if="achievement.reward_alpha" class="reward-tag reward-alpha">
                <svg class="reward-icon" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1"/>
                  <path d="M7 3L4 9h1.5l1.5-2.25L8.5 9H10L7 3z" fill="currentColor"/>
                </svg>
                {{ achievement.reward_alpha }}
              </span>
            </div>

            <!-- 进度（未完成时显示） -->
            <div v-if="!achievement.completed" class="achievement-progress">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: getProgress(achievement) + '%' }"
                />
              </div>
              <span class="progress-text">{{ achievement.progress }}/{{ achievement.target }}</span>
            </div>

            <!-- 操作按钮 -->
            <div class="achievement-action">
              <button
                v-if="isClaimed(achievement)"
                class="btn btn-claimed"
                disabled
              >
                已领取
              </button>
              <button
                v-else-if="achievement.completed"
                class="btn btn-claim"
                :disabled="claimingId === achievement.achievement_id"
                @click="handleClaim(achievement)"
              >
                {{ claimingId === achievement.achievement_id ? '...' : '领取奖励' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!economyStore.isLoadingAchievements && filteredAchievements.length === 0" class="empty-state">
      <svg viewBox="0 0 64 64" fill="none" class="empty-icon">
        <circle cx="32" cy="32" r="24" stroke="currentColor" stroke-width="2"/>
        <path d="M22 32l7 7 13-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
        <path d="M32 8v8M32 48v8M8 32h8M48 32h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
      </svg>
      <p>暂无成就</p>
    </div>
  </div>
</template>

<style scoped>
.achievements-container {
  padding: 20px;
  padding-top: 92px;
  min-height: calc(100vh - 120px);
}

.achievements-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-info {
  flex: 1;
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

.header-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-ring {
  position: relative;
  width: 48px;
  height: 48px;
}

.ring-svg {
  width: 48px;
  height: 48px;
}

.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-color-primary);
}

.stats-label {
  font-size: 14px;
  color: var(--text-color-secondary);
  font-weight: 500;
}

/* 筛选栏 */
.filter-bar {
  margin-bottom: 20px;
}

.filter-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
  color: var(--text-color-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tag:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.filter-tag.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: #fff;
}

/* 成就列表 */
.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.achievement-card {
  display: flex;
  gap: 16px;
  background: var(--bg-color-primary);
  border: 1px solid var(--border-color-primary);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.2s ease;
}

.achievement-card:hover {
  border-color: var(--border-color-secondary);
}

.achievement-card--claimed {
  opacity: 0.6;
}

.achievement-icon-wrap {
  flex-shrink: 0;
}

.achievement-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.achievement-icon--done .check-icon {
  width: 40px;
  height: 40px;
}

.lock-icon {
  width: 40px;
  height: 40px;
}

.achievement-main {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.achievement-info {
  flex: 1;
  min-width: 0;
}

.achievement-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin-bottom: 4px;
}

.achievement-name--done {
  color: var(--primary-color);
}

.achievement-desc {
  font-size: 13px;
  color: var(--text-color-secondary);
  margin: 0;
  line-height: 1.4;
}

.achievement-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.achievement-rewards {
  display: flex;
  gap: 6px;
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

/* 进度条 */
.achievement-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 120px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--bg-color-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: var(--text-color-tertiary);
  white-space: nowrap;
}

/* 操作按钮 */
.achievement-action {
  margin-top: 2px;
}

.btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
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
  .achievements-container {
    padding: 16px;
  }

  .achievement-card {
    flex-direction: column;
    gap: 12px;
  }

  .achievement-main {
    flex-direction: column;
    gap: 12px;
  }

  .achievement-right {
    align-items: flex-start;
    width: 100%;
  }

  .achievement-rewards {
    align-self: flex-start;
  }

  .achievement-progress {
    width: 100%;
  }

  .achievement-action {
    align-self: flex-end;
  }

  .filter-tags {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }
}
</style>
