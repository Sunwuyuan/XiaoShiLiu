<script setup>
import { computed } from 'vue'
import UserAvatar from '../user/UserAvatar.vue'
import UserName from '../user/UserName.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

// 解析 style_config
const styleConfig = computed(() => {
  const config = props.item.style_config
  if (!config) return null
  if (typeof config === 'string') {
    try { return JSON.parse(config) } catch { return null }
  }
  return config
})

// 根据商品类型渲染不同预览
const previewType = computed(() => props.item.item_type)

// 模拟用户数据用于预览
const previewUser = {
  nickname: '预览用户',
  avatar: '',
  level: 5
}

// 头像框预览：用 UserAvatar 组件
const framePreview = computed(() => {
  if (previewType.value !== 'frame') return null
  return {
    frameConfig: styleConfig.value
  }
})

// 头饰预览：用 UserAvatar 组件
const accessoryPreview = computed(() => {
  if (previewType.value !== 'accessory') return null
  return {
    accessoryConfig: styleConfig.value
  }
})

// 名字样式预览：用 UserName 组件
const nameStylePreview = computed(() => {
  if (previewType.value !== 'name_style') return null
  return {
    styleConfig: styleConfig.value
  }
})

// 名片背景预览
const cardBgPreview = computed(() => {
  if (previewType.value !== 'card_bg') return null
  const config = styleConfig.value
  if (!config) return null

  const style = {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
  }

  if (config.background) {
    // 种子数据直接存储了 background 字符串
    style.background = config.background
  } else if (config.type === 'gradient' && config.colors) {
    const dir = config.direction || 'to right'
    style.background = `linear-gradient(${dir}, ${config.colors.join(', ')})`
  } else if (config.backgroundColor) {
    style.background = config.backgroundColor
  } else if (config.imageUrl) {
    style.backgroundImage = `url(${config.imageUrl})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  } else {
    // 默认渐变
    style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }

  if (config.pattern) {
    style.backgroundImage = `${style.backgroundImage || ''}, ${config.pattern}`
  }

  return style
})

// 判断颜色亮度，返回黑/白文字
function getContrastColor(bgColor) {
  if (!bgColor) return '#fff'
  // 提取 hex 颜色
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16) || 0
  const g = parseInt(hex.substr(2, 2), 16) || 0
  const b = parseInt(hex.substr(4, 2), 16) || 0
  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 180 ? '#1a1a1a' : '#fff'
}

// 聊天气泡预览
const chatBubblePreview = computed(() => {
  if (previewType.value !== 'chat_bubble') return null
  const config = styleConfig.value
  if (!config) return null

  const style = {
    padding: '8px 14px',
    borderRadius: '16px',
    fontSize: '13px',
    maxWidth: '80%',
    wordBreak: 'break-all',
  }

  if (config.background) {
    // 种子数据直接存储了 background 字符串
    style.background = config.background
    // 自动判断文字颜色
    const isGradient = config.background.includes('gradient')
    style.color = config.textColor || (isGradient ? '#fff' : getContrastColor(config.background))
  } else if (config.type === 'gradient' && config.colors) {
    const dir = config.direction || 'to right'
    style.background = `linear-gradient(${dir}, ${config.colors.join(', ')})`
    style.color = '#fff'
  } else if (config.backgroundColor) {
    style.background = config.backgroundColor
    style.color = config.textColor || getContrastColor(config.backgroundColor)
  } else if (config.borderColor) {
    style.border = `2px solid ${config.borderColor}`
    style.background = config.backgroundColor || 'var(--bg-color-secondary)'
    style.color = config.textColor || 'var(--text-color-primary)'
  } else {
    style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    style.color = '#fff'
  }

  if (config.glowColor) {
    style.boxShadow = `0 0 8px ${config.glowColor}40`
  }

  return style
})

// 光标皮肤预览
const cursorPreview = computed(() => {
  if (previewType.value !== 'cursor') return null
  const config = styleConfig.value
  if (!config) return null

  const style = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
  }

  if (config.color) {
    style.color = config.color
  }

  return style
})

const cursorStyle = computed(() => {
  if (previewType.value !== 'cursor') return 'default'
  const config = styleConfig.value
  if (!config) return 'default'
  return config.cursor || 'default'
})

// 入场特效预览
const enterEffectPreview = computed(() => {
  if (previewType.value !== 'enter_effect') return null
  const config = styleConfig.value
  if (!config) return null

  const colors = config.colors || ['#667eea', '#764ba2']
  const color = config.color || colors[0]

  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '16px',
    borderRadius: '12px',
    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
    border: `2px solid ${color}40`,
    color: color,
  }
})

const enterEffectName = computed(() => {
  if (previewType.value !== 'enter_effect') return ''
  const config = styleConfig.value
  if (!config) return '入场特效'
  const typeMap = {
    confetti: '🎉 彩带飘落',
    spotlight: '🔦 聚光灯',
    fireworks: '🎆 烟花绽放',
    portal: '🌀 传送门',
  }
  return typeMap[config.type] || '✨ 入场特效'
})

// 加载画面预览
const loadingSpinnerStyle = computed(() => {
  if (previewType.value !== 'loading_screen') return null
  const config = styleConfig.value
  if (!config) return null

  const animationMap = {
    cat: { borderColor: '#ff9ff3', borderTopColor: 'transparent' },
    stars: { borderColor: '#54a0ff', borderTopColor: 'transparent' },
    matrix: { borderColor: '#2ed573', borderTopColor: 'transparent' },
    ink: { borderColor: '#576574', borderTopColor: 'transparent' },
  }

  return animationMap[config.animation] || { borderColor: '#667eea', borderTopColor: 'transparent' }
})

const loadingText = computed(() => {
  if (previewType.value !== 'loading_screen') return ''
  const config = styleConfig.value
  return config?.text || '加载中...'
})
</script>

<template>
  <div class="shop-item-preview">
    <!-- 头像框预览 -->
    <template v-if="previewType === 'frame'">
      <div class="preview-avatar-wrapper">
        <UserAvatar
          :avatar="previewUser.avatar"
          :nickname="previewUser.nickname"
          :frameConfig="framePreview.frameConfig"
          :size="'lg'"
        />
      </div>
    </template>

    <!-- 头饰预览 -->
    <template v-else-if="previewType === 'accessory'">
      <div class="preview-avatar-wrapper">
        <UserAvatar
          :avatar="previewUser.avatar"
          :nickname="previewUser.nickname"
          :accessoryConfig="accessoryPreview.accessoryConfig"
          :size="'lg'"
        />
      </div>
    </template>

    <!-- 用户名样式预览 -->
    <template v-else-if="previewType === 'name_style'">
      <div class="preview-name-wrapper">
        <UserName
          :nickname="previewUser.nickname"
          :styleConfig="nameStylePreview.styleConfig"
          :level="previewUser.level"
          :showLevel="true"
        />
      </div>
    </template>

    <!-- 名片背景预览 -->
    <template v-else-if="previewType === 'card_bg'">
      <div class="preview-card-wrapper" :style="cardBgPreview">
        <div class="preview-card-content">
          <UserAvatar
            :avatar="previewUser.avatar"
            :nickname="previewUser.nickname"
            :size="'sm'"
          />
          <span class="preview-card-name">{{ previewUser.nickname }}</span>
        </div>
      </div>
    </template>

    <!-- 聊天气泡预览 -->
    <template v-else-if="previewType === 'chat_bubble'">
      <div class="preview-bubble-wrapper">
        <div class="preview-bubble" :style="chatBubblePreview">
          这是一条消息预览
        </div>
      </div>
    </template>

    <!-- 光标皮肤预览 -->
    <template v-else-if="previewType === 'cursor'">
      <div class="preview-cursor-wrapper">
        <div class="preview-cursor-area" :style="cursorPreview">
          <span class="cursor-label">移动鼠标试试</span>
          <div class="cursor-demo" :style="{ cursor: cursorStyle }">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"/>
            </svg>
          </div>
        </div>
      </div>
    </template>

    <!-- 入场特效预览 -->
    <template v-else-if="previewType === 'enter_effect'">
      <div class="preview-enter-wrapper">
        <div class="preview-enter-effect" :style="enterEffectPreview">
          <div class="enter-icon">✨</div>
          <span class="enter-label">{{ enterEffectName }}</span>
        </div>
      </div>
    </template>

    <!-- 加载画面预览 -->
    <template v-else-if="previewType === 'loading_screen'">
      <div class="preview-loading-wrapper">
        <div class="preview-loading">
          <div class="loading-spinner" :style="loadingSpinnerStyle"></div>
          <span class="loading-text">{{ loadingText }}</span>
        </div>
      </div>
    </template>

    <!-- 未知类型 -->
    <template v-else>
      <div class="preview-unknown">
        <svg viewBox="0 0 48 48" fill="none" class="unknown-icon">
          <rect x="8" y="8" width="32" height="32" rx="8" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <path d="M24 16v16M16 24h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/>
        </svg>
      </div>
    </template>
  </div>
</template>

<style scoped>
.shop-item-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.preview-avatar-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.preview-name-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  font-size: 16px;
}

.preview-card-wrapper {
  width: 90%;
  height: 80%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-card-content {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 12px;
  border-radius: 20px;
  backdrop-filter: blur(4px);
}

.preview-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.preview-bubble-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  width: 100%;
}

.preview-bubble {
  display: inline-block;
}

.preview-unknown {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-tertiary);
}

.unknown-icon {
  width: 40px;
  height: 40px;
}

/* 光标预览 */
.preview-cursor-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.preview-cursor-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.cursor-label {
  font-size: 11px;
  color: var(--text-color-tertiary);
}

.cursor-demo {
  padding: 12px 24px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  border: 2px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 入场特效预览 */
.preview-enter-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 8px;
}

.preview-enter-effect {
  width: 100%;
  text-align: center;
}

.enter-icon {
  font-size: 28px;
  animation: enterBounce 1.5s ease-in-out infinite;
}

@keyframes enterBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.enter-label {
  font-size: 12px;
  font-weight: 600;
}

/* 加载画面预览 */
.preview-loading-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 11px;
  color: var(--text-color-secondary);
}
</style>
