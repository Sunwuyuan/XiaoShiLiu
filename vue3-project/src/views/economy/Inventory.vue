<script setup>
import { ref, computed, onMounted } from 'vue'
import { useEconomyStore } from '@/stores/economy.js'
import LoadingSpinner from '@/components/spinner/LoadingSpinner.vue'
import EconomyStatusBar from '@/components/economy/EconomyStatusBar.vue'
import messageManager from '@/utils/messageManager.js'

const economyStore = useEconomyStore()

// 当前分类
const activeCategory = ref('all')

// 分类选项（id 必须与数据库 item_type 一致）
const categories = [
  { id: 'all', label: '全部' },
  { id: 'frame', label: '头像框' },
  { id: 'accessory', label: '头饰' },
  { id: 'name_style', label: '用户名' },
  { id: 'card_bg', label: '背景' },
  { id: 'chat_bubble', label: '气泡' }
]

// 稀有度颜色映射
const rarityColorMap = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
  mythic: 'rainbow'
}

function getRarityStyle(rarity) {
  const color = rarityColorMap[rarity]
  if (color === 'rainbow') {
    return {
      background: 'linear-gradient(90deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8b00ff)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    }
  }
  return { color: color || 'var(--text-color-primary)' }
}

function getRarityBorderStyle(rarity) {
  const color = rarityColorMap[rarity]
  if (color === 'rainbow') {
    return {
      border: '2px solid transparent',
      backgroundImage: 'linear-gradient(var(--bg-color-primary), var(--bg-color-primary)), linear-gradient(90deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8b00ff)',
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box'
    }
  }
  return { border: `1px solid ${color || 'var(--border-color-primary)'}` }
}

// 过滤后的道具列表
const filteredItems = computed(() => {
  if (activeCategory.value === 'all') {
    return economyStore.inventory
  }
  return economyStore.inventory.filter(item => item.item_type === activeCategory.value)
})

// 判断是否已装备
function isEquipped(item) {
  if (!economyStore.equipped) return false
  const fieldMap = {
    frame: 'frame_id',
    accessory: 'accessory_id',
    name_style: 'name_style',
    card_bg: 'card_bg_id',
    chat_bubble: 'chat_bubble_id',
  }
  const field = fieldMap[item.item_type]
  if (!field) return false
  return economyStore.equipped[field] === item.item_id
}

// 操作状态
const actionId = ref(null)

// 装备道具
async function handleEquip(item) {
  if (actionId.value) return
  actionId.value = item.item_id

  try {
    const res = await economyStore.doEquipItem({ item_id: item.item_id, item_type: item.item_type })
    if (res.success) {
      messageManager.success('装备成功')
    } else {
      messageManager.error(res.message || '装备失败')
    }
  } catch (error) {
    messageManager.error('装备失败')
  } finally {
    actionId.value = null
  }
}

// 卸下道具
async function handleUnequip(item) {
  if (actionId.value) return
  actionId.value = item.item_id

  try {
    const res = await economyStore.doUnequipItem({ item_id: item.item_id, item_type: item.item_type })
    if (res.success) {
      messageManager.success('已卸下')
    } else {
      messageManager.error(res.message || '卸下失败')
    }
  } catch (error) {
    messageManager.error('卸下失败')
  } finally {
    actionId.value = null
  }
}

onMounted(async () => {
  await Promise.all([
    economyStore.fetchInventory(),
    economyStore.fetchEquipped()
  ])
})
</script>

<template>
  <div class="inventory-container">
    <!-- 经济状态栏 -->
    <EconomyStatusBar />

    <!-- 页面标题 -->
    <div class="inventory-header">
      <h1 class="page-title">背包</h1>
      <p class="page-desc">管理你拥有的所有道具</p>
    </div>

    <!-- 分类筛选 -->
    <div class="filter-bar">
      <div class="filter-tags">
        <button
          v-for="cat in categories"
          :key="cat.id"
          :class="['filter-tag', { active: activeCategory === cat.id }]"
          @click="activeCategory = cat.id"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <LoadingSpinner v-if="economyStore.isLoadingInventory && economyStore.inventory.length === 0" />

    <!-- 道具列表 -->
    <div v-else class="inventory-grid">
      <div
        v-for="item in filteredItems"
        :key="item.item_id"
        class="item-card"
        :class="{ 'item-card--equipped': isEquipped(item) }"
        :style="getRarityBorderStyle(item.rarity)"
      >
        <div class="item-preview">
          <img
            v-if="item.image"
            :src="item.image"
            :alt="item.name"
            class="item-image"
          />
          <div v-else class="item-placeholder">
            <svg viewBox="0 0 48 48" fill="none" class="placeholder-icon">
              <rect x="8" y="8" width="32" height="32" rx="8" stroke="currentColor" stroke-width="2" opacity="0.3"/>
              <path d="M24 16v16M16 24h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
            </svg>
          </div>
          <!-- 装备中标记 -->
          <div v-if="isEquipped(item)" class="equipped-badge">
            <svg viewBox="0 0 16 16" fill="none" class="equipped-icon">
              <path d="M4 8l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <div class="item-info">
          <div class="item-name" :style="getRarityStyle(item.rarity)">
            {{ item.name }}
          </div>
          <div class="item-type">
            {{ categories.find(c => c.id === item.item_type)?.label || item.item_type }}
          </div>
        </div>

        <div class="item-action">
          <button
            v-if="isEquipped(item)"
            class="btn btn-unequip"
            :disabled="actionId === item.item_id"
            @click="handleUnequip(item)"
          >
            卸下
          </button>
          <button
            v-else
            class="btn btn-equip"
            :disabled="actionId === item.item_id"
            @click="handleEquip(item)"
          >
            装备
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!economyStore.isLoadingInventory && filteredItems.length === 0" class="empty-state">
      <svg viewBox="0 0 64 64" fill="none" class="empty-icon">
        <rect x="8" y="12" width="48" height="40" rx="4" stroke="currentColor" stroke-width="2"/>
        <path d="M20 28h24M20 34h16M20 40h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.4"/>
        <path d="M32 4v8M24 8l8-4 8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/>
      </svg>
      <p>背包空空如也，去商店看看吧</p>
    </div>
  </div>
</template>

<style scoped>
.inventory-container {
  padding: 20px;
  padding-top: 92px;
  min-height: calc(100vh - 120px);
}

.inventory-header {
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

/* 道具网格 */
.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.item-card {
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg-color-primary);
  transition: all 0.2s ease;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px var(--shadow-color);
}

.item-card--equipped {
  position: relative;
}

.item-card--equipped::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  box-shadow: inset 0 0 0 2px var(--primary-color);
  pointer-events: none;
}

.item-preview {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  background: var(--bg-color-secondary);
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  color: var(--text-color-tertiary);
}

.equipped-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.equipped-icon {
  width: 14px;
  height: 14px;
  color: #fff;
}

.item-info {
  padding: 10px 12px;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
  line-height: 1.3;
}

.item-type {
  font-size: 12px;
  color: var(--text-color-tertiary);
}

.item-action {
  padding: 0 12px 12px;
}

.btn {
  width: 100%;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.btn-equip {
  background: var(--primary-color);
  color: #fff;
}

.btn-equip:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-equip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-unequip {
  background: var(--bg-color-tertiary);
  color: var(--text-color-primary);
  border: 1px solid var(--border-color-primary);
}

.btn-unequip:hover:not(:disabled) {
  background: var(--border-color-primary);
}

.btn-unequip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  .inventory-container {
    padding: 16px;
  }

  .inventory-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .filter-tags {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }
}
</style>
