<template>
  <div class="skin-wardrobe">
    <!-- 头部信息栏 -->
    <div class="wardrobe-header">
      <div class="header-left">
        <h3 class="title">我的衣柜</h3>
        <span class="count">{{ wardrobeList.length }} / {{ maxWardrobes }} 套</span>
      </div>
      <button
        v-if="wardrobeList.length < maxWardrobes"
        class="btn-add"
        @click="openAddDialog"
      >
        <span class="icon">+</span> 添加皮肤
      </button>
    </div>

    <!-- 衣柜网格展示 -->
    <div class="wardrobe-grid" v-if="wardrobeList.length > 0">
      <div
        v-for="item in wardrobeList"
        :key="item.id"
        :class="['wardrobe-item', { 'is-active': item.is_active }]"
      >
        <!-- 皮肤预览 -->
        <div class="skin-preview">
          <img :src="item.skin_url" :alt="item.name" />
          <div v-if="item.cape_url" class="cape-badge">
            <span>披风</span>
          </div>
          <div v-if="item.is_active" class="active-badge">
            <span>当前使用</span>
          </div>
        </div>

        <!-- 皮肤信息 -->
        <div class="skin-info">
          <h4 class="skin-name">{{ item.name }}</h4>
          <div class="skin-meta">
            <span class="model-tag" :class="item.skin_model">
              {{ item.skin_model === 'slim' ? 'Slim' : 'Classic' }}
            </span>
            <span class="time">{{ formatTime(item.created_at) }}</span>
          </div>
        </div>

        <!-- 操作按钮组 -->
        <div class="action-buttons" v-if="!item.is_active">
          <button class="btn-equip" @click="equipSkin(item)">穿戴</button>
          <button class="btn-edit" @click="editItem(item)">编辑</button>
          <button class="btn-delete" @click="deleteItem(item)">删除</button>
        </div>
      </div>
    </div>

    <!-- 空状态提示 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">👕</div>
      <p class="empty-text">衣柜空空如也</p>
      <p class="empty-hint">点击上方按钮添加你的第一套皮肤吧！</p>
      <button class="btn-add-primary" @click="openAddDialog">添加皮肤</button>
    </div>

    <!-- 添加/编辑对话框 -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showDialog" @click.self="showDialog = false">
        <div class="modal-content">
          <div class="modal-header">
            <h4>{{ editingItem ? '编辑皮肤' : '添加到衣柜' }}</h4>
            <button class="modal-close" @click="showDialog = false">&times;</button>
          </div>

          <form @submit.prevent="handleSubmit" class="add-form">
            <div class="form-group">
              <label>皮肤名称 *</label>
              <input
                v-model="formData.name"
                type="text"
                placeholder="例如：默认、战斗装、节日装..."
                maxlength="50"
              />
            </div>

            <div class="form-group">
              <label>皮肤文件 (PNG) *</label>
              <div class="upload-area" @click="$refs.skinInput.click()">
                <input
                  ref="skinInput"
                  type="file"
                  accept=".png,image/png"
                  @change="handleSkinUpload"
                  style="display: none"
                />
                <div v-if="!formData.skinFile" class="upload-placeholder">
                  <span class="upload-icon">📁</span>
                  <span>点击或拖拽上传皮肤文件</span>
                  <span class="upload-hint">支持 PNG 格式，最大 500KB</span>
                </div>
                <div v-else class="upload-preview">
                  <img :src="skinPreviewUrl" alt="皮肤预览" />
                  <button type="button" class="btn-remove-file" @click.prevent="removeSkinFile">✕</button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>皮肤模型</label>
              <div class="model-selector">
                <label :class="['model-option', { active: formData.model === 'classic' }]">
                  <input type="radio" value="classic" v-model="formData.model" />
                  <span class="model-preview classic"></span>
                  <span>经典 (宽)</span>
                </label>
                <label :class="['model-option', { active: formData.model === 'slim' }]">
                  <input type="radio" value="slim" v-model="formData.model" />
                  <span class="model-preview slim"></span>
                  <span>Slim (细)</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>披风文件 (可选)</label>
              <div class="upload-area cape-upload" @click="$refs.capeInput.click()">
                <input
                  ref="capeInput"
                  type="file"
                  accept=".png,image/png"
                  @change="handleCapeUpload"
                  style="display: none"
                />
                <div v-if="!formData.capeFile" class="upload-placeholder small">
                  <span class="upload-icon">🧥</span>
                  <span>可选：上传披风</span>
                </div>
                <div v-else class="upload-preview small">
                  <img :src="capePreviewUrl" alt="披风预览" />
                  <button type="button" class="btn-remove-file" @click.prevent="removeCapeFile">✕</button>
                </div>
              </div>
            </div>
          </form>

          <div class="modal-footer">
            <button class="btn-cancel" @click="showDialog = false">取消</button>
            <button class="btn-submit" @click="handleSubmit" :disabled="!canSubmit">
              {{ editingItem ? '保存修改' : '添加到衣柜' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { gameApi } from '@/api/game'
import messageManager from '@/utils/messageManager'

const props = defineProps({
  profileId: {
    type: [String, Number],
    required: true
  }
})

// 数据状态
const wardrobeList = ref([])
const maxWardrobes = ref(10)
const showDialog = ref(false)
const editingItem = ref(null)

// 表单数据
const formData = reactive({
  name: '',
  model: 'classic',
  skinFile: null,
  capeFile: null
})

// 预览URL
const skinPreviewUrl = ref('')
const capePreviewUrl = ref('')

// 计算属性
const canSubmit = computed(() => {
  return formData.name.trim() && formData.skinFile
})

onMounted(async () => {
  await fetchWardrobe()
})

async function fetchWardrobe() {
  try {
    const res = await gameApi.getWardrobe(props.profileId)
    if (res.code === 200) {
      wardrobeList.value = res.data.wardrobe
      maxWardrobes.value = res.data.max_wardrobes
    }
  } catch (error) {
    console.error('获取衣柜失败:', error)
    messageManager.error('获取衣柜列表失败')
  }
}

function openAddDialog() {
  resetForm()
  showDialog.value = true
}

function handleSkinUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  if (file.type !== 'image/png') {
    messageManager.error('只支持PNG格式的图片')
    return
  }

  if (file.size > 500 * 1024) {
    messageManager.error('文件大小不能超过500KB')
    return
  }

  formData.skinFile = file
  skinPreviewUrl.value = URL.createObjectURL(file)
}

function handleCapeUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  if (file.type !== 'image/png') {
    messageManager.error('只支持PNG格式的图片')
    return
  }

  formData.capeFile = file
  capePreviewUrl.value = URL.createObjectURL(file)
}

function removeSkinFile() {
  formData.skinFile = null
  skinPreviewUrl.value = ''
}

function removeCapeFile() {
  formData.capeFile = null
  capePreviewUrl.value = ''
}

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    let res

    if (editingItem.value) {
      res = await gameApi.updateWardrobeItem(props.profileId, editingItem.value.id, {
        name: formData.name,
        model: formData.model
      })
    } else {
      const formPayload = new FormData()
      formPayload.append('name', formData.name)
      formPayload.append('model', formData.model)
      formPayload.append('skin', formData.skinFile)

      if (formData.capeFile) {
        formPayload.append('cape', formData.capeFile)
      }

      res = await gameApi.addToWardrobe(props.profileId, formPayload)
    }

    if (res.code === 200) {
      messageManager.success(editingItem.value ? '更新成功' : '添加成功')
      showDialog.value = false
      resetForm()
      await fetchWardrobe()
    } else {
      messageManager.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    messageManager.error('操作失败，请重试')
  }
}

function editItem(item) {
  editingItem.value = item
  formData.name = item.name
  formData.model = item.skin_model
  skinPreviewUrl.value = item.skin_url
  if (item.cape_url) {
    capePreviewUrl.value = item.cape_url
  }
  showDialog.value = true
}

function deleteItem(item) {
  if (!confirm(`确定要删除「${item.name}」吗？\n注意：删除后无法恢复`)) {
    return
  }

  gameApi.deleteWardrobeItem(props.profileId, item.id).then((res) => {
    if (res.code === 200) {
      messageManager.success('删除成功')
      fetchWardrobe()
    }
  }).catch((error) => {
    console.error('删除失败:', error)
    messageManager.error('删除失败')
  })
}

function equipSkin(item) {
  if (!confirm(`确定要切换到「${item.name}」吗？\n切换后需要重新登录游戏才能生效`)) {
    return
  }

  gameApi.equipWardrobeItem(props.profileId, item.id).then((res) => {
    if (res.code === 200) {
      messageManager.success('切换成功，请重新登录游戏')
      fetchWardrobe()
    }
  }).catch((error) => {
    console.error('切换失败:', error)
    messageManager.error('切换失败')
  })
}

function resetForm() {
  formData.name = ''
  formData.model = 'classic'
  formData.skinFile = null
  formData.capeFile = null
  skinPreviewUrl.value = ''
  capePreviewUrl.value = ''
  editingItem.value = null
}

function formatTime(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)} 天前`

  return date.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.skin-wardrobe {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 头部样式 */
.wardrobe-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.title {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.count {
  font-size: 14px;
  color: #6b7280;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-add:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.icon {
  font-size: 18px;
  font-weight: bold;
}

/* 衣柜网格 */
.wardrobe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* 单个衣柜项 */
.wardrobe-item {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
}

.wardrobe-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.wardrobe-item:hover .action-buttons {
  opacity: 1;
  transform: translateY(0);
}

.wardrobe-item.is-active {
  border: 3px solid #667eea;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.wardrobe-item.is-active .active-badge {
  display: flex;
}

/* 皮肤预览区 */
.skin-preview {
  position: relative;
  width: 100%;
  height: 280px;
  background: linear-gradient(180deg, #87CEEB 0%, #98D8C8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.skin-preview img {
  max-width: 80%;
  max-height: 90%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* 标记徽章 */
.active-badge,
.cape-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  z-index: 1;
}

.active-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: none;
}

.cape-badge {
  top: 44px;
  background: rgba(255, 255, 255, 0.95);
  color: #374151;
  border: 1px solid #d1d5db;
}

/* 皮肤信息区 */
.skin-info {
  padding: 16px;
}

.skin-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.skin-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.model-tag {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.model-tag.classic {
  background: #dbeafe;
  color: #1e40af;
}

.model-tag.slim {
  background: #fce7f3;
  color: #9d174d;
}

.time {
  font-size: 13px;
  color: #9ca3af;
}

/* 操作按钮组 */
.action-buttons {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.95), transparent);
  display: flex;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease;
}

.action-buttons button {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-buttons button:hover {
  transform: scale(1.05);
}

.btn-equip {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.btn-edit {
  background: #f3f4f6;
  color: #374151;
}

.btn-edit:hover {
  background: #e5e7eb;
}

.btn-delete {
  background: #fef2f2;
  color: #dc2626;
}

.btn-delete:hover {
  background: #fee2e2;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px 0;
}

.empty-hint {
  font-size: 14px;
  color: #9ca3af;
  margin: 0 0 24px 0;
}

.btn-add-primary {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-add-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

/* 自定义对话框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.add-form {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s ease;
  box-sizing: border-box;
}

.form-group input[type="text"]:focus {
  outline: none;
  border-color: #667eea;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel {
  padding: 10px 24px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-submit {
  padding: 10px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 上传区域 */
.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 30px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #667eea;
  background: #f9fafb;
}

.upload-area.cape-upload {
  padding: 20px;
}

.upload-placeholder .upload-icon {
  font-size: 36px;
  display: block;
  margin-bottom: 8px;
}

.upload-placeholder span {
  display: block;
  color: #6b7280;
  font-size: 14px;
}

.upload-placeholder .upload-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
}

.upload-placeholder.small .upload-icon {
  font-size: 28px;
}

.upload-preview {
  position: relative;
  display: inline-block;
}

.upload-preview img {
  max-width: 100%;
  max-height: 300px;
  image-rendering: pixelated;
  border-radius: 8px;
}

.upload-preview.small img {
  max-height: 150px;
}

.btn-remove-file {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
}

/* 模型选择器 */
.model-selector {
  display: flex;
  gap: 16px;
}

.model-option {
  flex: 1;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: all 0.3s ease;
}

.model-option:hover {
  border-color: #667eea;
}

.model-option.active {
  border-color: #667eea;
  background: #f5f3ff;
}

.model-option input[type="radio"] {
  display: none;
}

.model-preview {
  display: inline-block;
  width: 40px;
  height: 60px;
  background: #d1d5db;
  border-radius: 4px;
  margin-bottom: 8px;
}

.model-preview.classic {
  width: 30px;
}

.model-preview.slim {
  width: 22px;
}

.model-option span:last-child {
  font-size: 13px;
  color: #374151;
}
</style>
