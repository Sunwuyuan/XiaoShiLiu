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

  getConfig() {
    return request({
      url: '/game/config',
      method: 'get'
    })
  }
}

export default gameApi
