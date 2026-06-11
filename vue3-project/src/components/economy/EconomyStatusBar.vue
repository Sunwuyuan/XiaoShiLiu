<script setup>
import { onMounted } from 'vue'
import { useEconomyStore } from '@/stores/economy.js'

const economyStore = useEconomyStore()

onMounted(() => {
  economyStore.fetchEconomy()
  economyStore.fetchLevel()
})
</script>

<template>
  <div class="economy-status-bar">
    <div class="status-left">
      <!-- 等级 -->
      <div class="level-badge" v-if="economyStore.currentLevel > 0">
        <span class="level-icon">Lv</span>
        <span class="level-num">{{ economyStore.currentLevel }}</span>
        <span class="level-title">{{ economyStore.level?.title || '' }}</span>
      </div>
      <!-- 经验条 -->
      <div class="exp-bar-wrap" v-if="economyStore.currentLevel > 0">
        <div class="exp-bar">
          <div class="exp-fill" :style="{ width: economyStore.expPercentage + '%' }"></div>
        </div>
        <span class="exp-text">{{ economyStore.currentExp }}/{{ economyStore.requiredExp || '?' }}</span>
      </div>
    </div>
    <div class="status-right">
      <!-- Pi 币 -->
      <div class="currency-item currency-pi">
        <svg class="currency-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
          <path d="M8 4v8M6 6.5c0-.83.67-1.5 1.5-1.5h1c.83 0 1.5.67 1.5 1.5S10.33 8 9.5 8h-1C7.67 8 7 8.67 7 9.5S7.67 11 8.5 11h1c.83 0 1.5-.67 1.5-1.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        <span class="currency-value">{{ economyStore.piBalance }}</span>
        <span class="currency-label">Pi</span>
      </div>
      <!-- Alpha 币 -->
      <div class="currency-item currency-alpha">
        <svg class="currency-icon" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
          <path d="M9 4L5 12h2l2-3 2 3h2L9 4z" fill="currentColor"/>
        </svg>
        <span class="currency-value">{{ economyStore.alphaBalance }}</span>
        <span class="currency-label">Alpha</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.economy-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-color-secondary);
  border: 1px solid var(--border-color-primary);
  border-radius: 12px;
  margin-bottom: 16px;
  gap: 12px;
  overflow: hidden;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

/* 等级徽章 */
.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: var(--primary-color);
  color: #fff;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.level-icon {
  opacity: 0.8;
}

.level-num {
  font-size: 13px;
}

.level-title {
  opacity: 0.85;
  font-size: 11px;
}

/* 经验条 */
.exp-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.exp-bar {
  flex: 1;
  height: 4px;
  background: var(--bg-color-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.exp-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 2px;
  transition: width 0.4s ease;
}

.exp-text {
  font-size: 10px;
  color: var(--text-color-tertiary);
  white-space: nowrap;
  flex-shrink: 0;
}

/* 右侧货币 */
.status-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.currency-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
}

.currency-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.currency-value {
  font-variant-numeric: tabular-nums;
}

.currency-label {
  font-size: 11px;
  opacity: 0.7;
}

.currency-pi {
  color: #3B82F6;
  background: rgba(59, 130, 246, 0.08);
}

.currency-alpha {
  color: #F59E0B;
  background: rgba(245, 158, 11, 0.08);
}

/* 响应式 */
@media (max-width: 480px) {
  .economy-status-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .status-left {
    justify-content: center;
  }

  .exp-bar-wrap {
    max-width: none;
  }

  .status-right {
    justify-content: center;
  }
}
</style>
