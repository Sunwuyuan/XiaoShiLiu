import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  getEconomy,
  getLevel,
  getEquipped,
  getInventory,
  equipItem,
  unequipItem,
  getTransactions,
  getShopItems,
  buyItem,
  getTasks,
  claimTask,
  getAchievements,
  claimAchievement
} from '@/api/economy.js'

export const useEconomyStore = defineStore('economy', () => {
  // ========== 经济信息 ==========
  const economy = ref(null)
  const isLoadingEconomy = ref(false)

  // ========== 等级信息 ==========
  const level = ref(null)
  const isLoadingLevel = ref(false)

  // ========== 装备信息 ==========
  const equipped = ref(null)
  const isLoadingEquipped = ref(false)

  // ========== 背包 ==========
  const inventory = ref([])
  const inventoryPagination = ref({
    page: 1,
    limit: 20,
    total: 0
  })
  const isLoadingInventory = ref(false)

  // ========== 交易记录 ==========
  const transactions = ref([])
  const transactionsPagination = ref({
    page: 1,
    limit: 20,
    total: 0
  })
  const isLoadingTransactions = ref(false)

  // ========== 商店 ==========
  const shopItems = ref([])
  const shopPagination = ref({
    page: 1,
    limit: 20,
    total: 0
  })
  const isLoadingShop = ref(false)

  // ========== 任务 ==========
  const tasks = ref(null)
  const isLoadingTasks = ref(false)

  // ========== 成就 ==========
  const achievements = ref([])
  const isLoadingAchievements = ref(false)

  // ========== 计算属性 ==========

  // Pi 币余额
  const piBalance = computed(() => economy.value?.pi_keys ?? 0)

  // Alpha 币余额
  const alphaBalance = computed(() => economy.value?.alpha_keys ?? 0)

  // 当前等级
  const currentLevel = computed(() => level.value?.level ?? 0)

  // 当前经验值
  const currentExp = computed(() => level.value?.exp ?? 0)

  // 升级所需经验
  const requiredExp = computed(() => level.value?.next_level_exp ?? 0)

  // 经验百分比
  const expPercentage = computed(() => {
    if (!requiredExp.value) return 0
    return Math.min(Math.round((currentExp.value / requiredExp.value) * 100), 100)
  })

  // ========== 方法 ==========

  // 获取经济信息
  async function fetchEconomy() {
    try {
      isLoadingEconomy.value = true
      const res = await getEconomy()
      if (res.success) {
        economy.value = res.data
      }
      return res
    } catch (error) {
      console.error('获取经济信息失败:', error)
      return { success: false, message: '获取经济信息失败' }
    } finally {
      isLoadingEconomy.value = false
    }
  }

  // 获取等级信息
  async function fetchLevel() {
    try {
      isLoadingLevel.value = true
      const res = await getLevel()
      if (res.success) {
        level.value = res.data
      }
      return res
    } catch (error) {
      console.error('获取等级信息失败:', error)
      return { success: false, message: '获取等级信息失败' }
    } finally {
      isLoadingLevel.value = false
    }
  }

  // 获取已装备道具
  async function fetchEquipped() {
    try {
      isLoadingEquipped.value = true
      const res = await getEquipped()
      if (res.success) {
        equipped.value = res.data
      }
      return res
    } catch (error) {
      console.error('获取装备信息失败:', error)
      return { success: false, message: '获取装备信息失败' }
    } finally {
      isLoadingEquipped.value = false
    }
  }

  // 获取背包
  async function fetchInventory(params = {}) {
    try {
      isLoadingInventory.value = true
      const res = await getInventory({
        page: inventoryPagination.value.page,
        limit: inventoryPagination.value.limit,
        ...params
      })
      if (res.success) {
        inventory.value = res.data?.items || res.data || []
        if (res.data?.pagination) {
          inventoryPagination.value = {
            ...inventoryPagination.value,
            ...res.data.pagination
          }
        }
      }
      return res
    } catch (error) {
      console.error('获取背包失败:', error)
      return { success: false, message: '获取背包失败' }
    } finally {
      isLoadingInventory.value = false
    }
  }

  // 装备道具
  async function doEquipItem(data) {
    try {
      const res = await equipItem(data)
      if (res.success) {
        // 刷新装备和背包
        await Promise.all([fetchEquipped(), fetchInventory()])
      }
      return res
    } catch (error) {
      console.error('装备道具失败:', error)
      return { success: false, message: '装备道具失败' }
    }
  }

  // 卸下道具
  async function doUnequipItem(data) {
    try {
      const res = await unequipItem(data)
      if (res.success) {
        // 刷新装备和背包
        await Promise.all([fetchEquipped(), fetchInventory()])
      }
      return res
    } catch (error) {
      console.error('卸下道具失败:', error)
      return { success: false, message: '卸下道具失败' }
    }
  }

  // 获取交易记录
  async function fetchTransactions(params = {}) {
    try {
      isLoadingTransactions.value = true
      const res = await getTransactions({
        page: transactionsPagination.value.page,
        limit: transactionsPagination.value.limit,
        ...params
      })
      if (res.success) {
        transactions.value = res.data?.items || res.data || []
        if (res.data?.pagination) {
          transactionsPagination.value = {
            ...transactionsPagination.value,
            ...res.data.pagination
          }
        }
      }
      return res
    } catch (error) {
      console.error('获取交易记录失败:', error)
      return { success: false, message: '获取交易记录失败' }
    } finally {
      isLoadingTransactions.value = false
    }
  }

  // 获取商店列表
  async function fetchShopItems(params = {}) {
    try {
      isLoadingShop.value = true
      const res = await getShopItems({
        page: shopPagination.value.page,
        limit: shopPagination.value.limit,
        ...params
      })
      if (res.success) {
        shopItems.value = res.data?.items || res.data || []
        if (res.data?.pagination) {
          shopPagination.value = {
            ...shopPagination.value,
            ...res.data.pagination
          }
        }
      }
      return res
    } catch (error) {
      console.error('获取商店列表失败:', error)
      return { success: false, message: '获取商店列表失败' }
    } finally {
      isLoadingShop.value = false
    }
  }

  // 购买道具
  async function doBuyItem(data) {
    try {
      const res = await buyItem(data)
      if (res.success) {
        // 刷新经济信息和背包
        await Promise.all([fetchEconomy(), fetchInventory()])
      }
      return res
    } catch (error) {
      console.error('购买道具失败:', error)
      return { success: false, message: '购买道具失败' }
    }
  }

  // 获取任务列表
  async function fetchTasks() {
    try {
      isLoadingTasks.value = true
      const res = await getTasks()
      if (res.success) {
        // 后端返回扁平数组，按 task_type 分组
        const list = Array.isArray(res.data) ? res.data : []
        const grouped = { daily: [], weekly: [], main: [] }
        list.forEach(task => {
          const type = task.task_type
          if (grouped[type]) {
            grouped[type].push(task)
          }
        })
        tasks.value = grouped
      }
      return res
    } catch (error) {
      console.error('获取任务列表失败:', error)
      return { success: false, message: '获取任务列表失败' }
    } finally {
      isLoadingTasks.value = false
    }
  }

  // 领取任务奖励
  async function doClaimTask(data) {
    try {
      const res = await claimTask(data)
      if (res.success) {
        // 刷新任务列表和经济信息
        await Promise.all([fetchTasks(), fetchEconomy()])
      }
      return res
    } catch (error) {
      console.error('领取任务奖励失败:', error)
      return { success: false, message: '领取任务奖励失败' }
    }
  }

  // 获取成就列表
  async function fetchAchievements() {
    try {
      isLoadingAchievements.value = true
      const res = await getAchievements()
      if (res.success) {
        achievements.value = res.data || []
      }
      return res
    } catch (error) {
      console.error('获取成就列表失败:', error)
      return { success: false, message: '获取成就列表失败' }
    } finally {
      isLoadingAchievements.value = false
    }
  }

  // 领取成就奖励
  async function doClaimAchievement(data) {
    try {
      const res = await claimAchievement(data)
      if (res.success) {
        // 刷新成就列表和经济信息
        await Promise.all([fetchAchievements(), fetchEconomy()])
      }
      return res
    } catch (error) {
      console.error('领取成就奖励失败:', error)
      return { success: false, message: '领取成就奖励失败' }
    }
  }

  return {
    // 状态
    economy,
    isLoadingEconomy,
    level,
    isLoadingLevel,
    equipped,
    isLoadingEquipped,
    inventory,
    inventoryPagination,
    isLoadingInventory,
    transactions,
    transactionsPagination,
    isLoadingTransactions,
    shopItems,
    shopPagination,
    isLoadingShop,
    tasks,
    isLoadingTasks,
    achievements,
    isLoadingAchievements,

    // 计算属性
    piBalance,
    alphaBalance,
    currentLevel,
    currentExp,
    requiredExp,
    expPercentage,

    // 方法
    fetchEconomy,
    fetchLevel,
    fetchEquipped,
    fetchInventory,
    doEquipItem,
    doUnequipItem,
    fetchTransactions,
    fetchShopItems,
    doBuyItem,
    fetchTasks,
    doClaimTask,
    fetchAchievements,
    doClaimAchievement
  }
})
