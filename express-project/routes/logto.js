const express = require('express');
const router = express.Router();
const { HTTP_STATUS, RESPONSE_CODES } = require('../constants');
const { pool } = require('../config/config');
const config = require('../config/config');
const { generateAccessToken } = require('../utils/jwt');
const { getIPLocation, getRealIP } = require('../utils/ipLocation');
const axios = require('axios');

// Logto SDK 相关配置
const LOGTO_CONFIG = {
  endpoint: config.logto.endpoint,
  appId: config.logto.appId,
  appSecret: config.logto.appSecret
};

// 检查数据库中是否存在 logto_id 列
async function checkLogtoColumnExists() {
  try {
    const [columns] = await pool.execute(
      "SHOW COLUMNS FROM users LIKE 'logto_id'"
    );
    return columns.length > 0;
  } catch (error) {
    console.warn('检查 logto_id 列失败:', error.message);
    return false;
  }
}

// 获取 Logto Token
// 使用授权码换取访问令牌
async function getLogtoToken(code) {
  const tokenUrl = `${LOGTO_CONFIG.endpoint}/oidc/token`;
  
  const params = new URLSearchParams();
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', config.logto.redirectUri);
  params.append('client_id', LOGTO_CONFIG.appId);
  params.append('client_secret', LOGTO_CONFIG.appSecret);

  const response = await axios.post(tokenUrl, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  return response.data;
}

// 使用 Access Token 获取 Logto 用户信息
async function getLogtoUserInfo(accessToken) {
  const userInfoUrl = `${LOGTO_CONFIG.endpoint}/oidc/me`;

  const response = await axios.get(userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return response.data;
}

// 从 Logto 用户 ID 查找或创建本地用户
async function findOrCreateUser(logtoUser, req) {
  const logtoColumnExists = await checkLogtoColumnExists();
  const logtoId = logtoUser.sub; // Logto 的 sub 就是用户的唯一 ID
  const nickname = logtoUser.name || logtoUser.nickname || logtoUser.username || 'Logto 用户';
  const avatar = logtoUser.picture || '';
  const email = logtoUser.email || '';
  
  let user;
  
  if (logtoColumnExists) {
    let [users] = await pool.execute(
      'SELECT * FROM users WHERE logto_id = ?',
      [logtoId]
    );
    
    if (users.length > 0) {
      user = users[0];
      await pool.execute(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
      return user;
    }
    
    const userIP = getRealIP(req);
    let ipLocation = '未知';
    try {
      ipLocation = await getIPLocation(userIP);
    } catch (error) {
      console.log('IP 属地查询失败:', error.message);
    }
    
    const userId = 'l' + Date.now().toString(36);
    const [result] = await pool.execute(
      'INSERT INTO users (logto_id, user_id, nickname, avatar, bio, email, location, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [
        logtoId,
        userId.slice(0, 15),
        nickname,
        avatar,
        '',
        email,
        ipLocation
      ]
    );
    
    const [newUsers] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [result.insertId]
    );
    
    return newUsers[0];
  } else {
    const userIP = getRealIP(req);
    let ipLocation = '未知';
    try {
      ipLocation = await getIPLocation(userIP);
    } catch (error) {
      console.log('IP 属地查询失败:', error.message);
    }
    
    const userId = 'l' + Date.now().toString(36);
    const [result] = await pool.execute(
      'INSERT INTO users (user_id, nickname, avatar, bio, email, location, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [
        userId.slice(0, 15),
        nickname,
        avatar,
        '',
        email,
        ipLocation
      ]
    );
    
    const [newUsers] = await pool.execute(
      'SELECT * FROM users WHERE id = ?',
      [result.insertId]
    );
    
    return newUsers[0];
  }
}

// Logto 登录 URL 生成
router.get('/sign-in', async (req, res) => {
  try {
    if (!LOGTO_CONFIG.endpoint || !LOGTO_CONFIG.appId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.ERROR,
        message: 'Logto 配置未完成，请检查环境变量配置'
      });
    }

    const redirectUri = encodeURIComponent(config.logto.redirectUri);
    const state = Math.random().toString(36).substring(2, 15);
    
    const signInUrl = `${LOGTO_CONFIG.endpoint}/oidc/auth?` +
      `client_id=${LOGTO_CONFIG.appId}` +
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

    if (!LOGTO_CONFIG.endpoint || !LOGTO_CONFIG.appId || !LOGTO_CONFIG.appSecret) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        code: RESPONSE_CODES.ERROR,
        message: 'Logto 配置未完成'
      });
    }

    console.log('处理 Logto 回调，code:', code);
    
    const tokenData = await getLogtoToken(code);
    const logtoUser = await getLogtoUserInfo(tokenData.access_token);
    console.log('获取到 Logto 用户信息:', logtoUser);
    
    const user = await findOrCreateUser(logtoUser, req);
    
    if (!user) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        code: RESPONSE_CODES.ERROR,
        message: '用户登录失败'
      });
    }
    
    const token = generateAccessToken({ 
      userId: user.id, 
      user_id: user.user_id 
    });
    
    delete user.password;
    
    res.json({
      code: RESPONSE_CODES.SUCCESS,
      message: '登录成功',
      data: {
        user,
        tokens: {
          access_token: token,
          logto_access_token: tokenData.access_token,
          logto_refresh_token: tokenData.refresh_token || '',
          expires_in: tokenData.expires_in || 3600 * 24 * 7
        }
      }
    });
  } catch (error) {
    console.error('登录回调处理失败:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      code: RESPONSE_CODES.ERROR,
      message: error.message || '登录失败'
    });
  }
});

// 获取登出 URL
router.get('/sign-out', async (req, res) => {
  try {
    const postLogoutRedirectUri = encodeURIComponent(config.logto.postLogoutRedirectUri);
    const signOutUrl = `${LOGTO_CONFIG.endpoint}/oidc/session/end?` +
      `client_id=${LOGTO_CONFIG.appId}` +
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

module.exports = {
  router
};
