/**
 * WebSocket 连接管理器
 * 管理 userId <-> WebSocket 连接的映射关系
 * 支持同一用户多设备同时在线
 */

// 使用 Map 存储：userId (String) -> Set<WebSocket>
const connections = new Map();

/**
 * 添加连接
 * @param {string} userId - 用户ID
 * @param {WebSocket} ws - WebSocket 连接实例
 */
function addConnection(userId, ws) {
  if (!userId) return;

  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }

  connections.get(userId).add(ws);
}

/**
 * 移除连接
 * @param {string} userId - 用户ID
 * @param {WebSocket} ws - WebSocket 连接实例
 */
function removeConnection(userId, ws) {
  if (!userId || !connections.has(userId)) return;

  const userConnections = connections.get(userId);
  userConnections.delete(ws);

  // 如果该用户已无连接，则删除该用户条目
  if (userConnections.size === 0) {
    connections.delete(userId);
  }
}

/**
 * 获取用户的第一个活跃连接
 * @param {string} userId - 用户ID
 * @returns {WebSocket|null}
 */
function getConnection(userId) {
  if (!userId || !connections.has(userId)) return null;

  const userConnections = connections.get(userId);
  for (const ws of userConnections) {
    // 检查连接是否仍然活跃
    if (ws.readyState === 1) { // WebSocket.OPEN
      return ws;
    }
  }

  return null;
}

/**
 * 获取用户的所有连接
 * @param {string} userId - 用户ID
 * @returns {Set<WebSocket>|null}
 */
function getConnections(userId) {
  if (!userId || !connections.has(userId)) return null;

  return connections.get(userId);
}

/**
 * 判断用户是否在线
 * @param {string} userId - 用户ID
 * @returns {boolean}
 */
function isUserOnline(userId) {
  if (!userId || !connections.has(userId)) return false;

  const userConnections = connections.get(userId);
  for (const ws of userConnections) {
    if (ws.readyState === 1) {
      return true;
    }
  }

  return false;
}

/**
 * 获取所有在线用户 ID
 * @returns {string[]}
 */
function getOnlineUserIds() {
  const onlineIds = [];

  for (const [userId, userConnections] of connections) {
    for (const ws of userConnections) {
      if (ws.readyState === 1) {
        onlineIds.push(userId);
        break; // 只需确认至少有一个活跃连接即可
      }
    }
  }

  return onlineIds;
}

/**
 * 向指定用户的所有活跃连接发送 JSON 数据
 * @param {string} userId - 用户ID
 * @param {Object} data - 要发送的数据对象
 */
function broadcastToUser(userId, data) {
  if (!userId || !connections.has(userId)) return;

  const userConnections = connections.get(userId);
  const message = JSON.stringify(data);

  for (const ws of userConnections) {
    if (ws.readyState === 1) {
      try {
        ws.send(message);
      } catch (err) {
        console.error(`[ConnectionManager] 向用户 ${userId} 发送消息失败:`, err.message);
      }
    }
  }
}

/**
 * 向多个用户广播消息
 * @param {string[]} userIds - 用户ID数组
 * @param {Object} data - 要发送的数据对象
 */
function broadcastToUsers(userIds, data) {
  if (!Array.isArray(userIds)) return;

  for (const userId of userIds) {
    broadcastToUser(userId, data);
  }
}

/**
 * 移除用户的所有连接（用于踢下线）
 * @param {string} userId - 用户ID
 */
function removeUserConnections(userId) {
  if (!userId || !connections.has(userId)) return;

  const userConnections = connections.get(userId);

  for (const ws of userConnections) {
    if (ws.readyState === 1) {
      try {
        ws.close(4003, '您已在其他设备登录');
      } catch (err) {
        console.error(`[ConnectionManager] 关闭用户 ${userId} 的连接失败:`, err.message);
      }
    }
  }

  connections.delete(userId);
}

/**
 * 获取当前连接总数
 * @returns {number}
 */
function getSize() {
  let total = 0;

  for (const userConnections of connections.values()) {
    for (const ws of userConnections) {
      if (ws.readyState === 1) {
        total++;
      }
    }
  }

  return total;
}

module.exports = {
  addConnection,
  removeConnection,
  getConnection,
  getConnections,
  isUserOnline,
  getOnlineUserIds,
  broadcastToUser,
  broadcastToUsers,
  removeUserConnections,
  getSize
};
