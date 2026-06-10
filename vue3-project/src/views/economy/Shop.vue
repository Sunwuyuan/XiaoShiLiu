<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useEconomyStore } from '@/stores/economy.js'
import LoadingSpinner from '@/components/spinner/LoadingSpinner.vue'
import EconomyStatusBar from '@/components/economy/EconomyStatusBar.vue'
import messageManager from '@/utils/messageManager.js'

const economyStore = useEconomyStore()

// 筛选状态
const activeCategory = ref('all')
const activeRarity = ref('all')

// 分类选项（id 必须与数据库 item_type 一致）
const categories = [
  { id: 'all', label: '全部' },
  { id: 'frame', label: '头像框' },
  { id: 'accessory', label: '头饰' },
  { id: 'name_style', label: '用户名' },
  { id: 'card_bg', label: '背景' },
  { id: 'chat_bubble', label: '气泡' }
]

// 稀有度选项
const rarities = [
  { id: 'all', label: '全部', color: '' },
  { id: 'common', label: '普通', color: '#9CA3AF' },
  { id: 'rare', label: '稀有', color: '#3B82F6' },
  { id: 'epic', label: '史诗', color: '#A855F7' },
  { id: 'legendary', label: '传说', color: '#F59E0B' },
  { id: 'mythic', label: '神话', color: '' }
]

// 稀有度颜色映射
const rarityColorMap = {
  common: '#9CA3AF',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
  mythic: 'rainbow'
}

// 获取稀有度颜色样式
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

// 获取稀有度边框样式
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

// 获取稀有度背景样式
function getRarityBgStyle(rarity) {
  const color = rarityColorMap[rarity]
  if (color === 'rainbow') {
    return {
      background: 'linear-gradient(135deg, rgba(255,0,0,0.05), rgba(0,119,255,0.05), rgba(139,0,255,0.05))'
    }
  }
  if (color) {
    return { background: `${color}08` }
  }
  return {}
}

// 过滤后的商品列表
const filteredItems = computed(() => {
  let items = economyStore.shopItems
  if (activeCategory.value !== 'all') {
    items = items.filter(item => item.item_type === activeCategory.value)
  }
  if (activeRarity.value !== 'all') {
    items = items.filter(item => item.rarity === activeRarity.value)
  }
  return items
})

// 判断是否已拥有
function isOwned(item) {
  return item.owned === true
}

// 购买状态
const buyingId = ref(null)

// 购买道具
async function handleBuy(item) {
  if (buyingId.value) return
  buyingId.value = item.item_id

  try {
    const res = await economyStore.doBuyItem({ item_id: item.item_id })
    if (res.success) {
      messageManager.success('购买成功')
      // 刷新商店列表和余额
      await Promise.all([
        economyStore.fetchShopItems(),
        economyStore.fetchEconomy()
      ])
    } else {
      messageManager.error(res.message || '购买失败')
    }
  } catch (error) {
    messageManager.error('购买失败')
  } finally {
    buyingId.value = null
  }
}

// 加载数据
async function loadShop() {
  const params = {}
  if (activeCategory.value !== 'all') params.category = activeCategory.value
  if (activeRarity.value !== 'all') params.rarity = activeRarity.value
  await economyStore.fetchShopItems(params)
}

// 监听筛选变化
watch([activeCategory, activeRarity], () => {
  economyStore.shopPagination.page = 1
  loadShop()
})

onMounted(() => {
  loadShop()
})
</script>

<template>
  <div class="shop-container">
    <!-- 经济状态栏 -->
    <EconomyStatusBar />

    <!-- 页面标题 -->
    <div class="shop-header">
      <div class="header-info">
        <h1 class="page-title">商店</h1>
        <p class="page-desc">使用 Pi 或 Alpha 购买个性化道具</p>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-section">
        <span class="filter-label">类型</span>
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
      <div class="filter-section">
        <span class="filter-label">稀有度</span>
        <div class="filter-tags">
          <button
            v-for="rarity in rarities"
            :key="rarity.id"
            :class="['filter-tag', { active: activeRarity === rarity.id }]"
            :style="activeRarity === rarity.id && rarity.color ? { borderColor: rarity.color, color: rarity.color } : {}"
            @click="activeRarity = rarity.id"
          >
            <span
              v-if="rarity.id === 'mythic'"
              class="rarity-dot rarity-dot--mythic"
            />
            {{ rarity.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <LoadingSpinner v-if="economyStore.isLoadingShop" />

    <!-- 商品列表 -->
    <div v-else class="shop-grid">
      <div
        v-for="item in filteredItems"
        :key="item.item_id"
        class="item-card"
        :style="getRarityBorderStyle(item.rarity)"
      >
        <div class="item-preview" :style="getRarityBgStyle(item.rarity)">
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
        </div>

        <div class="item-info">
          <div class="item-name" :style="getRarityStyle(item.rarity)">
            {{ item.name }}
          </div>
          <div class="item-meta">
            <span class="item-type">{{ categories.find(c => c.id === item.item_type)?.label || item.item_type }}</span>
          </div>
          <div class="item-price">
            <span v-if="item.price_pi" class="price-tag price-pi">
              <svg class="price-icon" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1"/>
                <path d="M6 3.5v5M5 4.5c0-.55.45-1 1-1h.5c.55 0 1 .45 1 1s-.45 1-1 1h-1C5 6.5 4.5 7 4.5 7.5S5 8.5 5.5 8.5h.5c.55 0 1-.45 1-1" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>
              </svg>
              {{ item.price_pi }}
            </span>
            <span v-if="item.price_alpha" class="price-tag price-alpha">
              <svg class="price-icon" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1"/>
                <path d="M7 3L4 9h1.5l1.5-2.25L8.5 9H10L7 3z" fill="currentColor"/>
              </svg>
              {{ item.price_alpha }}
            </span>
          </div>
        </div>

        <div class="item-action">
          <button
            v-if="isOwned(item)"
            class="btn btn-owned"
            disabled
          >
            已拥有
          </button>
          <button
            v-else
            class="btn btn-buy"
            :disabled="buyingId === item.item_id"
            @click="handleBuy(item)"
          >
            <span v-if="buyingId === item.item_id" class="btn-loading">...</span>
            <span v-else>购买</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!economyStore.isLoadingShop && filteredItems.length === 0" class="empty-state">
      <svg viewBox="0 0 64 64" fill="none" class="empty-icon">
        <rect x="12" y="16" width="40" height="32" rx="4" stroke="currentColor" stroke-width="2"/>
        <path d="M24 28h16M24 34h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <circle cx="48" cy="20" r="12" fill="var(--bg-color-primary)" stroke="currentColor" stroke-width="2"/>
        <path d="M44 20l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <p>暂无符合条件的道具</p>
    </div>
  </div>
</template>

<style scoped>
.shop-container {
  padding: 20px;
  padding-top: 92px;
  min-height: calc(100vh - 120px);
}

.shop-header {
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

/* 筛选栏 */
.filter-bar {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 13px;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.filter-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

.rarity-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.rarity-dot--mythic {
  background: linear-gradient(90deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8b00ff);
}

/* 商品网格 */
.shop-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
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

.item-preview {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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
  background: var(--bg-color-secondary);
}

.placeholder-icon {
  width: 48px;
  height: 48px;
  color: var(--text-color-tertiary);
}

.item-info {
  padding: 12px;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
}

.item-meta {
  margin-bottom: 8px;
}

.item-type {
  font-size: 12px;
  color: var(--text-color-tertiary);
}

.item-price {
  display: flex;
  gap: 8px;
  align-items: center;
}

.price-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  font-weight: 600;
}

.price-icon {
  width: 14px;
  height: 14px;
}

.price-pi {
  color: #3B82F6;
}

.price-alpha {
  color: #F59E0B;
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

.btn-buy {
  background: var(--primary-color);
  color: #fff;
}

.btn-buy:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-buy:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-owned {
  background: var(--bg-color-tertiary);
  color: var(--text-color-tertiary);
  cursor: default;
}

.btn-loading {
  display: inline-block;
  animation: loading-dots 1s steps(3) infinite;
}

@keyframes loading-dots {
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
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
  .shop-container {
    padding: 16px;
  }

  .shop-header {
    flex-direction: column;
  }

  .shop-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
  }

  .filter-tags {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }
}
</style>
