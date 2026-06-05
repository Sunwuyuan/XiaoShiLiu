/**
 * 悦社社区 - 游戏管理 API 封装
 * 提供角色管理、皮肤上传等接口
 * 
 * @author zhaishis
 * @version v1.0.0
 */

import request from './request'

export const gameApi = {
  getProfiles() {
    return request({
      url: '/game/profile',
      method: 'get'
    })
  },

  createProfile(data) {
    return request({
      url: '/game/profile/create',
      method: 'post',
      data
    })
  },

  updateProfileName(profileId, newName) {
    return request({
      url: `/game/profile/${profileId}/name`,
      method: 'put',
      data: { new_name: newName }
    })
  },

  updateProfilePassword(profileId, oldPassword, newPassword) {
    return request({
      url: `/game/profile/${profileId}/password`,
      method: 'put',
      data: {
        old_password: oldPassword,
        new_password: newPassword
      }
    })
  },

  uploadSkin(profileId, file, model) {
    const formData = new FormData()
    formData.append('skin', file)
    if (model) {
      formData.append('model', model)
    }

    return request({
      url: `/game/profile/${profileId}/skin`,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    })
  },

  deleteSkin(profileId) {
    return request({
      url: `/game/profile/${profileId}/skin`,
      method: 'delete'
    })
  },

  uploadCape(profileId, file) {
    const formData = new FormData()
    formData.append('cape', file)

    return request({
      url: `/game/profile/${profileId}/cape`,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000
    })
  },

  deleteCape(profileId) {
    return request({
      url: `/game/profile/${profileId}/cape`,
      method: 'delete'
    })
  },

  deleteProfile(profileId) {
    return request({
      url: `/game/profile/${profileId}`,
      method: 'delete'
    })
  },

  getConfig() {
    return request({
      url: '/game/config',
      method: 'get'
    })
  },

  // ========== 衣柜相关 API ==========

  // 获取衣柜列表
  getWardrobe(profileId, params = {}) {
    return request({
      url: `/game/profile/${profileId}/wardrobe`,
      method: 'get',
      params: {
        page: params.page || 1,
        limit: params.limit || 20
      }
    })
  },

  // 添加皮肤到衣柜
  addToWardrobe(profileId, formData) {
    return request({
      url: `/game/profile/${profileId}/wardrobe`,
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000
    })
  },

  // 更新衣柜项（改名、换模型）
  updateWardrobeItem(profileId, itemId, data) {
    return request({
      url: `/game/profile/${profileId}/wardrobe/${itemId}`,
      method: 'put',
      data
    })
  },

  // 删除衣柜项
  deleteWardrobeItem(profileId, itemId) {
    return request({
      url: `/game/profile/${profileId}/wardrobe/${itemId}`,
      method: 'delete'
    })
  },

  // 穿戴衣柜中的皮肤
  equipWardrobeItem(profileId, itemId) {
    return request({
      url: `/game/profile/${profileId}/wardrobe/${itemId}/equip`,
      method: 'post'
    })
  },

  // 排序衣柜项
  sortWardrobeItems(profileId, items) {
    return request({
      url: `/game/profile/${profileId}/wardrobe/sort`,
      method: 'put',
      data: { items }
    })
  },

  // ========== 临时密码 API ==========

  // 获取临时密码列表
  getTempPasswords(profileId) {
    return request({
      url: `/game/profile/${profileId}/temp-passwords`,
      method: 'get'
    })
  },

  // 创建临时密码
  createTempPassword(profileId, data) {
    return request({
      url: `/game/profile/${profileId}/temp-password`,
      method: 'post',
      data
    })
  },

  // 撤销临时密码
  revokeTempPassword(profileId, tempId) {
    return request({
      url: `/game/profile/${profileId}/temp-password/${tempId}`,
      method: 'delete'
    })
  },

  // ========== 会话管理 API ==========

  // 获取会话列表
  getSessions(profileId) {
    return request({
      url: `/game/profile/${profileId}/sessions`,
      method: 'get'
    })
  },

  // 踢出指定会话
  kickSession(profileId, sessionId) {
    return request({
      url: `/game/profile/${profileId}/session/${sessionId}`,
      method: 'delete'
    })
  },

  // 踢出所有临时密码会话
  kickAllTempSessions(profileId) {
    return request({
      url: `/game/profile/${profileId}/sessions/temp`,
      method: 'delete'
    })
  }
}

export default gameApi
