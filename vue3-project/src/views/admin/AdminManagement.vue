<template>
  <div class="admin-management">
    <CrudTable 
      title="管理员管理" 
      entity-name="管理员" 
      api-endpoint="/admin/admins" 
      :columns="columns" 
      :form-fields="formFields"
      :search-fields="searchFields" 
      :custom-actions="customActions"
      @custom-action="handleCustomAction"
    />
    
    <!-- 权限设置表单 -->
    <FormModal 
      v-model:visible="permissionModalVisible" 
      title="设置管理员权限" 
      :form-fields="permissionFormFields"
      v-model:form-data="permissionFormData" 
      confirm-text="保存权限" 
      :loading="isSubmitting"
      @submit="handlePermissionSubmit" 
      @close="permissionModalVisible = false" 
    />
    
    <!-- 删除确认弹窗 -->
    <ConfirmDialog 
      v-model:visible="showDeleteModal" 
      title="确认删除"
      :message="`确定要删除管理员《${selectedItem?.nickname || selectedItem?.username}》吗？此操作不可撤销。`" 
      type="warning"
      confirm-text="删除" 
      cancel-text="取消" 
      @confirm="handleConfirmDelete" 
      @cancel="showDeleteModal = false" 
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import CrudTable from '@/views/admin/components/CrudTable.vue'
import FormModal from '@/views/admin/components/FormModal.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAdminStore } from '@/stores/admin'
import messageManager from '@/utils/messageManager'

const adminStore = useAdminStore()

// 权限分组定义
const permissionGroups = [
  {
    name: '系统功能',
    permissions: [
      { key: 'api_docs:view', label: '查看API文档' },
      { key: 'monitor:view', label: '查看系统监控' }
    ]
  },
  {
    name: '用户管理',
    permissions: [
      { key: 'users:view', label: '查看用户' },
      { key: 'users:edit', label: '编辑用户' },
      { key: 'users:delete', label: '删除用户' },
      { key: 'users:ban', label: '封禁/解封用户' }
    ]
  },
  {
    name: '内容管理',
    permissions: [
      { key: 'posts:view', label: '查看笔记' },
      { key: 'posts:edit', label: '编辑笔记' },
      { key: 'posts:delete', label: '删除笔记' },
      { key: 'post_audit:view', label: '查看待审核笔记' },
      { key: 'post_audit:audit', label: '审核笔记' },
      { key: 'comments:view', label: '查看评论' },
      { key: 'comments:edit', label: '编辑评论' },
      { key: 'comments:delete', label: '删除评论' }
    ]
  },
  {
    name: '分类与标签',
    permissions: [
      { key: 'categories:view', label: '查看分类' },
      { key: 'categories:edit', label: '编辑分类' },
      { key: 'categories:delete', label: '删除分类' },
      { key: 'categories:create', label: '创建分类' },
      { key: 'tags:view', label: '查看标签' },
      { key: 'tags:edit', label: '编辑标签' },
      { key: 'tags:delete', label: '删除标签' },
      { key: 'tags:create', label: '创建标签' }
    ]
  },
  {
    name: '互动管理',
    permissions: [
      { key: 'likes:view', label: '查看点赞' },
      { key: 'likes:delete', label: '删除点赞' },
      { key: 'collections:view', label: '查看收藏' },
      { key: 'collections:delete', label: '删除收藏' },
      { key: 'follows:view', label: '查看关注' },
      { key: 'follows:delete', label: '删除关注' }
    ]
  },
  {
    name: '通知管理',
    permissions: [
      { key: 'notifications:view', label: '查看通知' },
      { key: 'notifications:create', label: '发送通知' },
      { key: 'notifications:delete', label: '删除通知' }
    ]
  },
  {
    name: '会话管理',
    permissions: [
      { key: 'user_sessions:view', label: '查看用户会话' },
      { key: 'user_sessions:delete', label: '禁用用户会话' },
      { key: 'admin_sessions:view', label: '查看管理员会话' },
      { key: 'admin_sessions:delete', label: '禁用管理员会话' }
    ]
  },
  {
    name: '认证管理',
    permissions: [
      { key: 'audit:view', label: '查看认证审核' },
      { key: 'audit:audit', label: '审核认证' }
    ]
  },
  {
    name: '管理员管理',
    permissions: [
      { key: 'admins:view', label: '查看管理员' },
      { key: 'admins:edit', label: '编辑管理员' },
      { key: 'admins:delete', label: '删除管理员' },
      { key: 'admins:create', label: '创建管理员' }
    ]
  }
]

// 预设角色
const roles = [
  { key: 'super_admin', name: '超级管理员', permissions: [] },
  { key: 'content_admin', name: '内容管理员', permissions: [
    'posts:view', 'posts:edit', 'posts:delete',
    'post_audit:view', 'post_audit:audit',
    'comments:view', 'comments:edit', 'comments:delete',
    'categories:view', 'categories:edit', 'categories:delete', 'categories:create',
    'tags:view', 'tags:edit', 'tags:delete', 'tags:create'
  ]},
  { key: 'user_admin', name: '用户管理员', permissions: [
    'users:view', 'users:edit', 'users:delete', 'users:ban',
    'audit:view', 'audit:audit'
  ]},
  { key: 'operator', name: '运维人员', permissions: [
    'api_docs:view', 'monitor:view',
    'user_sessions:view', 'user_sessions:delete',
    'admin_sessions:view', 'admin_sessions:delete'
  ]}
]

// 表格列定义
const columns = [
  { key: 'username', label: '用户名', sortable: false },
  { key: 'nickname', label: '昵称', sortable: false },
  { 
    key: 'isSuper', 
    label: '角色', 
    type: 'tag',
    format: (val) => val ? '超级管理员' : '管理员',
    color: (val) => val ? '#ff4d4f' : '#1890ff'
  },
  { key: 'logtoId', label: 'Logto ID', sortable: false },
  { key: 'createdAt', label: '创建时间', type: 'date', sortable: true }
]

// 表单字段定义
const formFields = [
  { key: 'username', label: '用户名', type: 'text', required: true, placeholder: '请输入管理员用户名', disabledOnEdit: true },
  { key: 'logtoId', label: 'Logto ID', type: 'text', placeholder: '可选，留空则通过用户名匹配', disabledOnEdit: true, helpText: '建议留空，系统会自动匹配' },
  { key: 'nickname', label: '昵称', type: 'text', placeholder: '请输入昵称' },
  { 
    key: 'isSuper', 
    label: '超级管理员', 
    type: 'checkbox'
  }
]

// 搜索字段定义
const searchFields = [
  { key: 'username', label: '用户名', placeholder: '搜索用户名' }
]

// 自定义操作按钮
const customActions = [
  { key: 'permission', label: '设置权限', type: 'primary' }
]

// 权限设置相关
const permissionModalVisible = ref(false)
const permissionFormData = ref({
  id: null,
  nickname: '',
  isSuper: false,
  permissions: [],
  currentRole: 'custom'
})

const permissionFormFields = computed(() => [
  { key: 'nickname', label: '昵称', type: 'text', disabled: true },
  { 
    key: 'isSuper', 
    label: '超级管理员', 
    type: 'checkbox',
    onChange: (val) => {
      if (val) {
        permissionFormData.value.currentRole = 'super_admin'
        permissionFormData.value.permissions = []
      }
    }
  },
  ...(!permissionFormData.value.isSuper ? [
    { 
      key: 'currentRole', 
      label: '预设角色', 
      type: 'select',
      options: roles.map(r => ({ value: r.key, label: r.name })),
      onChange: (val) => {
        const role = roles.find(r => r.key === val)
        if (role && role.key !== 'custom') {
          permissionFormData.value.permissions = [...(role.permissions || [])]
        }
      }
    },
    { 
      key: 'permissions', 
      label: '自定义权限', 
      type: 'custom',
      render: () => renderPermissionGroups()
    }
  ] : [])
])

// 渲染权限分组
const renderPermissionGroups = () => {
  return `<div class="permission-groups">
    ${permissionGroups.map(group => `
      <div class="permission-group">
        <div class="group-title">${group.name}</div>
        <div class="permission-grid">
          ${group.permissions.map(perm => `
            <label class="permission-item">
              <input type="checkbox" value="${perm.key}" ${permissionFormData.value.permissions.includes(perm.key) ? 'checked' : ''} @change="togglePermission('${perm.key}')" />
              <span>${perm.label}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `).join('')}
  </div>`
}

// 删除相关
const showDeleteModal = ref(false)
const selectedItem = ref(null)
const isSubmitting = ref(false)

// 处理自定义操作
const handleCustomAction = (action, item) => {
  if (action.key === 'permission') {
    openPermissionModal(item)
  }
}

// 打开权限设置弹窗
const openPermissionModal = (item) => {
  selectedItem.value = item
  permissionFormData.value = {
    id: item.id,
    nickname: item.nickname,
    isSuper: item.isSuper || false,
    permissions: item.permissions || [],
    currentRole: 'custom'
  }
  permissionModalVisible.value = true
}

// 切换权限
const togglePermission = (permKey) => {
  const index = permissionFormData.value.permissions.indexOf(permKey)
  if (index > -1) {
    permissionFormData.value.permissions.splice(index, 1)
  } else {
    permissionFormData.value.permissions.push(permKey)
  }
}

// 提交权限设置
const handlePermissionSubmit = async () => {
  isSubmitting.value = true
  try {
    const apiConfig = await import('@/config/api.js')
    const baseURL = apiConfig.default.baseURL || 'http://localhost:3001/api'
    const response = await fetch(`${baseURL}/admin/admins/${permissionFormData.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminStore.token}`
      },
      body: JSON.stringify({
        nickname: permissionFormData.value.nickname,
        isSuper: permissionFormData.value.isSuper,
        permissions: permissionFormData.value.isSuper ? [] : permissionFormData.value.permissions
      })
    })
    
    const result = await response.json()
    if (result.code === 'SUCCESS') {
      messageManager.success('权限设置成功')
      permissionModalVisible.value = false
      window.location.reload()
    } else {
      messageManager.error(result.message || '权限设置失败')
    }
  } catch (error) {
    console.error('权限设置失败:', error)
    messageManager.error('权限设置失败')
  } finally {
    isSubmitting.value = false
  }
}

// 确认删除
const handleConfirmDelete = async () => {
  if (!selectedItem.value) return
  
  isSubmitting.value = true
  try {
    const apiConfig = await import('@/config/api.js')
    const baseURL = apiConfig.default.baseURL || 'http://localhost:3001/api'
    const response = await fetch(`${baseURL}/admin/admins/${selectedItem.value.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminStore.token}`
      }
    })
    
    const result = await response.json()
    if (result.code === 'SUCCESS') {
      messageManager.success('删除成功')
      showDeleteModal.value = false
      window.location.reload()
    } else {
      messageManager.error(result.message || '删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
    messageManager.error('删除失败')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.admin-management {
  padding: 20px;
}

:deep(.permission-groups) {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 400px;
  overflow-y: auto;
}

:deep(.permission-group) {
  background: var(--bg-color-secondary);
  padding: 12px;
  border-radius: 8px;
}

:deep(.group-title) {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

:deep(.permission-grid) {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

:deep(.permission-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  cursor: pointer;
  font-size: 13px;
}

:deep(.permission-item:hover) {
  background: rgba(0,0,0,0.05);
  border-radius: 4px;
}

:deep(.permission-item input) {
  cursor: pointer;
}
</style>
