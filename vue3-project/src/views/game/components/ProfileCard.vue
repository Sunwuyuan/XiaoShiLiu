<script setup>
import { ref, computed } from 'vue'
import { gameApi } from '@/api/game'
import EditProfileModal from './EditProfileModal.vue'
import messageManager from '@/utils/messageManager'

const props = defineProps({
  profile: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update', 'delete'])

const showEditModal = ref(false)
const isDeleting = ref(false)

const skinUrl = computed(() => props.profile.skin_url || `https://mc-heads.net/skin/${props.profile.uuid}`)
const avatarUrl = computed(() => `https://mc-heads.net/avatar/${props.profile.uuid}/64`)
const isBanned = computed(() => props.profile.is_banned === 1)

async function handleDelete() {
  if (!confirm('确定要删除这个角色吗？此操作不可恢复！')) {
    return
  }

  isDeleting.value = true
  
  try {
    const res = await gameApi.deleteSkin(props.profile.id)
    if (res.success) {
      emit('delete', props.profile.id)
      messageManager.success('角色已删除')
    }
  } catch (error) {
    console.error('删除角色失败:', error)
    messageManager.error('删除失败，请稍后重试')
  } finally {
    isDeleting.value = false
  }
}

function handleEditComplete(updatedData) {
  showEditModal.value = false
  emit('update', updatedData)
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    messageManager.success('已复制到剪贴板')
  }).catch(err => {
    console.error('复制失败:', err)
  })
}
</script>

<template>
  <div class="profile-card" :class="{ 'banned': isBanned }">
    <div class="card-header">
      <img :src="avatarUrl" :alt="profile.player_name" class="player-avatar" />
      
      <div class="player-info">
        <h3 class="player-name">{{ profile.player_name }}</h3>
        <p class="uuid-text" @click="copyToClipboard(profile.uuid)">
          {{ profile.uuid }}
          <span class="copy-icon">📋</span>
        </p>
        <span v-if="isBanned" class="ban-badge">已封禁</span>
      </div>

      <button 
        v-if="!isBanned"
        class="edit-btn" 
        @click="showEditModal = true"
        title="编辑角色"
      >
        ✏️
      </button>

      <button 
        class="delete-btn" 
        @click="handleDelete"
        :disabled="isDeleting"
        title="删除角色"
      >
        {{ isDeleting ? '⏳' : '🗑️' }}
      </button>
    </div>

    <div class="card-body">
      <div class="skin-preview">
        <img 
          :src="skinUrl" 
          alt="皮肤预览" 
          class="skin-image"
          @error="(e) => { e.target.src = 'https://mc-heads.net/skin/' + profile.uuid }"
        />
      </div>

      <div class="profile-details">
        <div class="detail-item">
          <span class="label">模型类型:</span>
          <span class="value">{{ profile.skin_model === 'slim' ? '细手臂' : '经典' }}</span>
        </div>
        
        <div class="detail-item">
          <span class="label">创建时间:</span>
          <span class="value">{{ new Date(profile.created_at).toLocaleDateString() }}</span>
        </div>

        <div v-if="profile.cape_url" class="detail-item">
          <span class="label">披风状态:</span>
          <span class="value cape-status">✅ 已设置</span>
        </div>
      </div>
    </div>

    <EditProfileModal
      v-if="showEditModal"
      :profile="profile"
      @close="showEditModal = false"
      @updated="handleEditComplete"
    />
  </div>
</template>

<style scoped>
.profile-card {
  background: var(--bg-color-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: all 0.3s ease;
}

.profile-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.profile-card.banned {
  opacity: 0.6;
  border-color: #ef4444;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-bottom: 1px solid var(--border-color);
  position: relative;
}

.player-avatar {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  image-rendering: pixelated;
  background: #f0f0f0;
}

.player-info {
  flex: 1;
  min-width: 0;
}

.player-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 4px 0;
}

.uuid-text {
  font-size: 12px;
  color: var(--text-color-secondary);
  margin: 0;
  cursor: pointer;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 4px;
}

.uuid-text:hover {
  color: #667eea;
}

.copy-icon {
  opacity: 0.7;
  font-size: 12px;
}

.ban-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #ef4444;
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-top: 4px;
}

.edit-btn,
.delete-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: transparent;
}

.edit-btn:hover {
  background: rgba(102, 126, 234, 0.1);
  transform: scale(1.1);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  transform: scale(1.1);
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-body {
  padding: 16px;
}

.skin-preview {
  text-align: center;
  margin-bottom: 16px;
  padding: 20px;
  background: var(--bg-color-primary);
  border-radius: 8px;
}

.skin-image {
  max-width: 100%;
  max-height: 200px;
  image-rendering: pixelated;
  object-fit: contain;
}

.profile-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.label {
  color: var(--text-color-secondary);
  font-weight: 500;
}

.value {
  color: var(--text-color-primary);
  font-weight: 600;
}

.cape-status {
  color: #10b981;
}

@media (max-width: 480px) {
  .card-header {
    flex-wrap: wrap;
  }

  .edit-btn,
  .delete-btn {
    position: absolute;
    right: 8px;
    top: 8px;
  }

  .edit-btn {
    right: 48px;
  }
}
</style>
