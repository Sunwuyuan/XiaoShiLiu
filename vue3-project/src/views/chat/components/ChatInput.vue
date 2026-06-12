<script setup>
import { ref, watch, nextTick } from 'vue'
import { uploadImage } from '@/api/upload.js'

const props = defineProps({
  replyTo: {
    type: Object,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['send', 'cancelReply'])

const inputText = ref('')
const isSending = ref(false)
const textareaRef = ref(null)
const isUploading = ref(false)

// 自动聚焦
watch(() => props.replyTo, () => {
  nextTick(() => {
    textareaRef.value?.focus()
  })
})

// 处理键盘事件：Enter 发送，Shift+Enter 换行
function handleKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

// 发送消息
async function handleSend() {
  const content = inputText.value.trim()
  if (!content || isSending.value || props.disabled) return

  isSending.value = true
  emit('send', {
    content,
    type: 'text',
    replyTo: props.replyTo?.id || null
  })

  inputText.value = ''
  isSending.value = false

  // 重置输入框高度
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
  })
}

// 自动调整输入框高度
function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 120) + 'px'
}

// 上传图片
async function handleImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  isUploading.value = true
  try {
    const result = await uploadImage(file)
    if (result.success && result.data?.url) {
      emit('send', {
        content: result.data.url,
        type: 'image',
        replyTo: props.replyTo?.id || null
      })
    } else {
      console.error('图片上传失败:', result.message)
    }
  } catch (error) {
    console.error('图片上传失败:', error)
  } finally {
    isUploading.value = false
    // 清空 input 以便重复选择同一文件
    event.target.value = ''
  }
}

// 上传文件
function handleFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // 生成临时 URL 用于发送
  const fileUrl = URL.createObjectURL(file)
  emit('send', {
    content: fileUrl,
    type: 'file',
    fileName: file.name,
    replyTo: props.replyTo?.id || null
  })

  event.target.value = ''
}

// 取消引用回复
function cancelReply() {
  emit('cancelReply')
}

// 引用消息预览文本
function replyPreviewText(msg) {
  if (!msg) return ''
  if (msg.type === 'image') return '[图片]'
  if (msg.type === 'file') return `[文件] ${msg.file_name || ''}`
  return msg.content || ''
}
</script>

<template>
  <div class="chat-input">
    <!-- 引用回复预览 -->
    <div v-if="replyTo" class="reply-bar">
      <div class="reply-info">
        <span class="reply-label">回复</span>
        <span class="reply-name">{{ replyTo.sender?.nickname || '未知用户' }}</span>
        <span class="reply-text">{{ replyPreviewText(replyTo) }}</span>
      </div>
      <button class="reply-close" @click="cancelReply">&times;</button>
    </div>

    <div class="input-row">
      <!-- 图片上传 -->
      <label class="input-btn" title="发送图片">
        <input
          type="file"
          accept="image/*"
          class="hidden-input"
          @change="handleImageUpload"
          :disabled="isUploading || disabled"
        />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </label>

      <!-- 文件上传 -->
      <label class="input-btn" title="发送文件">
        <input
          type="file"
          class="hidden-input"
          @change="handleFileUpload"
          :disabled="disabled"
        />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
        </svg>
      </label>

      <!-- 文本输入 -->
      <textarea
        ref="textareaRef"
        v-model="inputText"
        class="input-textarea"
        placeholder="输入消息..."
        rows="1"
        :disabled="disabled || isSending"
        @keydown="handleKeydown"
        @input="autoResize"
      />

      <!-- 发送按钮 -->
      <button
        class="send-btn"
        :class="{ 'send-btn--active': inputText.trim() }"
        :disabled="!inputText.trim() || isSending || disabled"
        @click="handleSend"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      </button>
    </div>

    <div class="input-hint">Enter 发送，Shift+Enter 换行</div>
  </div>
</template>

<style scoped>
.chat-input {
  border-top: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
  padding: 8px 12px;
}

.reply-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  margin-bottom: 6px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  border-left: 3px solid var(--primary-color);
}

.reply-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
}

.reply-label {
  color: var(--primary-color);
  font-weight: 600;
  flex-shrink: 0;
}

.reply-name {
  color: var(--text-color-secondary);
  font-weight: 600;
  flex-shrink: 0;
}

.reply-text {
  color: var(--text-color-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.reply-close {
  background: none;
  border: none;
  color: var(--text-color-tertiary);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
}

.reply-close:hover {
  color: var(--text-color-primary);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.input-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: var(--text-color-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.input-btn:hover {
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
}

.hidden-input {
  display: none;
}

.input-textarea {
  flex: 1;
  resize: none;
  border: 1px solid var(--border-color-secondary);
  border-radius: 18px;
  padding: 8px 14px;
  font-size: 14px;
  line-height: 1.5;
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  outline: none;
  min-height: 20px;
  max-height: 120px;
  transition: border-color 0.2s;
}

.input-textarea:focus {
  border-color: var(--primary-color);
}

.input-textarea::placeholder {
  color: var(--text-color-quaternary);
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-color-tertiary);
  color: var(--text-color-quaternary);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.send-btn--active {
  background: var(--primary-color);
  color: var(--text-color-inverse);
}

.send-btn--active:hover {
  background: var(--primary-color-dark);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hint {
  font-size: 11px;
  color: var(--text-color-quaternary);
  text-align: center;
  margin-top: 4px;
}
</style>
