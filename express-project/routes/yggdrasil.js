/**
 * 悦社社区 - Yggdrasil 标准认证 API 路由
 * 完全遵循 Mojang 官方 Yggdrasil API 规范
 * 供 authlib-injector 和 Minecraft 客户端调用
 * 
 * @author zhaishis
 * @version v1.0.0
 * @see https://wiki.vg/Authentication
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../config/config');
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
  buildErrorResponse
} = require('../utils/yggdrasilHelper');

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

router.post('/authserver/authenticate', async (req, res) => {
  console.log('[Yggdrasil] 🔐 开始认证流程...');
  try {
    const { username, password, clientToken } = req.body;

    console.log(`[Yggdrasil] 👤 尝试登录用户: ${username}`);

    if (!username || !password) {
      console.log(`[Yggdrasil] ❌ 缺少用户名或密码`);
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '缺少用户名或密码'
      ));
    }

    const profile = await getProfileByName(username);

    if (!profile) {
      console.log(`[Yggdrasil] ❌ 用户 ${username} 不存在`);
      await auditLog('LOGIN_FAILED', profile?.user_id, profile?.id, req.ip, { reason: 'user_not_found', username });
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '无效的凭据'
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
        '无效的凭据'
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
    const { accessToken, clientToken, requestUser } = req.body;

    if (!accessToken) {
      console.log(`[Yggdrasil] ❌ 缺少accessToken`);
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '缺少 accessToken'
      ));
    }

    const tokenRecord = await findTokenByAccessToken(accessToken);

    if (!tokenRecord) {
      console.log(`[Yggdrasil] ❌ Token无效或已过期`);
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Token 无效或已过期'
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

router.get('/sessionserver/session/minecraft/profile/:uuid', async (req, res) => {
  console.log(`[Yggdrasil] 🎮 请求角色信息 UUID: ${req.params.uuid}`);
  try {
    const uuid = req.params.uuid;
    const unsignedParam = req.query.unsigned === 'true';

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

router.get('/sessionserver/session/minecraft/profile/:uuid/digital', (req, res) => {
  console.log(`[Yggdrasil] 🔄 重定向到: /api/yggdrasil/sessionserver/session/minecraft/profile/${req.params.uuid}`);
  res.redirect(`/api/yggdrasil/sessionserver/session/minecraft/profile/${req.params.uuid}`);
});

console.log('========================================');
console.log('[Yggdrasil] ✅ Yggdrasil API 路由加载完成');
console.log('[Yggdrasil] 📍 可用端点:');
console.log('  Auth Server (认证服务):');
console.log('    - POST /authserver/authenticate  (认证)');
console.log('    - POST /authserver/refresh        (刷新Token)');
console.log('    - POST /authserver/validate       (验证Token)');
console.log('    - POST /authserver/signout         (登出)');
console.log('    - POST /authserver/invalidate     (使Token失效)');
console.log('  Session Server (会话服务):');
console.log('    - GET  /sessionserver/session/minecraft/profile/:uuid');
console.log('========================================');

module.exports = router;
