/**
 * WebSocket 聊天服务初始化
 * 基于 ws 库创建 WebSocket 服务器，处理连接认证、心跳检测和消息分发
 */

const { WebSocketServer } = require('ws');
const { verifyToken } = require('../utils/jwt');
const connectionManager = require('./connectionManager');
const { handleMessage } = require('./messageHandler');
const cookie = require('cookie');

// 心跳配置
const PING_INTERVAL = 30000;  // 30 秒发送一次 ping
const PONG_TIMEOUT = 90000;   // 90 秒无响应则断开

/**
 * 初始化 WebSocket 聊天服务
 * @param {http.Server} httpServer - HTTP 服务器实例
 */
function initializeChatServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/chat'
  });

  console.log('[ChatServer] WebSocket 聊天服务已启动，路径: /ws/chat');

  // 定时心跳检测
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        // 上一次 ping 未收到 pong，断开连接
        return ws.terminate();
      }
      // 标记为等待 pong
      ws.isAlive = false;
      ws.ping();
    });
  }, PING_INTERVAL);

  // 当服务器关闭时清理心跳定时器
  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    console.log('[ChatServer] WebSocket 服务已关闭');
  });

  wss.on('connection', (ws, req) => {
    // 认证：优先从 URL query 参数取 token，降级从 Cookie 取
    const url = new URL(req.url, `ws://${req.headers.host}`);
    let token = url.searchParams.get('token');

    if (!token && req.headers.cookie) {
      const cookies = cookie.parse(req.headers.cookie);
      token = cookies.token || cookies.admin_token || null;
    }

    if (!token) {
      ws.close(4001, '缺少认证令牌');
      return;
    }

    // 验证 token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      ws.close(4001, '认证令牌无效或已过期');
      return;
    }

    // 提取用户 ID（兼容普通用户和管理员 token）
    const userId = decoded.userId || decoded.adminId;
    if (!userId) {
      ws.close(4001, '令牌中未包含用户标识');
      return;
    }

    // 初始化心跳状态
    ws.isAlive = true;

    // 监听 pong 响应
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // 注册连接
    connectionManager.addConnection(userId, ws);
    console.log(`[ChatServer] 用户 ${userId} 已连接，当前总连接数: ${connectionManager.getSize()}`);

    // 监听消息
    ws.on('message', async (rawData) => {
      try {
        const messageStr = rawData.toString();
        const message = JSON.parse(messageStr);

        // 交由消息处理器处理
        await handleMessage(ws, userId, message);
      } catch (err) {
        console.error(`[ChatServer] 用户 ${userId} 消息解析失败:`, err.message);
        try {
          ws.send(JSON.stringify({ type: 'error', message: '消息格式错误' }));
        } catch (sendErr) {
          // 忽略发送失败
        }
      }
    });

    // 监听连接关闭
    ws.on('close', (code, reason) => {
      connectionManager.removeConnection(userId, ws);
      console.log(`[ChatServer] 用户 ${userId} 已断开 (code: ${code})，当前总连接数: ${connectionManager.getSize()}`);
    });

    // 监听连接错误
    ws.on('error', (err) => {
      console.error(`[ChatServer] 用户 ${userId} 连接错误:`, err.message);
      connectionManager.removeConnection(userId, ws);
    });
  });

  return wss;
}

module.exports = {
  initializeChatServer
};
