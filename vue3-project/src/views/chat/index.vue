<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConversationList from './components/ConversationList.vue'
import ChatWindow from './components/ChatWindow.vue'
import NewChatModal from './components/NewChatModal.vue'
import { useChatStore } from '@/stores/chat.js'
import { useUserStore } from '@/stores/user.js'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const userStore = useUserStore()

const showNewChatModal = ref(false)
const isMobile = ref(false)
const showChatWindow = ref(false)

// 检测是否为移动端
function checkMobile() {
  isMobile.value = window.innerWidth <= 960
}

// 初始化
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 如果已登录，初始化 WebSocket 和加载会话
  if (userStore.isLoggedIn) {
    chatStore.initWebSocket()
    chatStore.loadConversations()
  }

  // 如果 URL 带有 conversationId，切换到对应会话
  const conversationId = route.params.conversationId
  if (conversationId) {
    // 等待会话列表加载完成后再切换
    let unwatchFn = null
    unwatchFn = watch(
      () => chatStore.conversations.length,
      (len) => {
        if (len > 0) {
          const conv = chatStore.conversations.find(c => String(c.id) === String(conversationId))
          if (conv) {
            chatStore.setCurrentConversation(conv)
            showChatWindow.value = true
          }
          unwatchFn?.()
        }
      },
      { immediate: true }
    )
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  chatStore.closeWebSocket()
})

// 选择会话
function handleSelectConversation(conv) {
  chatStore.setCurrentConversation(conv)
  showChatWindow.value = true

  // 更新 URL
  router.replace(`/chat/${conv.id}`)
}

// 返回会话列表（移动端）
function handleBackToList() {
  showChatWindow.value = false
  chatStore.setCurrentConversation(null)
  router.replace('/chat')
}

// 打开新建聊天弹窗
function handleNewChat() {
  showNewChatModal.value = true
}

// 关闭新建聊天弹窗
function handleCloseModal() {
  showNewChatModal.value = false
}

// 创建会话成功
function handleConversationCreated(conv) {
  chatStore.setCurrentConversation(conv)
  showChatWindow.value = true
  router.replace(`/chat/${conv.id}`)
}

// 桌面端布局类
const layoutClass = computed(() => ({
  'chat-layout--mobile': isMobile.value,
  'chat-layout--show-window': isMobile.value && showChatWindow.value
}))
</script>

<template>
  <div class="chat-page" :class="layoutClass">
    <!-- 左侧：会话列表 -->
    <div class="chat-sidebar" :class="{ 'chat-sidebar--hidden': isMobile && showChatWindow }">
      <ConversationList
        @select="handleSelectConversation"
        @new-chat="handleNewChat"
      />
    </div>

    <!-- 中间：聊天窗口 -->
    <div class="chat-main" :class="{ 'chat-main--hidden': isMobile && !showChatWindow }">
      <template v-if="chatStore.currentConversation">
        <ChatWindow @back="handleBackToList" />
      </template>
      <div v-else class="empty-chat">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="empty-icon">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <p class="empty-title">选择一个会话开始聊天</p>
        <p class="empty-desc">或点击左上角新建聊天</p>
      </div>
    </div>

    <!-- 新建聊天弹窗 -->
    <NewChatModal
      :visible="showNewChatModal"
      @close="handleCloseModal"
      @created="handleConversationCreated"
    />
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  width: 100%;
  height: calc(100vh - 72px);
  margin-top: 72px;
  background: var(--bg-color-primary);
  overflow: hidden;
  box-sizing: border-box;
}

.chat-sidebar {
  width: 320px;
  flex-shrink: 0;
  height: 100%;
  border-right: 1px solid var(--border-color-primary);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-main {
  flex: 1;
  height: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-color-tertiary);
}

.empty-icon {
  color: var(--text-color-quaternary);
  margin-bottom: 8px;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0;
}

.empty-desc {
  font-size: 14px;
  color: var(--text-color-tertiary);
  margin: 0;
}

/* 移动端适配 */
@media (max-width: 960px) {
  .chat-page {
    position: fixed;
    top: 72px;
    left: 0;
    right: 0;
    bottom: 0;
    margin-top: 0;
    height: auto;
    z-index: 100;
  }

  .chat-sidebar {
    width: 100%;
    border-right: none;
  }

  .chat-sidebar--hidden {
    display: none;
  }

  .chat-main {
    width: 100%;
  }

  .chat-main--hidden {
    display: none;
  }
}
</style>
