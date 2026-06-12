<script setup>
import DropdownItem from '@/components/menu/DropdownItem.vue'
import DropdownDivider from '@/components/menu/DropdownDivider.vue'
import ThemeSwitcherMenuItem from '@/components/menu/ThemeSwitcherMenuItem.vue'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useAboutStore } from '@/stores/about'
import { useKeyboardShortcutsStore } from '@/stores/keyboardShortcuts'
import { useAccountSecurityStore } from '@/stores/accountSecurity'
import ColorPickerMenuItem from '@/components/menu/ColorPickerMenuItem.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()
const aboutStore = useAboutStore()
const keyboardShortcutsStore = useKeyboardShortcutsStore()
const accountSecurityStore = useAccountSecurityStore()

// 游戏功能导航
const gameMenuItems = [
  { key: 'game', label: 'MC外置登录', path: '/game' },
  { key: 'shop', label: '商店', path: '/economy/shop' },
  { key: 'inventory', label: '背包', path: '/economy/inventory' },
  { key: 'tasks', label: '任务', path: '/economy/tasks' },
  { key: 'achievements', label: '成就', path: '/economy/achievements' }
]

// 登录处理
const handleLoginClick = () => {
  authStore.openLoginModal()
}

// 退出登录处理
const handleLogout = async () => {
  try {
    await userStore.logout()
    // 退出登录后刷新页面，避免保留错误信息
    window.location.reload()
  } catch (error) {
    console.error('退出登录失败:', error)
  }
}

// 菜单项点击处理
const handleMenuClick = (action) => {
  if (action === 'about') {
    aboutStore.openAboutModal()
  } else if (action === 'logout') {
    handleLogout()
  } else if (action === 'login') {
    handleLoginClick()
  } else if (action === 'accountSecurity') {
    accountSecurityStore.openAccountSecurityModal()
  } else if (action === 'keyboardShortcuts') {
    keyboardShortcutsStore.openKeyboardShortcutsModal()
  }
}

// 经济系统导航处理
const handleEconomyNav = (path) => {
  router.push(path)
}
</script>

<template>
  <DropdownItem @click="handleMenuClick('about')">
    关于悦社
  </DropdownItem>
  <DropdownItem @click="handleMenuClick('keyboardShortcuts')">
    键盘快捷键
  </DropdownItem>
  <DropdownItem v-if="userStore.isLoggedIn" @click="handleMenuClick('accountSecurity')">
    账号与安全
  </DropdownItem>
  <DropdownDivider v-if="userStore.isLoggedIn" />
  <DropdownItem v-if="userStore.isLoggedIn" v-for="item in gameMenuItems" :key="item.key" @click="handleEconomyNav(item.path)">
    <span class="economy-menu-item">
      <svg class="economy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-if="item.key === 'game'">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
      <svg class="economy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="item.key === 'shop'">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      <svg class="economy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="item.key === 'inventory'">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
      <svg class="economy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="item.key === 'tasks'">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
      <svg class="economy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-else-if="item.key === 'achievements'">
        <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
      </svg>
      {{ item.label }}
    </span>
  </DropdownItem>
  <DropdownDivider />
  <ColorPickerMenuItem />
  <ThemeSwitcherMenuItem />

  <DropdownItem v-if="userStore.isLoggedIn" @click="handleMenuClick('logout')">
    退出登录
  </DropdownItem>
  <DropdownItem v-else @click="handleMenuClick('login')">
    登录/注册
  </DropdownItem>
</template>

<style scoped>
.economy-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.economy-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.7;
}
</style>
