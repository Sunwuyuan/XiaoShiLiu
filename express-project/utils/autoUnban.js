/**
 * 自动解封功能
 * 定期检查并自动解封过期的用户封禁记录
 */

const { getDB } = require('./db');

/**
 * 自动解封过期用户
 * @returns {Promise<void>}
 */
const autoUnbanUsers = async () => {
  try {
    const db = getDB();
    
    // 第一步：查询需要自动解封的封禁记录
    const banRecords = await db('user_ban')
      .select('id', 'user_id')
      .where({ status: 0 })
      .whereNotNull('end_time')
      .where('end_time', '<', db.fn.now());
    
    if (banRecords.length > 0) {
      const banIds = banRecords.map(r => r.id);
      const userIds = banRecords.map(r => r.user_id);
      
      // 第二步：更新封禁记录状态为自动解封（2=自动解封）
      await db('user_ban')
        .whereIn('id', banIds)
        .update({ status: 2 });
      
      // 第三步：更新用户的 is_active 状态为 1（激活）
      await db('users')
        .whereIn('id', userIds)
        .update({ is_active: 1 });
      
      console.log(`● 自动解封 ${banIds.length} 个用户，重置 ${userIds.length} 个账号状态`);
    }
  } catch (error) {
    console.error('自动解封失败:', error.message);
  }
};

/**
 * 启动自动解封服务
 * @param {number} interval - 检查间隔（毫秒），默认1小时
 */
const startAutoUnbanService = (interval = 1 * 60 * 1000) => {
  // 启动时执行一次自动解封
  autoUnbanUsers();
  
  // 定期执行自动解封
  const intervalId = setInterval(autoUnbanUsers, interval);
  
  console.log(`● 自动解封功能已启用，每 ${Math.floor(interval / (60 * 1000))} 分钟检查一次`);
  
  return intervalId;
};

module.exports = {
  autoUnbanUsers,
  startAutoUnbanService
};
