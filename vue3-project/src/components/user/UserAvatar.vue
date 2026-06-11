<script setup>
import { computed } from 'vue'
import defaultAvatar from '@/assets/imgs/avatar.png'

const props = defineProps({
  avatar: {
    type: String,
    default: ''
  },
  nickname: {
    type: String,
    default: ''
  },
  // 经济系统头像框 style_config
  frameConfig: {
    type: [Object, String, null],
    default: null
  },
  // 经济系统头饰 style_config
  accessoryConfig: {
    type: [Object, String, null],
    default: null
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
  },
  level: {
    type: Number,
    default: 0
  },
  // 后端返回的等级称号（如 F1, Tab, Shift 等），优先使用
  levelTitle: {
    type: String,
    default: ''
  },
  showLevel: {
    type: Boolean,
    default: false
  }
})

const sizeMap = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 }

const avatarSize = computed(() => sizeMap[props.size] || 40)
const framePadding = computed(() => props.size === 'xs' ? 2 : props.size === 'sm' ? 3 : 4)
const frameSize = computed(() => avatarSize.value + framePadding.value * 2)

const avatarUrl = computed(() => props.avatar || defaultAvatar)

// 解析 style_config
function parseConfig(config) {
  if (!config) return null
  if (typeof config === 'string') {
    try { return JSON.parse(config) } catch { return null }
  }
  return config
}

// 头像框内联样式
const frameStyle = computed(() => {
  const config = parseConfig(props.frameConfig)
  if (!config) return null

  const style = {
    width: frameSize.value + 'px',
    height: frameSize.value + 'px',
    borderRadius: '50%',
    padding: framePadding.value + 'px',
    position: 'relative',
  }

  if (config.borderColor) {
    if (config.animated) {
      // 动画渐变边框
      style.background = config.borderColor
      style.backgroundSize = '300% 300%'
      style.animation = 'frame-gradient-rotate 3s linear infinite'
    } else {
      style.border = `${config.borderWidth || 3}px solid ${config.borderColor}`
    }
  }

  if (config.glowColor) {
    const intensity = config.glowIntensity || 10
    style.boxShadow = `0 0 ${intensity}px ${config.glowColor}, 0 0 ${intensity * 2}px ${config.glowColor}40`
  }

  return style
})

// 头饰内联样式
const accessoryStyle = computed(() => {
  const config = parseConfig(props.accessoryConfig)
  if (!config) return null

  const style = {
    position: 'absolute',
    top: '-4px',
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    zIndex: '1',
    fontSize: (avatarSize.value * 0.45) + 'px',
    lineHeight: '1',
  }

  if (config.color) {
    style.color = config.color
    style.filter = `drop-shadow(0 0 3px ${config.glowColor || config.color})`
  }

  return style
})

// 头饰图标
const accessoryIcon = computed(() => {
  const config = parseConfig(props.accessoryConfig)
  if (!config) return ''
  const typeIcons = {
    crown: '👑',
    halo: '😇',
    ears: '🐱',
  }
  return typeIcons[config.type] || ''
})

// 等级按键名（优先使用后端返回的 title，fallback 与后端 LEVEL_CONFIG 一致）
const levelKeyMap = computed(() => {
  if (props.levelTitle) return props.levelTitle
  const lv = props.level
  if (lv >= 20) return 'Space'
  if (lv >= 16) return 'Alt'
  if (lv >= 11) return 'Ctrl'
  if (lv >= 7) return 'Shift'
  if (lv >= 4) return 'Tab'
  if (lv >= 3) return 'F2'
  if (lv >= 2) return 'F1'
  if (lv >= 1) return 'Esc'
  return ''
})

function handleAvatarError(event) {
  event.target.src = defaultAvatar
}
</script>

<template>
  <div class="user-avatar" :class="`user-avatar--${size}`">
    <!-- 有头像框 -->
    <div v-if="frameStyle" class="avatar-frame" :style="frameStyle">
      <img
        :src="avatarUrl"
        :alt="nickname"
        class="avatar-img"
        :style="{ width: avatarSize + 'px', height: avatarSize + 'px' }"
        @error="handleAvatarError"
      />
    </div>

    <!-- 无头像框 -->
    <div v-else class="avatar-wrapper" :style="{ width: avatarSize + 'px', height: avatarSize + 'px' }">
      <img
        :src="avatarUrl"
        :alt="nickname"
        class="avatar-img"
        :style="{ width: avatarSize + 'px', height: avatarSize + 'px' }"
        @error="handleAvatarError"
      />
    </div>

    <!-- 头饰 -->
    <div v-if="accessoryIcon" class="avatar-accessory" :style="accessoryStyle">
      {{ accessoryIcon }}
    </div>

    <!-- 等级徽章 -->
    <div
      v-if="showLevel && level > 0"
      class="level-badge"
      :style="{
        fontSize: size === 'xs' ? '7px' : size === 'sm' ? '8px' : size === 'md' ? '9px' : size === 'lg' ? '10px' : '11px',
        padding: size === 'xs' ? '0 2px' : size === 'sm' ? '0 3px' : '0 4px',
        lineHeight: size === 'xs' ? '12px' : size === 'sm' ? '14px' : '16px'
      }"
    >
      {{ levelKeyMap }}
    </div>
  </div>
</template>

<style scoped>
.user-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
}

.avatar-wrapper {
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border-color-secondary);
  position: relative;
}

.avatar-img {
  border-radius: 50%;
  object-fit: cover;
  display: block;
  background: var(--bg-color-tertiary);
}

.avatar-accessory {
  position: absolute;
  top: -2px;
  left: 50%;
  transform: translateX(-50%);
  pointer-events: none;
  z-index: 1;
}

.level-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: var(--bg-color-inverse);
  color: var(--text-color-inverse);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-weight: 700;
  border: 1px solid var(--border-color-secondary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 2;
  white-space: nowrap;
  text-align: center;
  min-width: 16px;
}

@keyframes frame-gradient-rotate {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
</style>
