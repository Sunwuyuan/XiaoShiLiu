<script setup>
import { ref, computed } from 'vue'
import { gameApi } from '@/api/game'
import EditProfileModal from './EditProfileModal.vue'
import TempPasswordModal from './TempPasswordModal.vue'
import SessionModal from './SessionModal.vue'
import SkinWardrobe from '@/components/SkinWardrobe.vue'
import messageManager from '@/utils/messageManager'
import SvgIcon from '@/components/SvgIcon.vue'
import SkinViewer3D from '@/components/SkinViewer3D.vue'

const props = defineProps({
  profile: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update', 'delete'])

const showEditModal = ref(false)
const showTempPasswordModal = ref(false)
const showSessionModal = ref(false)
const showWardrobe = ref(false)
const isDeleting = ref(false)
const showUuid = ref(false)

// 获取代理 URL（解决 CORS 问题）
function getProxyUrl(url) {
  if (!url) return ''
  try {
    const urlObj = new URL(url)
    if (urlObj.origin === window.location.origin) return url
  } catch (e) {
    return url
  }
  return `/api/game/skin-proxy?url=${encodeURIComponent(url)}`
}

const skinUrl = computed(() => props.profile.skin_url || `https://mc-heads.net/skin/${props.profile.uuid}`)
const avatarSkinUrl = computed(() => getProxyUrl(skinUrl.value))
const isBanned = computed(() => props.profile.is_banned === 1)

async function handleDelete() {
  if (!confirm('确定要删除这个角色吗？此操作不可恢复！')) {
    return
  }

  isDeleting.value = true
  
  try {
    const res = await gameApi.deleteProfile(props.profile.id)
    if (res.code === 200) {
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

function handleEquipped(skinItem) {
  // 穿戴皮肤后刷新角色数据
  emit('update', {
    skin_url: skinItem.skin_url,
    skin_model: skinItem.skin_model,
    cape_url: skinItem.cape_url || null
  })
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
      <div class="player-avatar" :style="{ backgroundImage: `url(${avatarSkinUrl})` }"></div>
      
      <div class="player-info">
        <h3 class="player-name" @click="copyToClipboard(profile.player_name + '@dy.ci')">
          <span class="name-text">{{ profile.player_name }}@dy.ci</span>
          <SvgIcon name="copy" class="copy-icon" />
        </h3>
        <p
          class="uuid-text"
          :class="{ expanded: showUuid }"
          @click="showUuid = !showUuid; copyToClipboard(profile.uuid)"
          title="点击展开/复制 UUID"
        >
          <span class="uuid-label">UUID</span>
          <span class="uuid-value">{{ profile.uuid }}</span>
          <SvgIcon name="copy" class="copy-icon" />
        </p>
        <span v-if="isBanned" class="ban-badge">已封禁</span>
      </div>

      <div class="card-actions">
        <button
          v-if="!isBanned"
          class="action-btn temp-password-btn"
          @click="showTempPasswordModal = true"
          title="临时密码"
        >
          <SvgIcon name="magic" />
        </button>

        <button
          v-if="!isBanned"
          class="action-btn session-btn"
          @click="showSessionModal = true"
          title="会话管理"
        >
          <SvgIcon name="shield" />
        </button>

        <button
          v-if="!isBanned"
          class="action-btn wardrobe-btn"
          @click="showWardrobe = !showWardrobe"
          title="皮肤衣柜"
        >
          <SvgIcon name="wardrobe" />
        </button>

        <button
          v-if="!isBanned"
          class="action-btn edit-btn"
          @click="showEditModal = true"
          title="编辑角色"
        >
          <SvgIcon name="edit" />
        </button>

        <button
          class="action-btn delete-btn"
          @click="handleDelete"
          :disabled="isDeleting"
          title="删除角色"
        >
          <SvgIcon v-if="isDeleting" name="loading" class="spin" />
          <SvgIcon v-else name="delete" />
        </button>
      </div>
    </div>

    <div class="card-body">
      <div class="skin-preview">
        <SkinViewer3D
          :skin-url="skinUrl"
          :cape-url="profile.cape_url || ''"
          :player-name="profile.player_name"
          :skin-model="profile.skin_model || 'auto-detect'"
          :width="260"
          :height="340"
          :show-controls="true"
          :show-name-tag="true"
        />
      </div>

      <div class="profile-details">
        <div class="detail-item">
          <span class="label">模型类型</span>
          <span class="value">{{ profile.skin_model === 'slim' ? '细手臂' : '经典' }}</span>
        </div>
        
        <div class="detail-item">
          <span class="label">创建时间</span>
          <span class="value">{{ new Date(profile.created_at).toLocaleDateString() }}</span>
        </div>

        <div v-if="profile.cape_url" class="detail-item">
          <span class="label">披风状态</span>
          <span class="value cape-status">已设置</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <EditProfileModal
        v-if="showEditModal"
        :profile="profile"
        @close="showEditModal = false"
        @updated="handleEditComplete"
      />
    </Teleport>

    <Teleport to="body">
      <TempPasswordModal
        v-if="showTempPasswordModal"
        :profile="profile"
        @close="showTempPasswordModal = false"
      />
    </Teleport>

    <Teleport to="body">
      <SessionModal
        v-if="showSessionModal"
        :profile="profile"
        @close="showSessionModal = false"
      />
    </Teleport>

    <!-- 皮肤衣柜 -->
    <div v-if="showWardrobe" class="wardrobe-section">
      <SkinWardrobe :profileId="profile.id" :playerName="profile.player_name" @equipped="handleEquipped" />
    </div>
  </div>
</template>

<style scoped>
.profile-card {
  background: var(--bg-color-primary);
  border-radius: 12px;
  border: 1px solid var(--border-color-primary);
  overflow: hidden;
  transition: all 0.2s ease;
}

.profile-card:hover {
  background: var(--bg-color-secondary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.profile-card.banned {
  opacity: 0.6;
  border-color: var(--primary-color);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--border-color-primary);
}

.player-avatar {
  width: 64px;
  height: 64px;
  border-radius: 8px;
  image-rendering: pixelated;
  background-color: var(--bg-color-tertiary);
  /* 从 64x64 皮肤贴图中裁切 8x8 头部正面区域 (x=8, y=8) */
  background-size: 512px 512px;
  background-position: -64px -64px;
  background-repeat: no-repeat;
  flex-shrink: 0;
}

.player-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  padding-right: 8px;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 4px 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.name-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.player-name .copy-icon {
  width: 14px;
  height: 14px;
  color: var(--text-color-tertiary);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.player-name:hover .copy-icon {
  opacity: 1;
}

.uuid-text {
  font-size: 12px;
  color: var(--text-color-tertiary);
  margin: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  overflow: hidden;
}

.uuid-label {
  font-weight: 600;
  color: var(--text-color-secondary);
  flex-shrink: 0;
}

.uuid-value {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
  opacity: 0;
  transition: max-width 0.3s ease, opacity 0.2s ease;
}

.uuid-text.expanded .uuid-value {
  max-width: 300px;
  opacity: 1;
}

.uuid-text:hover {
  color: var(--primary-color);
}

.copy-icon {
  width: 14px;
  height: 14px;
  opacity: 0.6;
  flex-shrink: 0;
}

.ban-badge {
  display: inline-block;
  padding: 2px 8px;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-top: 4px;
}

.card-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  background: transparent;
  color: var(--text-color-secondary);
}

.action-btn:hover:not(:disabled) {
  background: var(--bg-color-tertiary);
  color: var(--text-color-primary);
}

.edit-btn:hover:not(:disabled) {
  color: var(--primary-color);
}

.temp-password-btn:hover:not(:disabled) {
  color: #8b5cf6;
}

.session-btn:hover:not(:disabled) {
  color: #059669;
}

.wardrobe-btn:hover:not(:disabled) {
  color: #667eea;
}

.delete-btn:hover:not(:disabled) {
  color: var(--primary-color);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.card-body {
  padding: 16px;
}

.skin-preview {
  text-align: center;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-color-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color-secondary);
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
  font-weight: 400;
}

.value {
  color: var(--text-color-primary);
  font-weight: 500;
}

.cape-status {
  color: var(--primary-color);
}

/* 衣柜区域样式 */
.wardrobe-section {
  margin-top: 16px;
  padding: 20px;
  background: var(--bg-color-secondary);
  border-top: 1px solid var(--border-color-secondary);
  border-radius: 0 0 12px 12px;
}

.wardrobe-section :deep(.skin-wardrobe) {
  padding: 0;
}

.wardrobe-section :deep(.wardrobe-header) {
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.wardrobe-section :deep(.wardrobe-grid) {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.wardrobe-section :deep(.wardrobe-item) {
  border: 1px solid var(--border-color-secondary);
}

.wardrobe-section :deep(.skin-preview) {
  height: 180px;
}

@media (max-width: 480px) {
  .card-header {
    flex-wrap: wrap;
  }

  .card-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .player-avatar {
    width: 48px;
    height: 48px;
    /* 48px 头像：background-size=384px(48*8), position=-48px(-6*8) */
    background-size: 384px 384px;
    background-position: -48px -48px;
  }

  .player-name {
    font-size: 14px;
  }

  .card-body {
    padding: 12px;
  }

  .skin-preview {
    padding: 16px;
  }
}
</style>
