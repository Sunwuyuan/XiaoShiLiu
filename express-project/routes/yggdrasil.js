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
const {
  getProfileByName,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
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

router.post('/authenticate', async (req, res) => {
  try {
    const { username, password, clientToken } = req.body;

    if (!username || !password) {
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '缺少用户名或密码'
      ));
    }

    const profile = await getProfileByName(username);

    if (!profile) {
      await auditLog('LOGIN_FAILED', profile?.user_id, profile?.id, req.ip, { reason: 'user_not_found', username });
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '无效的凭据'
      ));
    }

    if (profile.is_banned) {
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '该角色已被封禁'
      ));
    }

    const valid = await verifyPassword(password, profile.password_hash);
    
    if (!valid) {
      await auditLog('LOGIN_FAILED', profile.user_id, profile.id, req.ip, { reason: 'wrong_password' });
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '无效的凭据'
      ));
    }

    const finalClientToken = clientToken || generateClientToken();
    const accessToken = generateAccessToken(profile);
    const refreshToken = generateRefreshToken();

    await invalidateAllTokens(profile.id);

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

    console.log(`[Yggdrasil] 用户 ${username} 认证成功 IP: ${req.ip}`);
    res.json(response);

  } catch (error) {
    console.error('[Yggdrasil] authenticate 错误:', error);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { accessToken, clientToken, requestUser } = req.body;

    if (!accessToken) {
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        '缺少 accessToken'
      ));
    }

    const tokenRecord = await findTokenByAccessToken(accessToken);

    if (!tokenRecord) {
      return res.status(403).json(buildErrorResponse(
        'ForbiddenOperationException',
        'Token 无效或已过期'
      ));
    }

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

    console.log(`[Yggdrasil] Token 刷新成功 用户: ${tokenRecord.player_name}`);
    res.json(response);

  } catch (error) {
    console.error('[Yggdrasil] refresh 错误:', error);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { accessToken, clientToken } = req.body;

    if (!accessToken) {
      return res.status(403).end();
    }

    const tokenRecord = await findTokenByAccessToken(accessToken);

    if (!tokenRecord) {
      return res.status(403).end();
    }

    if (clientToken && tokenRecord.client_token !== clientToken) {
      return res.status(403).end();
    }

    console.log(`[Yggdrasil] Token 验证成功 用户: ${tokenRecord.player_name}`);
    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] validate 错误:', error);
    res.status(403).end();
  }
});

router.post('/signout', async (req, res) => {
  try {
    const { username, password } = req.body;

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

    console.log(`[Yggdrasil] 用户 ${username} 登出成功，已删除 ${deletedCount} 个Token`);
    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] signout 错误:', error);
    res.status(500).json(buildErrorResponse(
      'InternalServerError',
      '服务器内部错误'
    ));
  }
});

router.post('/invalidate', async (req, res) => {
  try {
    const { accessToken, clientToken } = req.body;

    if (!accessToken) {
      return res.status(204).end();
    }

    const success = await invalidateToken(accessToken);

    if (success) {
      console.log('[Yggdrasil] Token 失效成功');
    }

    res.status(204).end();

  } catch (error) {
    console.error('[Yggdrasil] invalidate 错误:', error);
    res.status(204).end();
  }
});

router.get('/sessionserver/session/minecraft/profile/:uuid', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const unsignedParam = req.query.unsigned === 'true';

    const profile = await getProfileByUuid(uuid);

    if (!profile || profile.is_banned) {
      res.status(204).end();
      return;
    }

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

    console.log(`[Yggdrasil] 获取角色信息: ${profile.player_name} (${uuid})`);
    res.json(response);

  } catch (error) {
    console.error('[Yggdrasil] sessionserver/profile 错误:', error);
    res.status(204).end();
  }
});

router.get('/sessionserver/session/minecraft/profile/:uuid/digital', (req, res) => {
  res.redirect(`/api/yggdrasil/sessionserver/session/minecraft/profile/${req.params.uuid}`);
});

module.exports = router;
