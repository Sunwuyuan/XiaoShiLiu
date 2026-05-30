/**
 * 悦社社区 - Yggdrasil 标准认证 API 路由
 * 完全遵循 Mojang 官方 Yggdrasil API 规范
 * 供 authlib-injector 和 Minecraft 客户端调用
 * 
 * @author zhaishis
 * @version v1.1.0
 * @see https://wiki.vg/Authentication
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../config/config');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const { uploadFile } = require('../utils/uploadHelper');
const {
  getProfileByName,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  generateClientToken,
  saveTokens,
  findTokenByAccessToken,
  findTokenByRefreshToken,
  invalidateAllTokens,
  invalidateToken,
  getProfileByUuid,
  formatUuid,
  encodeTextures,
  auditLog,
  buildAuthResponse,
  buildErrorResponse,
  createFileHash
} = require('../utils/yggdrasilHelper');

// 内存存储用于serverId验证（生产环境建议使用Redis）
const serverIdCache = new Map();

// 配置 multer 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB限制
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('只允许上传PNG格式的图片'));
    }
  }
});

// 设置 ALI 响应头
router.use((req, res, next) => {
  // API 地址指示 (API Location Indication)
  res.setHeader('X-Authlib-Injector-API-Location', '/api/yggdrasil/');
  next();
});

router.use((req, res, next) => {
  console.log(`[Yggdrasil] 📥 ${req.method} ${req.originalUrl}`);
  console.log(`[Yggdrasil] 🔍 IP: ${req.ip}`);
  console.log(`[Yggdrasil] 🌐 User-Agent: ${req.headers['user-agent'] || 'N/A'}`);
  if (Object.keys(req.body).length > 0) {
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***';
    if (safeBody.accessToken) safeBody.accessToken = `${safeBody.accessToken.substring(0, 20)}...`;
    console.log(`[Yggdrasil] 📦 Body:`, JSON.stringify(safeBody));
  }
  next();
});

// ========== API 元数据获取 ==========
router.get('/', (req, res) => {
  console.log('[Yggdrasil] 📋 请求API元数据');
  
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  // 生成签名密钥对（如果没有的话）
  // 注意：实际生产环境应该从配置文件或环境变量读取
  const signaturePublicKey = process.env.YGGDRASIL_PUBLIC_KEY || `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAyZ3Q...
-----END PUBLIC KEY-----`;

  res.json({
    meta: {
      serverName: '悦社社区 Yggdrasil 验证服务',
      implementationName: 'yueshe-yggdrasil',
      implementationVersion: '1.1.0',
      links: {
        homepage: baseUrl,
        register: `${baseUrl}/register`
      },
      feature: {
        non_email_login: true,
        enable_profile_key: false,
        username_check: true
      }
    },
    skinDomains: [
      '.minecraft.net',
      '.mojang.com',
      new URL(baseUrl).hostname
    ],
    signaturePublickey: signaturePublicKey
  });
});

// ========== 认证服务 (Auth Server) ==========

router.post('/authserver/authenticate', async (req, res) => {
  console.log('[Yggdrasil] 🔐 开始认证流程...');
  try {
    const { username, password, clientToken, requestUser, agent } = req.body;

    console.log(`[Yggdrasil] 👤 尝试登录用户: ${username}`);

    if (!username || !password) {
      console.log(`[Yggdrasil] ❌ 缺少用户名或密码`);
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid credentials. Invalid username or password.'
      ));
    }

    const profile = await getProfileByName(username);

    if (!profile) {
      console.log(`[Yggdrasil] ❌ 用户 ${username} 不存在`);
      await auditLog('LOGIN_FAILED', null, null, req.ip, { reason: 'user_not_found', username });
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid credentials. Invalid username or password.'
      ));
    }

    if (profile.is_banned) {
      console.log(`[Yggdrasil] ❌ 用户 ${username} 已被封禁`);
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '该角色已被封禁'
      ));
    }

    console.log(`[Yggdrasil] 🔑 验证密码...`);
    const valid = await verifyPassword(password, profile.password_hash);
    
    if (!valid) {
      console.log(`[Yggdrasil] ❌ 用户 ${username} 密码错误`);
      await auditLog('LOGIN_FAILED', profile.user_id, profile.id, req.ip, { reason: 'wrong_password' });
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid credentials. Invalid username or password.'
      ));
    }

    console.log(`[Yggdrasil] ✅ 密码验证成功，生成Token...`);
    const finalClientToken = clientToken || generateClientToken();
    const accessToken = generateAccessToken(profile);
    const refreshToken = generateRefreshToken();

    await invalidateAllTokens(profile.id);
    console.log(`[Yggdrasil] 🗑️ 旧Token已清除`);

    await saveTokens(
      profile.id,
      accessToken,
      refreshToken,
      finalClientToken,
      req.ip,
      req.headers['user-agent']
    );

    await auditLog('LOGIN_SUCCESS', profile.user_id, profile.id, req.ip, {
      client: req.headers['user-agent'] || 'unknown'
    });

    const response = buildAuthResponse(profile, accessToken, finalClientToken);

    console.log(`[Yggdrasil] ✅ 用户 ${username} 认证成功 IP: ${req.ip}`);
    console.log(`[Yggdrasil] 📤 返回响应: accessToken长度=${accessToken.length}, playerName=${response.selectedProfile.name}`);
    res.json(response);

  } catch (error) {
    console.error('[Yggdrasil] ❌ authenticate 错误:', error);
    console.error('[Yggdrasil] 📋 错误堆栈:', error.stack);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

router.post('/authserver/refresh', async (req, res) => {
  console.log('[Yggdrasil] 🔄 开始Token刷新...');
  try {
    const { accessToken, clientToken, requestUser, selectedProfile } = req.body;

    if (!accessToken) {
      console.log(`[Yggdrasil] ❌ 缺少accessToken`);
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid token.'
      ));
    }

    const tokenRecord = await findTokenByAccessToken(accessToken);

    if (!tokenRecord) {
      console.log(`[Yggdrasil] ❌ Token无效或已过期`);
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid token.'
      ));
    }

    // 如果指定了clientToken，需要验证
    if (clientToken && tokenRecord.client_token !== clientToken) {
      console.log(`[Yggdrasil] ❌ clientToken不匹配`);
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid token.'
      ));
    }

    console.log(`[Yggdrasil] ✅ 找到有效Token，用户: ${tokenRecord.player_name}`);
    const newAccessToken = generateAccessToken(tokenRecord);
    const newRefreshToken = generateRefreshToken();
    const finalClientToken = clientToken || tokenRecord.client_token;

    await pool.execute(
      `UPDATE yggdrasil_tokens 
       SET access_token = ?, refresh_token = ?, client_token = ?, expires_at = DATE_ADD(NOW(), INTERVAL 7 DAY)
       WHERE id = ?`,
      [newAccessToken, newRefreshToken, finalClientToken, tokenRecord.id]
    );

    let response = {
      accessToken: newAccessToken,
      clientToken: finalClientToken
    };

    if (requestUser && requestUser === true) {
      response.selectedProfile = {
        id: formatUuid(tokenRecord.uuid),
        name: tokenRecord.player_name
      };

      response.user = {
        id: crypto.createHash('md5').update(String(tokenRecord.user_id)).digest('hex'),
        properties: []
      };
    } else {
      response.selectedProfile = {
        id: formatUuid(tokenRecord.uuid),
        name: tokenRecord.player_name
      };
    }

    console.log(`[Yggdrasil] ✅ Token 刷新成功 用户: ${tokenRecord.player_name}`);
    res.json(response);

  } catch (error) {
    console.error('[Yggdrasil] ❌ refresh 错误:', error);
    console.error('[Yggdrasil] 📋 错误堆栈:', error.stack);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

router.post('/authserver/validate', async (req, res) => {
  console.log('[Yggdrasil] ✅ 开始Token验证...');
  try {
    const { accessToken, clientToken } = req.body;

    if (!accessToken) {
      console.log(`[Yggdrasil] ❌ 缺少accessToken`);
      return res.status(403).end();
    }

    const tokenRecord = await findTokenByAccessToken(accessToken);

    if (!tokenRecord) {
      console.log(`[Yggdrasil] ❌ Token无效或已过期`);
      return res.status(403).end();
    }

    if (clientToken && tokenRecord.client_token !== clientToken) {
      console.log(`[Yggdrasil] ❌ clientToken不匹配`);
      return res.status(403).end();
    }

    console.log(`[Yggdrasil] ✅ Token验证成功 用户: ${tokenRecord.player_name}`);
    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] ❌ validate 错误:', error);
    res.status(403).end();
  }
});

router.post('/authserver/signout', async (req, res) => {
  console.log('[Yggdrasil] 🚪 开始登出...');
  try {
    const { username, password } = req.body;

    console.log(`[Yggdrasil] 👤 用户 ${username} 请求登出`);

    if (!username || !password) {
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '缺少用户名或密码'
      ));
    }

    const profile = await getProfileByName(username);

    if (!profile) {
      return res.status(204).end();
    }

    const valid = await verifyPassword(password, profile.password_hash);
    
    if (!valid) {
      return res.status(204).end();
    }

    const deletedCount = await invalidateAllTokens(profile.id);

    await auditLog('SIGNOUT', profile.user_id, profile.id, req.ip);

    console.log(`[Yggdrasil] ✅ 用户 ${username} 登出成功，已删除 ${deletedCount} 个Token`);
    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] ❌ signout 错误:', error);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

router.post('/authserver/invalidate', async (req, res) => {
  console.log('[Yggdrasil] 🗑️ 开始使Token失效...');
  try {
    const { accessToken, clientToken } = req.body;

    if (!accessToken) {
      console.log(`[Yggdrasil] ❌ 缺少accessToken`);
      return res.status(204).end();
    }

    const success = await invalidateToken(accessToken);

    if (success) {
      console.log('[Yggdrasil] ✅ Token失效成功');
    }

    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] ❌ invalidate 错误:', error);
    res.status(204).end();
  }
});

// ========== 会话服务 (Session Server) ==========

// 客户端加入服务器 - 记录serverId
router.post('/sessionserver/session/minecraft/join', async (req, res) => {
  console.log('[Yggdrasil] 🎮 客户端请求加入服务器...');
  try {
    const { accessToken, selectedProfile, serverId } = req.body;

    if (!accessToken || !selectedProfile || !serverId) {
      console.log('[Yggdrasil] ❌ 缺少必要参数');
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid token.'
      ));
    }

    // 验证accessToken
    const tokenRecord = await findTokenByAccessToken(accessToken);

    if (!tokenRecord) {
      console.log('[Yggdrasil] ❌ Token无效');
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid token.'
      ));
    }

    // 验证selectedProfile是否与token绑定的角色一致
    const normalizedTokenUuid = tokenRecord.uuid.replace(/-/g, '');
    const normalizedRequestUuid = selectedProfile.replace(/-/g, '');
    
    if (normalizedTokenUuid !== normalizedRequestUuid) {
      console.log('[Yggdrasil] ❌ 角色UUID不匹配');
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Invalid token.'
      ));
    }

    // 记录serverId信息到内存缓存（30秒过期）
    const cacheKey = serverId;
    serverIdCache.set(cacheKey, {
      accessToken: accessToken,
      profileId: tokenRecord.profile_id,
      playerName: tokenRecord.player_name,
      uuid: tokenRecord.uuid,
      ip: req.ip,
      timestamp: Date.now()
    });

    // 30秒后自动清理
    setTimeout(() => {
      serverIdCache.delete(cacheKey);
    }, 30000);

    console.log(`[Yggdrasil] ✅ 已记录serverId: ${serverId}, 玩家: ${tokenRecord.player_name}`);
    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] ❌ join 错误:', error);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

// 服务端验证客户端
router.get('/sessionserver/session/minecraft/hasJoined', async (req, res) => {
  console.log('[Yggdrasil] 🔍 服务端验证客户端...');
  try {
    const { username, serverId, ip } = req.query;

    if (!username || !serverId) {
      console.log('[Yggdrasil] ❌ 缺少必要参数');
      return res.status(204).end();
    }

    // 从缓存中查找serverId记录
    const cacheEntry = serverIdCache.get(serverId);

    if (!cacheEntry) {
      console.log(`[Yggdrasil] ❌ 未找到serverId记录: ${serverId}`);
      return res.status(204).end();
    }

    // 验证用户名是否匹配
    if (cacheEntry.playerName !== username) {
      console.log(`[Yggdrasil] ❌ 用户名不匹配: 请求=${username}, 缓存=${cacheEntry.playerName}`);
      return res.status(204).end();
    }

    // 如果提供了ip参数，验证IP（当prevent-proxy-connections开启时）
    if (ip && cacheEntry.ip !== ip) {
      console.log(`[Yggdrasil] ❌ IP不匹配: 请求=${ip}, 缓存=${cacheEntry.ip}`);
      return res.status(204).end();
    }

    // 获取角色完整信息
    const profile = await getProfileByUuid(cacheEntry.uuid);

    if (!profile || profile.is_banned) {
      console.log(`[Yggdrasil] ❌ 角色不存在或已封禁`);
      return res.status(204).end();
    }

    // 构建响应（包含角色属性及数字签名）
    const uuid = formatUuid(profile.uuid);
    
    const texturePayload = {
      timestamp: Date.now(),
      profileId: uuid,
      profileName: profile.player_name,
      textures: {}
    };

    if (profile.skin_url) {
      texturePayload.textures.SKIN = {
        url: profile.skin_url,
        metadata: {
          model: profile.skin_model || 'classic'
        }
      };
    }

    if (profile.cape_url) {
      texturePayload.textures.CAPE = {
        url: profile.cape_url
      };
    }

    const base64Value = Buffer.from(JSON.stringify(texturePayload)).toString('base64');

    const response = {
      id: uuid,
      name: profile.player_name,
      properties: [
        {
          name: 'textures',
          value: base64Value,
          signature: '' // 数字签名，实际生产环境需要实现
        }
      ]
    };

    // 清理已使用的serverId记录
    serverIdCache.delete(serverId);

    console.log(`[Yggdrasil] ✅ 验证成功: ${username}`);
    res.json(response);

  } catch (error) {
    console.error('[Yggdrasil] ❌ hasJoined 错误:', error);
    res.status(204).end();
  }
});

// 查询角色属性
router.get('/sessionserver/session/minecraft/profile/:uuid', async (req, res) => {
  console.log(`[Yggdrasil] 🎮 请求角色信息 UUID: ${req.params.uuid}`);
  try {
    const uuid = req.params.uuid;
    const unsignedParam = req.query.unsigned === 'true' || req.query.unsigned === undefined;

    console.log(`[Yggdrasil] 🔍 查询UUID: ${uuid}, unsigned: ${unsignedParam}`);

    const profile = await getProfileByUuid(uuid);

    if (!profile || profile.is_banned) {
      console.log(`[Yggdrasil] ❌ 角色不存在或已封禁 UUID: ${uuid}`);
      res.status(204).end();
      return;
    }

    console.log(`[Yggdrasil] ✅ 找到角色: ${profile.player_name}`);

    const texturePayload = {
      timestamp: Date.now(),
      profileId: uuid.replace(/-/g, ''),
      profileName: profile.player_name,
      textures: {}
    };

    if (profile.skin_url) {
      texturePayload.textures.SKIN = {
        url: profile.skin_url,
        metadata: {
          model: profile.skin_model || 'classic'
        }
      };
    }

    if (profile.cape_url) {
      texturePayload.textures.CAPE = {
        url: profile.cape_url
      };
    }

    const base64Value = Buffer.from(JSON.stringify(texturePayload)).toString('base64');

    const response = {
      id: uuid.replace(/-/g, ''),
      name: profile.player_name,
      properties: [
        {
          name: 'textures',
          value: base64Value
        }
      ]
    };

    if (!unsignedParam) {
      response.properties[0].signature = '';
    }

    console.log(`[Yggdrasil] 📤 返回角色信息: ${profile.player_name} (皮肤: ${profile.skin_url ? '✅' : '❌'}, 披风: ${profile.cape_url ? '✅' : '❌'})`);
    res.json(response);

  } catch (error) {
    console.error('[Yggdrasil] ❌ sessionserver/profile 错误:', error);
    console.error('[Yggdrasil] 📋 错误堆栈:', error.stack);
    res.status(204).end();
  }
});

// ========== 角色批量查询 ==========

// 按名称批量查询角色
router.post('/api/profiles/minecraft', async (req, res) => {
  console.log('[Yggdrasil] 📋 批量查询角色...');
  try {
    const names = req.body;

    if (!Array.isArray(names)) {
      console.log('[Yggdrasil] ❌ 请求格式错误');
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        'Invalid request format'
      ));
    }

    // 限制批量查询数量（至少为2）
    if (names.length > 100) {
      console.log(`[Yggdrasil] ❌ 查询数量过多: ${names.length}`);
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        'Too many names requested'
      ));
    }

    const results = [];

    for (const name of names) {
      if (typeof name !== 'string') continue;
      
      const profile = await getProfileByName(name);
      if (profile && !profile.is_banned) {
        results.push({
          id: formatUuid(profile.uuid),
          name: profile.player_name
        });
      }
    }

    console.log(`[Yggdrasil] ✅ 批量查询完成: ${results.length}/${names.length}`);
    res.json(results);

  } catch (error) {
    console.error('[Yggdrasil] ❌ 批量查询错误:', error);
    res.status(500).json([]);
  }
});

// ========== 材质上传 ==========

// 验证材质上传权限的中间件
async function verifyTextureAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(buildErrorResponse(
        'Unauthorized',
        '缺少认证信息'
      ));
    }

    const accessToken = authHeader.substring(7);
    const tokenRecord = await findTokenByAccessToken(accessToken);

    if (!tokenRecord) {
      return res.status(401).json(buildErrorResponse(
        'Unauthorized',
        '无效的访问令牌'
      ));
    }

    // 将token信息附加到请求对象
    req.tokenRecord = tokenRecord;
    next();

  } catch (error) {
    console.error('[Yggdrasil] ❌ 材质认证错误:', error);
    return res.status(401).json(buildErrorResponse(
      'Unauthorized',
      '认证失败'
    ));
  }
}

// 验证PNG图片尺寸和格式
async function validateTexture(buffer, textureType) {
  try {
    const metadata = await sharp(buffer).metadata();
    
    // 验证是PNG格式
    if (metadata.format !== 'png') {
      return { valid: false, error: '图片必须是PNG格式' };
    }

    const { width, height } = metadata;

    if (textureType === 'skin') {
      // 皮肤尺寸验证：64x32 或 64x64 的整数倍
      const validSkinSizes = [
        [64, 32], [64, 64], [128, 64], [128, 128], [256, 128], [256, 256]
      ];
      
      const isValidSize = validSkinSizes.some(([w, h]) => width === w && height === h) ||
        (width % 64 === 0 && (height % 32 === 0 || height % 64 === 0));

      if (!isValidSize) {
        return { valid: false, error: '皮肤尺寸必须是64x32或64x64的整数倍' };
      }
    } else if (textureType === 'cape') {
      // 披风尺寸验证：64x32 或 22x17 的整数倍
      const validCapeSizes = [
        [64, 32], [128, 64], [256, 128], [22, 17], [44, 34], [88, 68]
      ];
      
      const isValidSize = validCapeSizes.some(([w, h]) => width === w && height === h) ||
        (width % 64 === 0 && height % 32 === 0) ||
        (width % 22 === 0 && height % 17 === 0);

      if (!isValidSize) {
        return { valid: false, error: '披风尺寸必须是64x32或22x17的整数倍' };
      }
    }

    return { valid: true, width, height };

  } catch (error) {
    return { valid: false, error: '无法读取图片信息' };
  }
}

// 上传材质
router.put('/api/user/profile/:uuid/:textureType', verifyTextureAuth, upload.single('file'), async (req, res) => {
  console.log(`[Yggdrasil] 📤 上传材质...`);
  try {
    const { uuid, textureType } = req.params;
    const { model } = req.body; // 皮肤模型类型：slim 或空字符串

    // 验证材质类型
    if (!['skin', 'cape'].includes(textureType)) {
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        '无效的材质类型'
      ));
    }

    // 验证UUID格式
    const normalizedUuid = uuid.replace(/-/g, '');
    if (normalizedUuid.length !== 32) {
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        '无效的UUID格式'
      ));
    }

    // 获取角色信息
    const profile = await getProfileByUuid(uuid);

    if (!profile) {
      return res.status(404).json(buildErrorResponse(
        'NotFoundException',
        '角色不存在'
      ));
    }

    // 验证token绑定的角色是否与请求的角色一致
    const tokenUuid = req.tokenRecord.uuid.replace(/-/g, '');
    if (tokenUuid !== normalizedUuid) {
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '无权操作该角色'
      ));
    }

    // 检查是否有上传的文件
    if (!req.file) {
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        '没有上传文件'
      ));
    }

    // 验证图片尺寸和格式
    const validation = await validateTexture(req.file.buffer, textureType);
    if (!validation.valid) {
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        validation.error
      ));
    }

    // 计算文件hash
    const fileHash = createFileHash(req.file.buffer);

    // 使用sharp处理图片（去除元数据）
    let processedBuffer;
    try {
      processedBuffer = await sharp(req.file.buffer)
        .png()
        .withMetadata({}) // 清空元数据
        .toBuffer();
    } catch (error) {
      console.error('[Yggdrasil] ❌ 图片处理失败:', error);
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        '图片处理失败'
      ));
    }

    // 上传到图床
    const uploadResult = await uploadFile(
      processedBuffer,
      `${textureType}_${fileHash.substring(0, 16)}.png`,
      'image/png'
    );

    if (!uploadResult.success) {
      return res.status(500).json(buildErrorResponse(
        'InternalServerError',
        '材质上传失败'
      ));
    }

    // 更新数据库中的材质URL
    const updateField = textureType === 'skin' ? 'skin_url' : 'cape_url';
    const modelField = textureType === 'skin' ? 'skin_model' : null;
    
    if (textureType === 'skin' && model) {
      await pool.execute(
        `UPDATE mc_profiles SET ${updateField} = ?, ${modelField} = ? WHERE id = ?`,
        [uploadResult.url, model === 'slim' ? 'slim' : 'classic', profile.id]
      );
    } else {
      await pool.execute(
        `UPDATE mc_profiles SET ${updateField} = ? WHERE id = ?`,
        [uploadResult.url, profile.id]
      );
    }

    // 记录到mc_textures表
    await pool.execute(
      `INSERT INTO mc_textures (profile_id, texture_type, texture_hash, url, metadata)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       texture_hash = VALUES(texture_hash),
       url = VALUES(url),
       metadata = VALUES(metadata),
       uploaded_at = CURRENT_TIMESTAMP`,
      [
        profile.id,
        textureType,
        fileHash,
        uploadResult.url,
        JSON.stringify({
          width: validation.width,
          height: validation.height,
          model: textureType === 'skin' ? (model || 'classic') : null
        })
      ]
    );

    await auditLog('TEXTURE_UPLOAD', profile.user_id, profile.id, req.ip, {
      textureType,
      url: uploadResult.url,
      size: req.file.size
    });

    console.log(`[Yggdrasil] ✅ 材质上传成功: ${textureType} for ${profile.player_name}`);
    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] ❌ 材质上传错误:', error);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

// 删除材质
router.delete('/api/user/profile/:uuid/:textureType', verifyTextureAuth, async (req, res) => {
  console.log(`[Yggdrasil] 🗑️ 删除材质...`);
  try {
    const { uuid, textureType } = req.params;

    // 验证材质类型
    if (!['skin', 'cape'].includes(textureType)) {
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        '无效的材质类型'
      ));
    }

    // 验证UUID格式
    const normalizedUuid = uuid.replace(/-/g, '');
    if (normalizedUuid.length !== 32) {
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        '无效的UUID格式'
      ));
    }

    // 获取角色信息
    const profile = await getProfileByUuid(uuid);

    if (!profile) {
      return res.status(404).json(buildErrorResponse(
        'NotFoundException',
        '角色不存在'
      ));
    }

    // 验证token绑定的角色是否与请求的角色一致
    const tokenUuid = req.tokenRecord.uuid.replace(/-/g, '');
    if (tokenUuid !== normalizedUuid) {
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '无权操作该角色'
      ));
    }

    // 更新数据库，清除材质URL
    const updateField = textureType === 'skin' ? 'skin_url' : 'cape_url';
    await pool.execute(
      `UPDATE mc_profiles SET ${updateField} = NULL WHERE id = ?`,
      [profile.id]
    );

    await auditLog('TEXTURE_DELETE', profile.user_id, profile.id, req.ip, {
      textureType
    });

    console.log(`[Yggdrasil] ✅ 材质删除成功: ${textureType} for ${profile.player_name}`);
    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] ❌ 材质删除错误:', error);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

// 材质上传错误处理
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json(buildErrorResponse(
        'IllegalArgumentException',
        '文件大小超过限制（最大2MB）'
      ));
    }
  }
  
  if (error.message === '只允许上传PNG格式的图片') {
    return res.status(400).json(buildErrorResponse(
      'IllegalArgumentException',
      '只允许上传PNG格式的图片'
    ));
  }

  next(error);
});

router.get('/sessionserver/session/minecraft/profile/:uuid/digital', (req, res) => {
  console.log(`[Yggdrasil] 🔄 重定向到: /api/yggdrasil/sessionserver/session/minecraft/profile/${req.params.uuid}`);
  res.redirect(`/api/yggdrasil/sessionserver/session/minecraft/profile/${req.params.uuid}`);
});

console.log('========================================');
console.log('[Yggdrasil] ✅ Yggdrasil API 路由加载完成');
console.log('[Yggdrasil] 📍 可用端点:');
console.log('  元数据:');
console.log('    - GET  /                          (API元数据)');
console.log('  Auth Server (认证服务):');
console.log('    - POST /authserver/authenticate  (认证)');
console.log('    - POST /authserver/refresh        (刷新Token)');
console.log('    - POST /authserver/validate       (验证Token)');
console.log('    - POST /authserver/signout         (登出)');
console.log('    - POST /authserver/invalidate     (使Token失效)');
console.log('  Session Server (会话服务):');
console.log('    - POST /sessionserver/session/minecraft/join      (客户端加入)');
console.log('    - GET  /sessionserver/session/minecraft/hasJoined (服务端验证)');
console.log('    - GET  /sessionserver/session/minecraft/profile/:uuid');
console.log('  角色查询:');
console.log('    - POST /api/profiles/minecraft    (批量查询角色)');
console.log('  材质管理:');
console.log('    - PUT    /api/user/profile/:uuid/:textureType (上传材质)');
console.log('    - DELETE /api/user/profile/:uuid/:textureType (删除材质)');
console.log('========================================');

module.exports = router;
