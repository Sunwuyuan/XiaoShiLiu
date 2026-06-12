<script setup>
import { computed, ref } from 'vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import UserName from '@/components/user/UserName.vue'
import { useUserStore } from '@/stores/user.js'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  isSelf: {
    type: Boolean,
    default: false
  },
  showAvatar: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['reply', 'edit', 'recall', 'contextmenu'])

const userStore = useUserStore()

// 消息类型判断
const isSystem = computed(() => props.message.type === 'system')
const isImage = computed(() => props.message.type === 'image')
const isFile = computed(() => props.message.type === 'file')
const isRecalled = computed(() => props.message.is_recalled)
const isEdited = computed(() => props.message.is_edited || !!props.message.edited_at)

// 发送者信息
const sender = computed(() => props.message.sender || {})

// 引用回复
const replyTo = computed(() => props.message.reply_to)

// 格式化时间
function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 长按/右键菜单
let longPressTimer = null

function handleContextMenu(event) {
  if (isSystem.value || isRecalled.value) return
  event.preventDefault()
  event.stopPropagation()
  emit('contextmenu', {
    message: props.message,
    x: event.clientX,
    y: event.clientY
  })
}

function handleTouchStart(event) {
  if (isSystem.value || isRecalled.value) return
  longPressTimer = setTimeout(() => {
    const touch = event.touches[0]
    emit('contextmenu', {
      message: props.message,
      x: touch.clientX,
      y: touch.clientY
    })
  }, 500)
}

function handleTouchEnd() {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}
</script>

<template>
  <!-- 系统消息 -->
  <div v-if="isSystem" class="message-bubble message-bubble--system">
    <span class="system-text">{{ message.content }}</span>
  </div>

  <!-- 普通消息 -->
  <div
    v-else
    class="message-bubble"
    :class="{
      'message-bubble--self': isSelf,
      'message-bubble--other': !isSelf,
      'message-bubble--recalled': isRecalled
    }"
    @contextmenu="handleContextMenu"
    @touchstart.passive="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchmove="handleTouchEnd"
  >
    <!-- 头像 -->
    <div v-if="showAvatar && !isSelf" class="bubble-avatar">
      <UserAvatar
        :avatar="sender.avatar"
        :nickname="sender.nickname"
        size="sm"
      />
    </div>

    <div class="bubble-content-wrapper">
      <!-- 昵称 -->
      <div v-if="showAvatar && !isSelf" class="bubble-nickname">
        <UserName :nickname="sender.nickname || '未知用户'" />
      </div>

      <!-- 消息内容 -->
      <div class="bubble-content" :class="{ 'bubble-content--self': isSelf }">
        <!-- 引用回复 -->
        <div v-if="replyTo" class="reply-preview">
          <div class="reply-line"></div>
          <div class="reply-info">
            <span class="reply-name">{{ replyTo.sender?.nickname || '未知用户' }}</span>
            <span class="reply-text">{{ replyTo.content }}</span>
          </div>
        </div>

        <!-- 图片消息 -->
        <div v-if="isImage && !isRecalled" class="message-image">
          <img :src="message.content" alt="图片" loading="lazy" />
        </div>

        <!-- 文件消息 -->
        <div v-else-if="isFile && !isRecalled" class="message-file">
          <a :href="message.content" target="_blank" rel="noopener" class="file-link">
            <span class="file-icon">[文件]</span>
            <span class="file-name">{{ message.file_name || '点击下载' }}</span>
          </a>
        </div>

        <!-- 文字消息 -->
        <div v-else class="message-text">
          {{ message.content }}
        </div>

        <!-- 已编辑标记 -->
        <span v-if="isEdited && !isRecalled" class="edited-mark">(已编辑)</span>
      </div>

      <!-- 时间 -->
      <div class="bubble-time" :class="{ 'bubble-time--self': isSelf }">
        {{ formatTime(message.created_at) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-bubble {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 16px;
  position: relative;
}

.message-bubble--system {
  justify-content: center;
  padding: 8px 16px;
}

.message-bubble--self {
  flex-direction: row-reverse;
}

.system-text {
  font-size: 12px;
  color: var(--text-color-tertiary);
  background: var(--bg-color-tertiary);
  padding: 4px 12px;
  border-radius: 12px;
}

.bubble-avatar {
  flex-shrink: 0;
  margin-top: 2px;
}

.bubble-content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}

.bubble-nickname {
  margin-bottom: 2px;
  font-size: 12px;
}

.bubble-content {
  background: var(--bg-color-tertiary);
  padding: 10px 14px;
  border-radius: 16px;
  border-bottom-left-radius: 4px;
  word-break: break-word;
  position: relative;
}

.bubble-content--self {
  background: var(--primary-color);
  color: var(--text-color-inverse);
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 4px;
}

.message-bubble--recalled .bubble-content {
  background: var(--bg-color-tertiary);
  color: var(--text-color-tertiary);
  font-style: italic;
}

.message-text {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.message-image img {
  max-width: 240px;
  max-height: 240px;
  border-radius: 8px;
  cursor: pointer;
  object-fit: cover;
}

.message-file .file-link {
  display: flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  text-decoration: none;
}

.file-icon {
  font-size: 12px;
}

.file-name {
  font-size: 13px;
  text-decoration: underline;
}

.reply-preview {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  font-size: 12px;
}

.reply-line {
  width: 3px;
  background: var(--text-color-quaternary);
  border-radius: 2px;
  flex-shrink: 0;
}

.reply-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.reply-name {
  color: var(--text-color-secondary);
  font-weight: 600;
}

.reply-text {
  color: var(--text-color-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edited-mark {
  font-size: 11px;
  opacity: 0.7;
  margin-left: 4px;
}

.bubble-time {
  font-size: 11px;
  color: var(--text-color-quaternary);
  margin-top: 2px;
  align-self: flex-start;
}

.bubble-time--self {
  align-self: flex-end;
}

/* 右键菜单 */
</style>
