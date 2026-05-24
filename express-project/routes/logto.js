const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES } = require('../constants');
const { pool } = require('../config/config');
const config = require('../config/config');
const { generateAccessToken } = require('../utils/jwt');
const { getIPLocation, getRealIP } = require('../utils/ipLocation');

// 简单的 Logto 登录 URL 生成（模拟实现，实际项目需要配置 Logto）
router.get('/sign-in', async (req, res) => {
  try {
    // 检查 Logto 配置检查
    if (!config.logto.endpoint || !config.logto.appId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.ERROR,
        message: 'Logto 配置未完成，请检查环境变量配置'
      });
    }

    // 构建 Logto 授权 URL（使用标准 OAuth2 流程
    const redirectUri = encodeURIComponent(config.logto.redirectUri);
    const state = Math.random().toString(36).substring(2, 15);
    
    const signInUrl = `${config.logto.endpoint}/oidc/auth?` +
      `client_id=${config.logto.appId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=openid profile email` +
      `&state=${state}`;
    
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '获取登录地址成功',
      data: {
        signInUrl,
        state
      }
    });
  } catch (error) {
    console.error('获取登录地址失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取登录地址失败'
    });
  }
});

// Logto 回调处理
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    
    if (!code) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.VALIDATION_ERROR,
        message: '缺少授权码'
      });
    }

    // 检查 Logto 配置
    if (!config.logto.endpoint || !config.logto.appId || !config.logto.appSecret) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.ERROR,
        message: 'Logto 配置未完成'
      });
    }

    // 模拟获取 token（实际项目中需要集成完整 Logto SDK）
    // 这里我们演示了一个简化版本，实际使用标准 OAuth2 流程
    
    // 1. 使用授权码获取 access token
    // 2. 使用 access token 获取用户信息
    // 3. 同步或创建本地用户
    
    // 为了演示，我们模拟一个用户
    // 在真实场景中，应该调用 Logto 的 API
    console.log('处理 Logto 回调，code:', code);
    
    // 查找或创建本地用户（演示
    // 我们使用模拟的用户数据，实际需要从 Logto API 获取
    const mockLogtoUserId = 'logto_' + Date.now();
    let [users] = await pool.execute(
      'SELECT * FROM users WHERE logto_id = ?',
      [mockLogtoUserId]
    );
    
    let user;
    
    if (users.length === 0) {
      // 创建新用户
      const userIP = getRealIP(req);
      let ipLocation = '未知';
      try {
        ipLocation = await getIPLocation(userIP);
      } catch (error) {
        console.error('获取 IP 属地失败:', error);
      }
      
      const userId = 'logto_' + Date.now().toString(36);
      const [result] = await pool.execute(
        'INSERT INTO users (logto_id, user_id, nickname, avatar, bio, email, location, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [
          mockLogtoUserId,
          userId.slice(0, 15), // 使用 Logto ID 的前 15 位作为小石榴号
          'Logto 用户',
          '',
          '',
          '',
          ipLocation
        ]
      );
      
      const [newUsers] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newUsers[0];
    } else {
      // 更新用户信息
      user = users[0];
      
      // 更新登录时间
      await pool.execute(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
    }
    
    // 生成我们自己的 JWT Token（保持兼容现有系统）
    const token = generateAccessToken({ 
      userId: user.id, 
      user_id: user.user_id,
      logtoId: mockLogtoUserId 
    });
    
    // 清理密码字段
    delete user.password;
    
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '登录成功',
      data: {
        user,
        tokens: {
          access_token: token,
          logto_access_token: 'mock_logto_token_' + Date.now(),
          expires_in: 3600 * 24 * 7 // 7 天
        }
      }
    });
  } catch (error) {
    console.error('登录回调处理失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '登录失败'
    });
  }
});

// 获取登出 URL
router.get('/sign-out', async (req, res) => {
  try {
    // 构建 Logto 登出 URL
    const postLogoutRedirectUri = encodeURIComponent(config.logto.postLogoutRedirectUri);
    const signOutUrl = `${config.logto.endpoint}/oidc/session/end?` +
      `client_id=${config.logto.appId}` +
      `&post_logout_redirect_uri=${postLogoutRedirectUri}`;
    
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '获取登出地址成功',
      data: {
        signOutUrl
      }
    });
  } catch (error) {
    console.error('获取登出地址失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: '获取登出地址失败'
    });
  }
});

// Logto 认证中间件（与现有认证保持兼容
const authenticateLogto = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        code: RESPONSE_CODES.UNAUTHORIZED,
        message: '未授权访问'
      });
    }
    
    const token = authHeader.substring(7);
    
    // 尝试使用现有 JWT 验证
    const { verifyToken } = require('../utils/jwt');
    try {
      const decoded = verifyToken(token);
      
      // 获取用户信息
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE id = ?',
        [decoded.userId]
      );
      
      if (users.length === 0) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          code: RESPONSE_CODES.UNAUTHORIZED,
          message: '用户不存在'
        });
      }
      
      req.user = users[0];
      return next();
    } catch (jwtError) {
      console.error('认证失败:', jwtError);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        code: RESPONSE_CODES.UNAUTHORIZED,
        message: '无效的认证令牌'
      });
    }
  } catch (error) {
    console.error('认证失败:', error);
    res.status(HTTP_STATUS.UNAUTHORIZED).json({
      code: RESPONSE_CODES.UNAUTHORIZED,
      message: '认证失败'
    });
  }
};

module.exports = {
  router,
  authenticateLogto
};
