<script setup>
import { ref, computed, onMounted } from 'vue'
import UserDisplay from '@/components/user/UserDisplay.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import UserName from '@/components/user/UserName.vue'
import { useChatStore } from '@/stores/chat.js'
import { useUserStore } from '@/stores/user.js'
import { chatApi } from '@/api/chat.js'

const chatStore = useChatStore()
const userStore = useUserStore()

const emit = defineEmits(['select', 'newChat'])

const searchKeyword = ref('')

// 好友申请相关状态
const showFriendRequests = ref(false)
const friendRequests = ref([])
const isLoadingRequests = ref(false)
const showAddFriend = ref(false)
const addFriendKeyword = ref('')
const addFriendResults = ref([])
const isSearchingUsers = ref(false)
const friendsList = ref([])
const sendFriendMessage = ref('')
const isSendingRequest = ref(false)

// 加载好友申请列表
async function loadFriendRequests() {
  if (isLoadingRequests.value) return
  isLoadingRequests.value = true
  try {
    const res = await chatApi.getFriendRequests()
    if (res.success && res.data) {
      friendRequests.value = res.data.requests || []
    }
  } catch (error) {
    console.error('加载好友申请失败:', error)
  } finally {
    isLoadingRequests.value = false
  }
}

// 加载好友列表（用于添加好友时排除已有好友）
async function loadFriends() {
  try {
    const res = await chatApi.getFriends()
    if (res.success && res.data) {
      friendsList.value = res.data.friends || []
    }
  } catch (e) {
    // ignore
  }
}

// 接受好友申请
async function acceptRequest(requestId) {
  try {
    const res = await chatApi.acceptFriendRequest(requestId)
    if (res.success) {
      friendRequests.value = friendRequests.value.filter(r => r.id !== requestId)
      // 刷新好友列表
      await loadFriends()
    }
  } catch (error) {
    console.error('接受好友申请失败:', error)
  }
}

// 拒绝好友申请
async function rejectRequest(requestId) {
  try {
    const res = await chatApi.rejectFriendRequest(requestId)
    if (res.success) {
      friendRequests.value = friendRequests.value.filter(r => r.id !== requestId)
    }
  } catch (error) {
    console.error('拒绝好友申请失败:', error)
  }
}

// 切换好友申请面板
function toggleFriendRequests() {
  showFriendRequests.value = !showFriendRequests.value
  showAddFriend.value = false
  if (showFriendRequests.value) {
    loadFriendRequests()
  }
}

// 切换添加好友面板
function toggleAddFriend() {
  showAddFriend.value = !showAddFriend.value
  showFriendRequests.value = false
  addFriendKeyword.value = ''
  addFriendResults.value = []
  if (showAddFriend.value) {
    loadFriends()
  }
}

// 搜索用户（用于添加好友）
async function searchUsersToAdd() {
  const keyword = addFriendKeyword.value.trim()
  if (!keyword) {
    addFriendResults.value = []
    return
  }

  isSearchingUsers.value = true
  try {
    // 使用 user API 搜索用户
    const { userApi } = await import('@/api/index.js')
    const res = await userApi.searchUsers(keyword)
    if (res.success && res.data) {
      let results = res.data.users || []
      // 排除自己和已是好友的用户
      const friendIds = new Set(friendsList.value.map(f => String(f.id)))
      results = results.filter(u =>
        String(u.id) !== String(userStore.userInfo?.id) &&
        !friendIds.has(String(u.id))
      )
      addFriendResults.value = results
    }
  } catch (error) {
    console.error('搜索用户失败:', error)
  } finally {
    isSearchingUsers.value = false
  }
}

// 防抖搜索
let searchTimer = null
function onAddFriendInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchUsersToAdd()
  }, 300)
}

// 发送好友申请
async function sendFriendRequest(userId) {
  if (isSendingRequest.value) return
  isSendingRequest.value = true
  try {
    const res = await chatApi.sendFriendRequest(userId, sendFriendMessage.value)
    if (res.success) {
      // 从搜索结果中移除该用户
      addFriendResults.value = addFriendResults.value.filter(u => String(u.id) !== String(userId))
      sendFriendMessage.value = ''

      // 自动创建与该好友的私聊会话
      try {
        await chatStore.createPrivateConversation(userId)
      } catch (e) {
        console.warn('自动创建私聊会话失败:', e)
      }

      alert('好友申请已发送，已自动创建聊天会话')
    } else {
      alert(res.message || '发送失败')
    }
  } catch (error) {
    console.error('发送好友申请失败:', error)
    alert(error.message || '发送失败')
  } finally {
    isSendingRequest.value = false
  }
}

// 组件挂载时加载好友列表
onMounted(() => {
  loadFriends()
})

// 过滤后的会话列表
const filteredConversations = computed(() => {
  const list = chatStore.sortedConversations
  if (!searchKeyword.value.trim()) return list

  const keyword = searchKeyword.value.trim().toLowerCase()
  return list.filter(conv => {
    // 搜索会话标题或成员昵称
    const title = (conv.title || '').toLowerCase()
    const members = (conv.members || []).map(m => (m.nickname || '').toLowerCase())
    return title.includes(keyword) || members.some(n => n.includes(keyword))
  })
})

// 格式化最后消息时间
function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 获取会话显示的用户（私聊取对方，群聊取 null）
function getConversationUser(conv) {
  if (conv.type === 'group') return null

  // 私聊：优先从 other_user 取，降级从 members 取
  if (conv.other_user) {
    return conv.other_user
  }
  const otherMember = (conv.members || []).find(
    m => String(m.user_id) !== String(userStore.userInfo?.id)
  )
  return otherMember || null
}

// 获取会话显示标题
function getConversationTitle(conv) {
  if (conv.title) return conv.title
  if (conv.other_user) return conv.other_user.nickname || '未知用户'
  return '未知用户'
}

// 获取最后消息预览文本
function lastMessagePreview(conv) {
  // 后端返回 last_message_content 和 last_message_type
  if (conv.last_message_content) {
    if (conv.last_message_type === 'image') return '[图片]'
    if (conv.last_message_type === 'file') return '[文件]'
    return conv.last_message_content || ''
  }
  // 兼容 WebSocket 推送的 last_message 对象
  const lastMsg = conv.last_message
  if (!lastMsg) return '暂无消息'
  if (lastMsg.type === 'image') return '[图片]'
  if (lastMsg.type === 'file') return '[文件]'
  if (lastMsg.is_recalled) return '消息已撤回'
  return lastMsg.content || ''
}

// 获取最后消息发送者名称
function lastMessageSender(conv) {
  // 后端返回 last_sender_id
  if (conv.last_sender_id) {
    if (String(conv.last_sender_id) === String(userStore.userInfo?.id)) {
      return '我: '
    }
    return ''
  }
  // 兼容 WebSocket 推送的 last_message 对象
  const lastMsg = conv.last_message
  if (!lastMsg) return ''
  if (String(lastMsg.sender_id) === String(userStore.userInfo?.id)) {
    return '我: '
  }
  return ''
}

function handleSelect(conv) {
  emit('select', conv)
}

function handleNewChat() {
  emit('newChat')
}
</script>

<template>
  <div class="conversation-list">
    <!-- 顶部搜索、新建和好友操作 -->
    <div class="list-header">
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          v-model="searchKeyword"
          type="text"
          class="search-input"
          placeholder="搜索会话..."
        />
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="toggleAddFriend" title="添加好友">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="11" x2="20" y2="17"/>
            <line x1="23" y1="14" x2="17" y2="14"/>
          </svg>
        </button>
        <button class="action-btn friend-request-btn" @click="toggleFriendRequests" title="好友申请">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span v-if="friendRequests.length > 0 && !showFriendRequests" class="request-badge">{{ friendRequests.length }}</span>
        </button>
        <button class="new-chat-btn" @click="handleNewChat" title="新建聊天">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 好友申请面板 -->
    <div v-if="showFriendRequests" class="friend-panel">
      <div class="panel-header">
        <h4 class="panel-title">好友申请</h4>
        <button class="panel-close" @click="showFriendRequests = false">&times;</button>
      </div>
      <div class="panel-content">
        <div v-if="isLoadingRequests" class="panel-loading">加载中...</div>
        <div v-else-if="friendRequests.length === 0" class="panel-empty">暂无好友申请</div>
        <div v-else class="request-list">
          <div v-for="request in friendRequests" :key="request.id" class="request-item">
            <UserDisplay :user="request.from_user || request.user" :clickable="false" avatar-size="sm" />
            <div class="request-actions">
              <button class="req-btn req-btn--accept" @click="acceptRequest(request.id)">接受</button>
              <button class="req-btn req-btn--reject" @click="rejectRequest(request.id)">拒绝</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加好友面板 -->
    <div v-if="showAddFriend" class="friend-panel">
      <div class="panel-header">
        <h4 class="panel-title">添加好友</h4>
        <button class="panel-close" @click="showAddFriend = false">&times;</button>
      </div>
      <div class="panel-content">
        <div class="add-friend-search">
          <input
            v-model="addFriendKeyword"
            type="text"
            class="add-friend-input"
            placeholder="搜索用户昵称或ID..."
            @input="onAddFriendInput"
          />
        </div>
        <div v-if="isSearchingUsers" class="panel-loading">搜索中...</div>
        <div v-else-if="addFriendKeyword && addFriendResults.length === 0" class="panel-empty">未找到用户</div>
        <div v-else class="user-search-list">
          <div v-for="user in addFriendResults" :key="user.id" class="user-item">
            <UserDisplay :user="user" :clickable="false" avatar-size="sm" />
            <button class="add-btn" @click="sendFriendRequest(user.id)" :disabled="isSendingRequest">
              {{ isSendingRequest ? '发送中...' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="conversation-items">
      <div
        v-for="conv in filteredConversations"
        :key="conv.id"
        class="conversation-item"
        :class="{ 'conversation-item--active': chatStore.currentConversation?.id === conv.id }"
        @click="handleSelect(conv)"
      >
        <!-- 头像区域 -->
        <div class="item-avatar">
          <UserAvatar
            v-if="getConversationUser(conv)"
            :avatar="getConversationUser(conv).avatar"
            :nickname="getConversationUser(conv).nickname"
            size="md"
          />
          <div v-else class="group-avatar">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="item-content">
          <div class="item-top">
            <UserName :nickname="getConversationTitle(conv)" />
            <span class="item-time">{{ formatTime(conv.last_message_at) }}</span>
          </div>
          <div class="item-bottom">
            <span class="item-preview">
              <span class="preview-sender">{{ lastMessageSender(conv) }}</span>
              {{ lastMessagePreview(conv) }}
            </span>
            <span v-if="conv.unread_count > 0" class="unread-badge">
              {{ conv.unread_count > 99 ? '99+' : conv.unread_count }}
            </span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredConversations.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <p class="empty-text">
          {{ searchKeyword ? '未找到匹配的会话' : '暂无会话，点击右上角开始聊天' }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.conversation-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color-primary);
  overflow: hidden;
}

.list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--border-color-primary);
  min-width: 0;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-color-secondary);
  border-radius: 20px;
  padding: 8px 12px;
  min-width: 0;
  overflow: hidden;
}

.search-icon {
  color: var(--text-color-tertiary);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--text-color-primary);
  min-width: 0;
  width: 0;
}

.search-input::placeholder {
  color: var(--text-color-quaternary);
}

.new-chat-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: var(--text-color-inverse);
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.new-chat-btn:hover {
  background: var(--primary-color-dark);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-color-tertiary);
  color: var(--text-color-secondary);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.action-btn:hover {
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
}

.friend-request-btn {
  position: relative;
}

.request-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger-color);
  color: white;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 好友面板 */
.friend-panel {
  border-bottom: 1px solid var(--border-color-primary);
  background: var(--bg-color-primary);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 12px 8px;
}

.panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary);
}

.panel-close {
  background: none;
  border: none;
  font-size: 20px;
  color: var(--text-color-tertiary);
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.panel-close:hover {
  color: var(--text-color-primary);
}

.panel-content {
  padding: 0 12px 12px;
  max-height: 300px;
  overflow-y: auto;
}

.panel-loading,
.panel-empty {
  text-align: center;
  padding: 20px;
  font-size: 13px;
  color: var(--text-color-tertiary);
}

.request-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.request-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
}

.request-actions {
  display: flex;
  gap: 6px;
}

.req-btn {
  padding: 4px 12px;
  border-radius: 12px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.req-btn--accept {
  background: var(--primary-color);
  color: var(--text-color-inverse);
}

.req-btn--accept:hover {
  background: var(--primary-color-dark);
}

.req-btn--reject {
  background: var(--bg-color-tertiary);
  color: var(--text-color-secondary);
}

.req-btn--reject:hover {
  background: var(--border-color-secondary);
}

.add-friend-search {
  margin-bottom: 10px;
}

.add-friend-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color-secondary);
  border-radius: 18px;
  font-size: 13px;
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  outline: none;
  box-sizing: border-box;
}

.add-friend-input:focus {
  border-color: var(--primary-color);
}

.add-friend-input::placeholder {
  color: var(--text-color-quaternary);
}

.user-search-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.user-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
}

.add-btn {
  padding: 4px 14px;
  border-radius: 12px;
  border: none;
  background: var(--primary-color);
  color: var(--text-color-inverse);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.conversation-items {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid var(--border-color-primary);
}

.conversation-item:hover {
  background: var(--bg-color-secondary);
}

.conversation-item--active {
  background: var(--bg-color-secondary);
}

.item-avatar {
  flex-shrink: 0;
}

.group-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-color-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-tertiary);
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-time {
  font-size: 12px;
  color: var(--text-color-quaternary);
  flex-shrink: 0;
}

.item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.item-preview {
  font-size: 13px;
  color: var(--text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.preview-sender {
  color: var(--text-color-primary);
}

.unread-badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--danger-color);
  color: var(--text-color-inverse);
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  gap: 12px;
}

.empty-icon {
  color: var(--text-color-quaternary);
}

.empty-text {
  font-size: 14px;
  color: var(--text-color-tertiary);
  text-align: center;
}
</style>
