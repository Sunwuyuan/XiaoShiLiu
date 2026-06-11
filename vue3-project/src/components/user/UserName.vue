<script setup>
import { computed } from 'vue'

const props = defineProps({
  nickname: {
    type: String,
    default: ''
  },
  // 经济系统的 style_config JSON 对象
  styleConfig: {
    type: [Object, String, null],
    default: null
  },
  // 兼容旧接口：简单样式名
  nameStyle: {
    type: String,
    default: ''
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

// 解析样式类型
const resolvedStyle = computed(() => {
  // 优先使用 styleConfig
  if (props.styleConfig) {
    let config = props.styleConfig
    if (typeof config === 'string') {
      try { config = JSON.parse(config) } catch { return 'solid' }
    }
    return config.type || 'solid'
  }
  // 兼容旧接口
  if (props.nameStyle) return props.nameStyle
  return 'solid'
})

// 解析内联样式（用于渐变色等动态样式）
const inlineStyle = computed(() => {
  if (!props.styleConfig) return {}
  let config = props.styleConfig
  if (typeof config === 'string') {
    try { config = JSON.parse(config) } catch { return {} }
  }

  const style = {}

  // 渐变类型
  if (config.type === 'gradient' && config.colors) {
    const dir = config.direction || 'to right'
    style.background = `linear-gradient(${dir}, ${config.colors.join(', ')})`
    style.webkitBackgroundClip = 'text'
    style.webkitTextFillColor = 'transparent'
    style.backgroundClip = 'text'
  }

  // 霓虹类型
  if (config.type === 'neon' && config.color) {
    style.color = config.color
    const glow = config.glowColor || config.color
    const intensity = config.glowIntensity || 10
    style.textShadow = `0 0 ${intensity/3}px ${glow}, 0 0 ${intensity}px ${glow}, 0 0 ${intensity*2}px ${glow}`
  }

  // 流光类型
  if (config.type === 'shimmer') {
    const color = config.color || 'var(--text-color-primary)'
    const shimmerColor = config.shimmerColor || '#FFD700'
    style.background = `linear-gradient(90deg, ${color} 0%, ${color} 40%, ${shimmerColor} 50%, ${color} 60%, ${color} 100%)`
    style.backgroundSize = '200% auto'
    style.webkitBackgroundClip = 'text'
    style.webkitTextFillColor = 'transparent'
    style.backgroundClip = 'text'
    style.animation = 'shimmer-move 2.5s ease-in-out infinite'
  }

  return style
})

// CSS class（用于内置动画样式）
const styleClass = computed(() => {
  // 如果有内联样式，不需要 class
  if (Object.keys(inlineStyle.value).length > 0) return ''
  return `username--${resolvedStyle.value}`
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
</script>

<template>
  <span class="username-wrapper">
    <span
      class="username"
      :class="styleClass"
      :style="inlineStyle"
    >{{ nickname || 'Unknown' }}</span>
    <span
      v-if="showLevel && level > 0"
      class="username-level"
    >
      [{{ levelKeyMap }}]
    </span>
  </span>
</template>

<style scoped>
.username-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  line-height: 1;
}

.username {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========== solid - 纯色 ========== */
.username--solid {
  color: var(--text-color-primary);
}

/* ========== gradient - 渐变（默认） ========== */
.username--gradient {
  background: var(--primary-color);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* ========== rainbow - 彩虹 ========== */
.username--rainbow {
  background: linear-gradient(
    90deg,
    #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8b00ff, #ff0000
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: rainbow-shift 3s linear infinite;
}

@keyframes rainbow-shift {
  0% { background-position: 0% center; }
  100% { background-position: 200% center; }
}

/* ========== shimmer - 闪光 ========== */
.username--shimmer {
  background: linear-gradient(
    90deg,
    var(--text-color-primary) 0%, var(--text-color-primary) 40%,
    #a78bfa 50%,
    var(--text-color-primary) 60%, var(--text-color-primary) 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer-move 2.5s ease-in-out infinite;
}

@keyframes shimmer-move {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* ========== neon - 霓虹（默认绿色） ========== */
.username--neon {
  color: #00ffcc;
  text-shadow:
    0 0 4px rgba(0, 255, 204, 0.6),
    0 0 8px rgba(0, 255, 204, 0.4),
    0 0 16px rgba(0, 255, 204, 0.2);
}

/* ========== fire - 火焰 ========== */
.username--fire {
  background: linear-gradient(0deg, #ff4500 0%, #ff6a00 25%, #ffa500 50%, #ffcc00 75%, #ff6a00 100%);
  background-size: 100% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: fire-flicker 1.5s ease-in-out infinite alternate;
}

@keyframes fire-flicker {
  0% { background-position: 0% 0%; filter: brightness(1); }
  50% { background-position: 0% 50%; filter: brightness(1.1); }
  100% { background-position: 0% 100%; filter: brightness(1); }
}

/* ========== combo - 组合 ========== */
.username--combo {
  background: linear-gradient(90deg, #ff0000, #ff7700, #ffff00, #00ff00, #0077ff, #8b00ff, #ff0000);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: combo-move 2s linear infinite;
}

@keyframes combo-move {
  0% { background-position: 0% center; filter: brightness(1); }
  50% { background-position: 100% center; filter: brightness(1.3); }
  100% { background-position: 200% center; filter: brightness(1); }
}

/* ========== 等级徽章 ========== */
.username-level {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 11px;
  color: var(--text-color-secondary);
  background: var(--bg-color-tertiary);
  border: 1px solid var(--border-color-secondary);
  border-radius: 4px;
  padding: 0 4px;
  line-height: 18px;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
</style>
