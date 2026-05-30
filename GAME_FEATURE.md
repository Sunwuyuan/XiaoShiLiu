# 🎮 Minecraft 外置登录功能设计文档

> **项目名称**: 悦社社区 - MC游戏功能模块  
> **版本**: v1.0.0  
> **创建日期**: 2026-05-30  
> **状态**: 设计阶段  

---

## 📋 目录

1. [功能概述](#-功能概述)
2. [技术架构](#-技术架构)
3. [数据库设计](#-数据库设计)
4. [后端API设计](#-后端api设计)
5. [前端UI设计](#-前端ui设计)
6. [安全机制](#-安全机制)
7. [文件结构](#-文件结构)
8. [实施计划](#-实施计划)

---

## 🎯 功能概述

### 核心目标

为悦社社区集成 **Minecraft 外置登录系统**，允许社区用户创建MC游戏角色，通过 **Yggdrasil API** 实现与正版登录相同的体验。

### 主要功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| **角色管理** | 创建/编辑MC游戏角色，绑定独立密码 | P0 |
| **外置登录** | 完整实现Yggdrasil API，支持authlib-injector | P0 |
| **皮肤系统** | 上传/更换皮肤，支持Steve/Alex模型 | P1 |
| **披风系统** | 上传/更换披风（可选） | P2 |
| **操作审计** | 记录所有关键操作日志 | P1 |

### 用户价值

```
┌─────────────────────────────────────────────┐
│              用户使用流程                     │
│                                             │
│  1️⃣ 社区用户登录 (Logto)                    │
│           ↓                                 │
│  2️⃣ 进入 [游戏] 页面                        │
│           ↓                                 │
│  3️⃣ 创建MC角色 (设置玩家名+独立密码)         │
│           ↓                                 │
│  4️⃣ 上传皮肤 (可选)                         │
│           ↓                                 │
│  5️⃣ 复制 Yggdrasil API 地址                 │
│           ↓                                 │
│  6️⃣ 配置启动器 (HMCL/PCL2等)               │
│           ↓                                 │
│  7️⃣ 使用角色名+独立密码登录 → 进入服务器 ✅   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🏗️ 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     完整技术栈                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  前端层 (Vue3)                       │   │
│  │                                                     │   │
│  │  Vue3 + Vue Router + Pinia                          │   │
│  │  ├── views/game/index.vue          (游戏主页)        │   │
│  │  ├── components/Sidebar.vue       (+🎮入口)          │   │
│  │  ├── components/LayoutFooter.vue  (+🎮入口)          │   │
│  │  └── assets/icons/game.svg        (游戏图标)         │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │ HTTP/API                           │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │                后端层 (Express.js)                    │   │
│  │                                                     │   │
│  │  Express + MySQL + JWT + bcrypt                      │   │
│  │                                                     │   │
│  │  ┌──────────────────┐  ┌────────────────────────┐   │   │
│  │  │ routes/yggdrasil │  │     routes/game        │   │   │
│  │  │ (标准认证API)    │  │   (游戏管理API)         │   │   │
│  │  └────────┬─────────┘  └───────────┬────────────┘   │   │
│  │           │                        │                │   │
│  │  ┌────────▼────────────────────────▼────────────┐   │   │
│  │  │           utils/uploadHelper.js               │   │   │
│  │  │     (复用现有上传策略: local/imagehost/r2)    │   │   │
│  │  └───────────────────────────────────────────────┘   │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                   │
│  ┌─────────────────────▼───────────────────────────────┐   │
│  │                   数据层 (MySQL)                      │   │
│  │                                                     │   │
│  │  mc_profiles      - 角色信息表                       │   │
│  │  yggdrasil_tokens - Token会话表                      │   │
│  │  mc_textures      - 纹理记录表                       │   │
│  │  mc_audit_logs    - 操作审计表                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 客户端 (Minecraft)                    │   │
│  │                                                     │   │
│  │  authlib-injector + 启动器 (HMCL/PCL2)             │   │
│  │  ↓ 调用 /api/yggdrasil/*                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Vue3 + Composition API | 与现有项目一致 |
| **路由** | Vue Router 4 | 添加 `/game` 路由 |
| **状态管理** | Pinia Stores | 复用 auth/user store |
| **后端框架** | Express.js | 复用现有项目 |
| **数据库** | MySQL 8.0 | 复用现有连接池 |
| **认证** | Logto (社区) + bcrypt (角色) | 双密码体系 |
| **存储** | local / imagehost / r2 | 根据 .env 动态选择 |
| **密码加密** | bcrypt (cost=12) | 角色独立密码 |
| **Token生成** | crypto.randomUUID() | UUID v4 格式 |

### 存储策略复用

```javascript
// 完全复用现有的 uploadHelper.js
// 根据 IMAGE_UPLOAD_STRATEGY 环境变量自动切换

const { uploadImage } = require('../utils/uploadHelper');

// 上传皮肤 - 自动选择存储后端
await uploadImage(buffer, filename, 'image/png');
// ↓ 自动调用:
// strategy=local     → saveImageToLocal()
// strategy=imagehost → uploadToImageHost()
// strategy=r2        → uploadImageToR2()
```

---

## 🗄️ 数据库设计

### ER 关系图

```
┌──────────────┐       ┌───────────────────┐       ┌──────────────┐
│    users     │ 1    N│    mc_profiles    │ 1    N│yggdrasil_    │
│  (已有表)    │──────▶│    (新表)         │──────▶│tokens (新表) │
│              │       │                   │       │              │
│ - id         │       │ - id (PK)         │       │ - id (PK)    │
│ - logto_id   │       │ - user_id (FK)    │       │ - profile_id │
│ - email      │       │ - player_name     │       │ - access_    │
│ - ...        │       │ - uuid            │       │   token      │
│              │       │ - password_hash   │       │ - refresh_   │
│              │       │ - skin_url        │       │   token      │
│              │       │ - cape_url        │       │ - expires_at │
│              │       │ - ...             │       │ - ...        │
└──────────────┘       └────────┬──────────┘       └──────────────┘
                                │ 1
                                │
                                │ N
                       ┌────────▼──────────┐
                       │  mc_textures (新表)│
                       │                   │
                       │ - id (PK)         │
                       │ - profile_id (FK) │
                       │ - texture_type    │
                       │ - texture_hash    │
                       │ - url             │
                       │ - metadata        │
                       └───────────────────┘

┌──────────────────────────┐
│   mc_audit_logs (新表)   │
│                          │
│ - id (PK)                │
│ - profile_id (FK)        │
│ - action                 │
│ - ip_address             │
│ - details (JSON)         │
│ - created_at             │
└──────────────────────────┘
```

### 表结构详细定义

#### 1. mc_profiles (MC角色表)

```sql
CREATE TABLE `mc_profiles` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` INT NOT NULL COMMENT '绑定的社区用户ID',
  `player_name` VARCHAR(16) NOT NULL COMMENT '玩家名称(可修改)',
  `uuid` CHAR(36) NOT NULL COMMENT 'UUID v4格式，固定不变',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt加密的独立密码',
  `skin_url` VARCHAR(500) DEFAULT NULL COMMENT '皮肤URL',
  `cape_url` VARCHAR(500) DEFAULT NULL COMMENT '披风URL',
  `skin_model` ENUM('classic', 'slim') DEFAULT 'classic' COMMENT '皮肤模型类型',
  `is_banned` TINYINT(1) DEFAULT 0 COMMENT '是否被封禁',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_uuid` (`uuid`),
  UNIQUE KEY `uk_player_name` (`player_name`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `fk_mc_profiles_user_id` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='MC游戏角色表';
```

**字段说明：**

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `user_id` | INT | FK, NOT NULL | 强关联社区用户，删除用户时级联删除角色 |
| `player_name` | VARCHAR(16) | UNIQUE | 可修改，全局唯一，符合MC命名规则 |
| `uuid` | CHAR(36) | UNIQUE | UUID v4格式，创建后永不改变 |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt哈希，与社区密码完全隔离 |
| `skin_model` | ENUM | 默认 classic | classic=经典手臂, slim=细手臂(Alex模型) |
| `is_banned` | BOOLEAN | 默认 false | 封禁标记，封禁后无法通过Yggdrasil验证 |

#### 2. yggdrasil_tokens (Token会话表)

```sql
CREATE TABLE `yggdrasil_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `profile_id` INT NOT NULL COMMENT '关联的MC角色ID',
  `access_token` VARCHAR(255) NOT NULL COMMENT 'JWT访问令牌',
  `refresh_token` VARCHAR(255) NOT NULL COMMENT '刷新令牌',
  `client_token` VARCHAR(255) DEFAULT NULL COMMENT '客户端标识符',
  `expires_at` TIMESTAMP NOT NULL COMMENT '令牌过期时间',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT '登录IP地址',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '客户端User-Agent',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_access_token` (`access_token`),
  UNIQUE KEY `uk_refresh_token` (`refresh_token`),
  KEY `idx_profile_id` (`profile_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_yggdrasil_tokens_profile_id` 
    FOREIGN KEY (`profile_id`) REFERENCES `mc_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='Yggdrasil Token会话表';
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `access_token` | VARCHAR(255) | 用于Minecraft客户端认证的JWT |
| `refresh_token` | VARCHAR(255) | 用于刷新access_token |
| `client_token` | VARCHAR(255) | 客户端生成的随机标识 |
| `expires_at` | TIMESTAMP | Token过期时间，通常7天后过期 |
| `ip_address` | VARCHAR(45) | 支持IPv6，用于安全审计 |

#### 3. mc_textures (纹理记录表)

```sql
CREATE TABLE `mc_textures` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `profile_id` INT NOT NULL COMMENT '关联的MC角色ID',
  `texture_type` ENUM('skin', 'cape') NOT NULL COMMENT '纹理类型',
  `texture_hash` VARCHAR(64) NOT NULL COMMENT 'SHA256哈希值',
  `file_path` VARCHAR(500) DEFAULT NULL COMMENT '本地存储路径(local模式)',
  `url` VARCHAR(500) DEFAULT NULL COMMENT '外部访问URL(imagehost/r2模式)',
  `metadata` JSON DEFAULT NULL COMMENT '额外元数据(尺寸、模型等)',
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_texture_hash` (`texture_hash`),
  KEY `idx_profile_type` (`profile_id`, `texture_type`),
  CONSTRAINT `fk_mc_textures_profile_id` 
    FOREIGN KEY (`profile_id`) REFERENCES `mc_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='MC皮肤/披风纹理记录表';
```

**用途：**
- 记录每次皮肤上传的详细信息
- 通过SHA256去重（相同皮肤不重复存储）
- 保存历史记录，支持回滚到旧版本

#### 4. mc_audit_logs (操作审计表)

```sql
CREATE TABLE `mc_audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `profile_id` INT DEFAULT NULL COMMENT '关联的MC角色ID(可为空)',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT '操作者IP地址',
  `details` JSON DEFAULT NULL COMMENT '操作详情(JSON格式)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_profile_id` (`profile_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='MC游戏操作审计日志表';
```

**action 枚举值：**

| action | 描述 | details示例 |
|--------|------|-------------|
| `PROFILE_CREATE` | 创建角色 | `{player_name: "Steve"}` |
| `NAME_CHANGE` | 修改名称 | `{old: "Steve", new: "Alex"}` |
| `PASSWORD_CHANGE` | 修改密码 | `{}` (不记录明文) |
| `SKIN_UPLOAD` | 上传皮肤 | `{url: "...", model: "slim"}` |
| `SKIN_DELETE` | 删除皮肤 | `{}` |
| `CAPE_UPLOAD` | 上传披风 | `{url: "..."}` |
| `LOGIN_SUCCESS` | 登录成功 | `{client: "HMCL"}` |
| `LOGIN_FAILED` | 登录失败 | `{reason: "wrong_password"}` |

---

## 🔌 后端API设计

### API 总览

```
/api/
├── yggdrasil/                    # Yggdrasil 标准API (给authlib-injector调用)
│   ├── POST authenticate         # 验证账号密码，返回accessToken
│   ├── POST refresh              # 刷新Token
│   ├── POST validate             # 验证Token有效性
│   ├── POST signout              # 登出(使Token失效)
│   ├── POST invalidate           # 使指定Token失效
│   └── sessionserver/            # Session Server API
│       └── GET session/minecraft/profile/:uuid  # 获取角色信息+纹理
│
└── game/                         # 游戏管理API (给前端页面调用)
    ├── GET profile               # 获取当前用户的角色列表
    ├── POST profile/create       # 创建新角色
    ├── PUT profile/:id/name      # 修改角色名称
    ├── PUT profile/:id/password  # 修改角色密码
    ├── POST profile/:id/skin     # 上传皮肤
    ├── DELETE profile/:id/skin   # 删除皮肤(恢复默认)
    ├── POST profile/:id/cape     # 上传披风
    ├── DELETE profile/:id/cape   # 删除披风
    └── GET config                # 获取Yggdrasil API配置地址
```

---

### 一、Yggdrasil 标准API (routes/yggdrasil.js)

这些接口遵循 Mojang 官方的 [Yggdrasil API 规范](https://wiki.vg/Authentication)，供 authlib-injector 和 Minecraft 客户端调用。

#### 1. POST /api/yggdrasil/authenticate

**用途：** 验证玩家身份，返回 accessToken

**请求体：**
```json
{
  "agent": {
    "name": "Minecraft",
    "version": 1
  },
  "username": "Steve",           // 玩家名称
  "password": "角色独立密码",     // 不是社区密码！
  "clientToken": "客户端标识"
}
```

**成功响应 (200)：**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "clientToken": "客户端标识",
  "availableProfiles": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Steve",
      "legacy": false
    }
  ],
  "selectedProfile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Steve"
  },
  "user": {
    "id": "社区用户ID的hash值",
    "properties": []
  }
}
```

**错误响应：**
```json
// 403 - 密码错误
{ "error": "ForbiddenOperationException", "errorMessage": "Invalid credentials" }

// 403 - 角色被封禁
{ "error": "ForbiddenOperationException", "errorMessage": "Profile has been banned" }
```

**业务逻辑：**
```javascript
async function authenticate(req, res) {
  const { username, password, clientToken } = req.body;
  
  // 1. 查找角色
  const profile = await db.query(
    'SELECT * FROM mc_profiles WHERE player_name = ? AND is_banned = 0',
    [username]
  );
  
  if (!profile) throw new Error('Invalid credentials');
  
  // 2. 验证独立密码 (bcrypt)
  const valid = await bcrypt.compare(password, profile.password_hash);
  if (!valid) throw new Error('Invalid credentials');
  
  // 3. 生成Token对
  const accessToken = generateAccessToken(profile);
  const refreshToken = generateRefreshToken();
  
  // 4. 保存到数据库
  await saveTokens(profile.id, accessToken, refreshToken, clientToken);
  
  // 5. 记录审计日志
  await auditLog('LOGIN_SUCCESS', profile.id, req.ip);
  
  // 6. 返回响应
  return buildAuthResponse(profile, accessToken, clientToken);
}
```

---

#### 2. POST /api/yggdrasil/refresh

**用途：** 刷新过期的 accessToken

**请求体：**
```json
{
  "accessToken": "旧的accessToken",
  "clientToken": "客户端标识",
  "requestUser": true  // 可选，是否返回用户信息
}
```

**成功响应 (200)：**
```json
{
  "accessToken": "新的accessToken",
  "clientToken": "客户端标识",
  "selectedProfile": { ... },
  "user": { ... }  // 仅当 requestUser=true 时返回
}
```

**业务逻辑：**
```javascript
async function refresh(req, res) {
  const { accessToken, clientToken } = req.body;
  
  // 1. 查找refreshToken对应的记录
  const tokenRecord = await findTokenByAccess(accessToken);
  if (!tokenRecord || tokenRecord.expires_at < new Date()) {
    throw new Error('Token expired');
  }
  
  // 2. 生成新的Token对
  const newAccessToken = generateAccessToken(tokenRecord.profile);
  const newRefreshToken = generateRefreshToken();
  
  // 3. 更新数据库
  await updateTokens(tokenRecord.id, newAccessToken, newRefreshToken);
  
  return buildRefreshResponse(newAccessToken, clientToken);
}
```

---

#### 3. POST /api/yggdrasil/validate

**用途：** 验证 Token 是否有效

**请求体：**
```json
{
  "accessToken": "要验证的token",
  "clientToken": "客户端标识"  // 可选
}
```

**响应：**
```
204 No Content  (Token有效)
403 Forbidden  (Token无效或过期)
```

---

#### 4. POST /api/yggdrasil/signout

**用途：** 使某用户的所有 Token 失效（登出）

**请求体：**
```json
{
  "username": "Steve",
  "password": "角色密码"
}
```

**响应：** `204 No Content`

---

#### 5. POST /api/yggdrasil/invalidate

**用途：** 使指定的 Token 失效

**请求体：**
```json
{
  "accessToken": "要失效的token",
  "clientToken": "客户端标识"
}
```

**响应：** `204 No Content`

---

#### 6. GET /api/yggdrasil/sessionserver/session/minecraft/profile/:uuid

**用途：** Minecraft 服务端/客户端获取角色信息和纹理数据

**路径参数：**
- `uuid`: 角色的UUID（不带横杠）

**成功响应 (200)：**
```json
{
  "id": "550e8400e29b41d4a716446655440000",
  "name": "Steve",
  "properties": [
    {
      "name": "textures",
      "value": "Base64编码的JSON字符串"
    }
  ]
}
```

**properties[0].value 解码后的内容：**
```json
{
  "timestamp": 1700000000000,
  "profileId": "550e8400e29b41d4a716446655440000",
  "profileName": "Steve",
  "textures": {
    "SKIN": {
      "url": "https://cdn.example.com/skin.png",
      "metadata": {
        "model": "classic"  // 或 "slim"
      }
    },
    "CAPE": {
      "url": "https://cdn.example.com/cape.png"
    }
  }
}
```

**业务逻辑：**
```javascript
async function getProfile(req, res) {
  const uuid = req.params.uuid;
  
  // 1. 查找角色
  const profile = await getProfileByUuid(uuid);
  if (!profile || profile.is_banned) {
    return res.status(204).send();  // 返回空响应
  }
  
  // 2. 构建纹理对象
  const textures = {};
  
  if (profile.skin_url) {
    textures.SKIN = {
      url: profile.skin_url,
      metadata: { model: profile.skin_model || 'classic' }
    };
  }
  
  if (profile.cape_url) {
    textures.CAPE = { url: profile.cape_url };
  }
  
  // 3. 编码为Base64
  const texturePayload = {
    timestamp: Date.now(),
    profileId: profile.uuid.replace(/-/g, ''),
    profileName: profile.player_name,
    textures
  };
  
  const base64Value = Buffer.from(JSON.stringify(texturePayload)).toString('base64');
  
  // 4. 返回响应
  return {
    id: uuid.replace(/-/g, ''),
    name: profile.player_name,
    properties: [{ name: 'textures', value: base64Value }]
  };
}
```

---

### 二、游戏管理API (routes/game.js)

这些接口供前端页面调用，需要社区用户认证（JWT Token）。

#### 1. GET /api/game/profile

**用途：** 获取当前登录用户的MC角色列表

**认证：** 需要 Bearer Token (社区JWT)

**请求头：**
```
Authorization: Bearer <community_jwt_token>
```

**成功响应 (200)：**
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "player_name": "Steve",
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "skin_url": "https://cdn.example.com/skin.png",
      "skin_model": "classic",
      "cape_url": null,
      "is_banned": false,
      "created_at": "2026-05-30T10:00:00Z",
      "last_login": "2026-05-30T12:00:00Z"
    }
  ],
  "message": "获取成功"
}
```

---

#### 2. POST /api/game/profile/create

**用途：** 创建新的MC角色

**请求体：**
```json
{
  "player_name": "Alex",
  "password": "MySecurePassword123!"
}
```

**验证规则：**
- `player_name`: 3-16字符，只允许字母数字下划线，不能以数字开头
- `password`: 最少8位，包含大小写字母和数字

**成功响应 (201)：**
```json
{
  "code": 0,
  "data": {
    "id": 2,
    "player_name": "Alex",
    "uuid": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "message": "角色创建成功！请牢记您的独立密码。"
  }
}
```

**错误响应：**
```json
// 400 - 名称已存在
{ "code": 400, "message": "该玩家名称已被使用" }

// 400 - 验证失败
{ "code": 400, "message": "玩家名称不符合规范" }
```

**业务逻辑：**
```javascript
async function createProfile(req, res) {
  const userId = req.user.id;  // 从JWT获取社区用户ID
  const { player_name, password } = req.body;
  
  // 1. 验证名称格式
  if (!isValidPlayerName(player_name)) {
    throw new ValidationError('玩家名称不符合规范');
  }
  
  // 2. 检查唯一性
  const exists = await recordExists('mc_profiles', 'player_name', player_name);
  if (exists) {
    throw new ValidationError('该玩家名称已被使用');
  }
  
  // 3. 生成UUID v4
  const uuid = crypto.randomUUID();
  
  // 4. 加密密码 (bcrypt, cost=12)
  const passwordHash = await bcrypt.hash(password, 12);
  
  // 5. 创建角色记录
  const profileId = await createRecord('mc_profiles', {
    user_id: userId,
    player_name,
    uuid,
    password_hash: passwordHash
  });
  
  // 6. 记录审计日志
  await auditLog('PROFILE_CREATE', profileId, req.ip, { player_name });
  
  // 7. 返回响应
  return { id: profileId, player_name, uuid };
}
```

---

#### 3. PUT /api/game/profile/:id/name

**用途：** 修改角色名称

**请求体：**
```json
{
  "new_name": "NewSteve"
}
```

**成功响应 (200)：**
```json
{
  "code": 0,
  "data": { "old_name": "Steve", "new_name": "NewSteve" },
  "message": "名称修改成功"
}
```

---

#### 4. PUT /api/game/profile/:id/password

**用途：** 修改角色独立密码

**请求体：**
```json
{
  "old_password": "旧密码",
  "new_password": "新密码"
}
```

**成功响应 (200)：**
```json
{
  "code": 0,
  "message": "密码修改成功"
}
```

---

#### 5. POST /api/game/profile/:id/skin

**用途：** 上传角色皮肤

**Content-Type:** `multipart/form-data`

**请求字段：**
- `skin`: PNG图片文件 (最大500KB)
- `model` (可选): `classic` 或 `slim`，默认 `classic`

**验证规则：**
- 文件格式：必须为 PNG
- 文件大小：≤ 500KB
- 推荐尺寸：64×64 或 64×32 像素

**成功响应 (200)：**
```json
{
  "code": 0,
  "data": {
    "skin_url": "https://cdn.example.com/skin_uuid.png",
    "model": "classic"
  },
  "message": "皮肤上传成功"
}
```

**业务逻辑：**
```javascript
async function uploadSkin(req, res) {
  const profileId = req.params.id;
  const file = req.file;
  const model = req.body.model || 'classic';
  
  // 1. 验证文件格式
  if (file.mimetype !== 'image/png') {
    throw new ValidationError('只支持PNG格式的皮肤文件');
  }
  
  // 2. 验证文件大小 (500KB)
  if (file.size > 500 * 1024) {
    throw new ValidationError('皮肤文件大小不能超过500KB');
  }
  
  // 3. 获取角色信息
  const profile = await getProfileById(profileId);
  
  // 4. 调用统一上传函数 (自动根据env策略)
  const result = await uploadImage(
    file.buffer,
    `${profile.uuid}_skin.png`,
    'image/png'
  );
  
  if (!result.success) {
    throw new Error(result.message);
  }
  
  // 5. 更新数据库
  await updateRecord('mc_profiles', profileId, {
    skin_url: result.url,
    skin_model: model
  });
  
  // 6. 记录纹理历史 (可选)
  await createRecord('mc_textures', {
    profile_id: profileId,
    texture_type: 'skin',
    texture_hash: createHash(file.buffer),
    url: result.url,
    metadata: { size: file.size, model }
  });
  
  // 7. 记录审计日志
  await auditLog('SKIN_UPLOAD', profileId, req.ip, { url: result.url, model });
  
  return { skin_url: result.url, model };
}
```

---

#### 6. DELETE /api/game/profile/:id/skin

**用途：** 删除皮肤，恢复默认

**成功响应 (200)：**
```json
{
  "code": 0,
  "message": "皮肤已删除，将使用默认皮肤"
}
```

---

#### 7. POST /api/game/profile/:id/cape

**用途：** 上传披风

**请求字段：**
- `cape`: PNG图片文件 (最大300KB)

**成功响应 (200)：**
```json
{
  "code": 0,
  "data": { "cape_url": "https://cdn.example.com/cape_uuid.png" },
  "message": "披风上传成功"
}
```

---

#### 8. DELETE /api/game/profile/:id/cape

**用途：** 删除披风

**成功响应 (200)：**
```json
{
  "code": 0,
  "message": "披风已删除"
}
```

---

#### 9. GET /api/game/config

**用途：** 获取Yggdrasil API配置信息（给前端展示）

**认证：** 可选（未登录也可访问）

**成功响应 (200)：**
```json
{
  "code": 0,
  "data": {
    "yggdrasil_api_root": "https://your-domain.com/api/yggdrasil",
    "server_name": "悦社社区",
    "max_profiles_per_user": 3,
    "skin_max_size": "500KB",
    "supported_skin_models": ["classic", "slim"]
  },
  "message": "获取成功"
}
```

---

## 🎨 前端UI设计

### UI 风格要求

**完全遵循悦社社区现有的设计语言：**

- **配色方案：** 使用 CSS 变量 `--primary-color`, `--bg-color-*`, `--text-color-*`
- **圆角风格：** 大圆角 (border-radius: 999px for buttons, 12px for cards)
- **字体：** 保持现有字体栈
- **动画：** 复用现有过渡效果 (transition: 0.2s ease)
- **响应式：** 移动端优先，断点 480px / 768px / 960px

### 页面布局

#### 1. 游戏主页 (/game)

```
桌面端布局 (>960px):
┌──────────────────────────────────────────────────────┐
│  Header (固定顶部)                                    │
├────────┬─────────────────────────────────┬───────────┤
│Sidebar │         Main Content            │           │
│        │  ┌─────────────────────────┐   │           │
│  🏠发现 │  │  🎮 Minecraft 外置登录   │   │  (空白)   │
│  🎮游戏 │  │                         │   │           │
│  ✏️发布 │  │  ┌───────────────────┐  │   │           │
│  🔔通知 │  │  │ 我的游戏角色      │  │   │           │
│  👤我   │  │  │                   │  │   │           │
│        │  │  │ [Steve] ● 在线    │  │   │           │
│  ⋯更多 │  │  │ 最后登录: 5分钟前  │  │   │           │
│        │  │  │ [编辑] [查看API]   │  │   │           │
│        │  │  │                   │  │   │           │
│        │  │  ├───────────────────┤  │   │           │
│        │  │  │ [+ 创建新角色]    │  │   │           │
│        │  │  └───────────────────┘  │   │           │
│        │  │                         │   │           │
│        │  │  ┌───────────────────┐  │   │           │
│        │  │  │ 📡 API配置信息    │  │   │           │
│        │  │  │ 地址: [...]       │  │   │           │
│        │  │  │ [复制] [使用指南] │  │   │           │
│        │  │  └───────────────────┘  │   │           │
│        │  └─────────────────────────┘   │           │
├────────┴─────────────────────────────────┴───────────┤
│  Footer (可选，移动端显示底栏)                       │
└──────────────────────────────────────────────────────┘

移动端布局 (<960px):
┌──────────────────────────┐
│  Header                  │
├──────────────────────────┤
│                          │
│  ┌────────────────────┐  │
│  │  🎮 游戏中心       │  │
│  │                    │  │
│  │  [Steve] 在线      │  │
│  │  [+ 创建角色]      │  │
│  │                    │  │
│  │  📡 API地址        │  │
│  │  [复制]            │  │
│  └────────────────────┘  │
│                          │
├──────────────────────────┤
│  🏠发现 │🎮游戏│✏️发布│🔔│👤│  ← 底部导航栏
└──────────────────────────┘
```

---

### 组件清单

#### 主组件

| 组件 | 路径 | 功能 |
|------|------|------|
| **GamePage** | `views/game/index.vue` | 游戏主页容器 |
| **ProfileCard** | `views/game/components/ProfileCard.vue` | 角色卡片组件 |
| **CreateProfileModal** | `views/game/components/CreateProfileModal.vue` | 创建角色弹窗 |
| **EditProfileModal** | `views/game/components/EditProfileModal.vue` | 编辑角色弹窗 |
| **ApiConfigCard** | `views/game/components/ApiConfigCard.vue` | API配置展示卡片 |
| **SkinUploader** | `views/game/components/SkinUploader.vue` | 皮肤上传组件 |

#### 子组件详情

##### ProfileCard.vue

```
┌─────────────────────────────────────┐
│  ┌──────┐                           │
│  │ 皮肤预览│  Steve                  │
│  │ (3D或2D)│  ● 在线                 │
│  └──────┘  最后登录: 5分钟前         │
│                                     │
│  ┌─────────┐ ┌─────────┐           │
│  │  编辑   │ │ 查看API │           │
│  └─────────┘ └─────────┘           │
└─────────────────────────────────────┘
```

**Props:**
```typescript
interface ProfileCardProps {
  profile: {
    id: number
    player_name: string
    uuid: string
    skin_url: string | null
    skin_model: 'classic' | 'slim'
    is_banned: boolean
    last_login?: string
  }
}
```

**Events:**
- `@edit` - 点击编辑按钮
- `@view-api` - 点击查看API配置

---

##### CreateProfileModal.vue

```
┌─────────────────────────────────────┐
│  创建Minecraft角色          [X]    │
├─────────────────────────────────────┤
│                                     │
│  玩家名称                           │
│  ┌─────────────────────────────┐   │
│  │ Alex_123                    │   │
│  └─────────────────────────────┘   │
│  ℹ️ 3-16位字符，字母数字下划线      │
│                                     │
│  角色密码                           │
│  ┌─────────────────────────────┐   │
│  │ •••••••••                    │   │
│  └─────────────────────────────┘   │
│  🔒 这是独立的游戏密码              │
│                                     │
│  ⚠️ 重要提示：                      │
│  • 创建后角色不可删除               │
│  • 角色名称可随时修改               │
│  • UUID永久固定不变                 │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │  取消    │  │ 创建角色 │       │
│  └──────────┘  └──────────┘       │
└─────────────────────────────────────┘
```

**验证规则：**
- 玩家名称：正则 `/^[a-zA-Z0-9_]{3,16}$/` 且不以数字开头
- 密码：最少8位，需包含大小写字母和数字

---

##### ApiConfigCard.vue

```
┌─────────────────────────────────────┐
│  📡 Yggdrasil API 配置              │
├─────────────────────────────────────┤
│                                     │
│  API Root 地址                      │
│  ┌─────────────────────────────┐   │
│  │ https://your.com/api/...   │   │
│  └─────────────────────────────┘   │
│                                     │
│  [📋 复制地址]  [📖 使用指南]       │
│                                     │
│  ▼ 使用指南 (可折叠)                │
│  ┌─────────────────────────────┐   │
│  │ 1. 下载 authlib-injector   │   │
│  │ 2. 配置启动器...           │   │
│  │ 3. 输入API地址...          │   │
│  │ 4. 使用角色名+密码登录      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

### 导航入口修改

#### 侧边栏 (Sidebar.vue)

**当前菜单项：**
```javascript
const menuItems = ref([
  { label: '发现', icon: 'home', path: '/explore' },
  { label: '发布', icon: 'publish', path: '/publish' },      // index: 1
  { label: '通知', icon: 'notification', path: '/notification' },
  { label: '我', icon: 'avatar', path: '/user' },
  { label: '更多', icon: 'menu', path: '' },
]);
```

**修改后（在"发现"和"发布"之间插入）：**
```javascript
const menuItems = ref([
  { label: '发现', icon: 'home', path: '/explore' },
  { label: '游戏', icon: 'game', path: '/game' },           // ✨ 新增
  { label: '发布', icon: 'publish', path: '/publish' },
  { label: '通知', icon: 'notification', path: '/notification' },
  { label: '我', icon: 'avatar', path: '/user' },
  { label: '更多', icon: 'menu', path: '' },
]);
```

---

#### 底部导航 (LayoutFooter.vue)

**当前底部导航：**
```javascript
const footerList = ref([
  { label: 'explore', icon: 'home', path: '/explore' },
  { label: 'publish', icon: 'publish', path: '/publish' },   // index: 1
  { label: 'notification', icon: 'notification', path: '/notification' },
  { label: 'user', icon: 'user', path: '/user' },
])
```

**修改后（在"发现"和"发布"之间插入）：**
```javascript
const footerList = ref([
  { label: 'explore', icon: 'home', path: '/explore' },
  { label: 'game', icon: 'game', path: '/game' },            // ✨ 新增
  { label: 'publish', icon: 'publish', path: '/publish' },
  { label: 'notification', icon: 'notification', path: '/notification' },
  { label: 'user', icon: 'user', path: '/user' },
])
```

---

### 图标资源

#### game.svg (游戏手柄图标)

**文件位置：** `vue3-project/src/assets/icons/game.svg`

**SVG代码：**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- 手柄主体 -->
  <path d="M6 11h4"/>
  <path d="M8 9v4"/>
  <rect x="2" y="6" width="20" height="12" rx="6"/>
  <circle cx="17" cy="10" r="1" fill="currentColor"/>
  <circle cx="17" cy="13" r="1" fill="currentColor"/>
</svg>
```

**样式说明：**
- 使用 `stroke="currentColor"` 继承父元素颜色
- 支持 hover/active 状态颜色变化
- 尺寸 24x24px，与其他图标保持一致

---

## 🔒 安全机制

### 双密码体系

```
┌─────────────────────────────────────────────┐
│              密码隔离架构                     │
│                                             │
│  社区账号 (Logto)          游戏角色 (MC)     │
│  ┌─────────────┐          ┌─────────────┐   │
│  │ 登录方式:   │          │ 登录方式:   │   │
│  │ • 邮箱/密码 │          │ 独立密码    │   │
│  │ • 社交登录 │          │ (bcrypt)   │   │
│  │ • Logto    │          │             │   │
│  └─────────────┘          └──────┬──────┘   │
│                                  │          │
│                          完全隔离，互不影响    │
│                                             │
│  💡 即使社区账号被盗：                       │
│     → 攻击者仍需知道角色独立密码才能登录MC    │
│     → 社区管理员也无法查看角色明文密码        │
│                                             │
└─────────────────────────────────────────────┘
```

### 安全措施清单

| 安全项 | 实现方式 | 作用 |
|--------|---------|------|
| **密码加密** | bcrypt (cost=12) | 防止数据库泄露导致密码暴露 |
| **双因子隔离** | 社区密码 ≠ 角色密码 | 降低盗号风险 |
| **Token过期** | access_token 7天有效 | 减少被盗用的时间窗口 |
| **IP记录** | 登录/操作记录IP | 异常检测和审计 |
| **速率限制** | express-rate-limit | 防暴力破解 |
| **输入验证** | 白名单校验 | 防 SQL 注入 / XSS |
| **CSRF防护** | SameSite Cookie | 防跨站请求伪造 |
| **角色不可删** | 无DELETE逻辑 | 防恶意删除/找回历史 |
| **UUID固定** | 创建后永不变更 | 保证数据一致性 |

### 速率限制配置

```javascript
// Yggdrasil API (对外接口，严格限制)
const yggdrasilLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 30,                    // 每个IP最多30次请求
  message: { error: 'Too Many Requests' }
});

// 游戏管理API (内部接口，宽松限制)
const gameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15分钟
  max: 100,                   // 每个用户100次请求
});
```

---

## 📁 文件结构

### 新增文件

```
express-project/
├── scripts/
│   └── add-mc-tables.sql              # 数据库迁移脚本
│
├── routes/
│   ├── yggdrasil.js                   # Yggdrasil 标准API路由
│   └── game.js                        # 游戏管理API路由
│
├── utils/
│   └── yggdrasilHelper.js             # Yggdrasil工具函数
│
vue3-project/src/
├── views/
│   └── game/
│       ├── index.vue                  # 游戏主页
│       └── components/
│           ├── ProfileCard.vue        # 角色卡片
│           ├── CreateProfileModal.vue # 创建角色弹窗
│           ├── EditProfileModal.vue   # 编辑角色弹窗
│           ├── ApiConfigCard.vue      # API配置卡片
│           └── SkinUploader.vue       # 皮肤上传器
│
├── api/
│   └── game.js                        # 游戏API请求封装
│
├── assets/icons/
│   └── game.svg                       # 游戏图标
│
└── router/
    └── index.js                       # 修改:添加 /game 路由
```

### 修改文件

```
express-project/
└── app.js                             # 修改:注册新路由

vue3-project/src/
├── views/layout/components/
│   ├── Sidebar.vue                    # 修改:添加游戏入口
│   └── LayoutFooter.vue               # 修改:添加游戏入口
│
└── router/index.js                    # 修改:添加路由定义
```

---

## 📅 实施计划

### Phase 1: 后端基础 (预计工作量: 2-3小时)

- [ ] **1.1** 创建数据库迁移脚本 `scripts/add-mc-tables.sql`
- [ ] **1.2** 实现 `utils/yggdrasilHelper.js` 工具函数
  - Token生成/验证
  - UUID处理
  - Base64纹理编码
- [ ] **1.3** 实现 `routes/yggdrasil.js` 标准API
  - authenticate
  - refresh
  - validate
  - signout
  - invalidate
  - sessionserver/profile/:uuid
- [ ] **1.4** 实现 `routes/game.js` 管理API
  - CRUD操作
  - 皮肤上传 (复用uploadHelper)
- [ ] **1.5** 在 `app.js` 注册新路由
- [ ] **1.6** 单元测试 (Postman/curl测试各接口)

### Phase 2: 前端开发 (预计工作量: 2-3小时)

- [ ] **2.1** 创建 `assets/icons/game.svg` 图标
- [ ] **2.2** 实现 `views/game/index.vue` 主页
- [ ] **2.3** 实现子组件
  - ProfileCard
  - CreateProfileModal
  - EditProfileModal
  - ApiConfigCard
  - SkinUploader
- [ ] **2.4** 实现 `api/game.js` API封装
- [ ] **2.5** 修改 `Sidebar.vue` 添加游戏入口
- [ ] **2.6** 修改 `LayoutFooter.vue` 添加游戏入口
- [ ] **2.7** 在 `router/index.js` 注册路由

### Phase 3: 测试优化 (预计工作量: 1-2小时)

- [ ] **3.1** 功能测试
  - 创建角色流程
  - 皮肤上传流程
  - Yggdrasil API对接测试 (用authlib-injector)
- [ ] **3.2** UI测试
  - 响应式布局检查
  - 多浏览器兼容性
- [ ] **3.3** 安全测试
  - 密码强度验证
  - 速率限制测试
  - SQL注入测试
- [ ] **3.4** 性能优化
  - 皮肤加载速度
  - API响应时间
- [ ] **3.5** 编写用户使用文档

---

## 🧪 测试用例

### 后端API测试

```bash
# 1. 创建角色
curl -X POST http://localhost:3001/api/game/profile/create \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"player_name":"TestPlayer","password":"TestPass123"}'

# 2. Yggdrasil认证测试
curl -X POST http://localhost:3001/api/yggdrasil/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "agent":{"name":"Minecraft","version":1},
    "username":"TestPlayer",
    "password":"TestPass123",
    "clientToken":"test-client-token"
  }'

# 3. 获取角色纹理
curl http://localhost:3001/api/yggdrasil/sessionserver/session/minecraft/profile/<uuid>

# 4. 上传皮肤
curl -X POST http://localhost:3001/api/game/profile/1/skin \
  -H "Authorization: Bearer <jwt_token>" \
  -F "skin=@skin.png" \
  -F "model=classic"
```

### 前端测试清单

- [ ] 未登录状态：隐藏创建按钮，显示提示登录
- [ ] 已登录无角色：显示创建引导
- [ ] 已登录有角色：显示角色列表
- [ ] 创建角色：验证规则生效
- [ ] 上传皮肤：格式/大小验证
- [ ] 修改名称：唯一性检查
- [ ] 修改密码：旧密码验证
- [ ] API配置：正确显示地址
- [ ] 复制功能：点击复制到剪贴板
- [ ] 响应式：桌面/平板/手机布局正常

---

## ❓ FAQ

### Q1: 为什么角色不能删除？
**A:** 为了防止恶意行为和数据丢失。即使账号被黑客控制，攻击者也无法删除已有的角色记录，保留了恢复的可能性。同时，UUID是固定的，删除重建会导致UUID变化，影响历史数据一致性。

### Q2: 忘记角色密码怎么办？
**A:** 目前设计中暂不支持自助重置（为了安全性）。后续版本可以考虑：
- 通过社区邮箱发送重置链接
- 管理员后台手动重置
- 设置安全问题

### Q3: 一个用户可以创建几个角色？
**A:** 默认限制为3个角色。可以在 `config/config.js` 中调整 `MAX_PROFILES_PER_USER` 配置项。

### Q4: 皮肤支持哪些格式？
**A:** 目前仅支持PNG格式，推荐尺寸：
- 经典皮肤：64×64 像素
- 支持带透明通道的PNG
- 最大文件大小：500KB

### Q5: 如何兼容正版联机？
**A:** 使用 UUID v4 格式，这是标准的UUID格式，与Minecraft正版的UUID格式完全兼容。理论上可以与正版服务器联机（取决于服务器的具体设置）。

### Q6: 性能如何？能支持多少用户？
**A:** 基于现有架构：
- 数据库查询：< 50ms
- Token生成：< 10ms
- 皮肤上传：取决于存储后端（图床约2-5秒）
- 预估单机支持：1000+ 并发用户

---

## 📝 附录

### A. 环境变量扩展 (.env.example)

```ini
# ==================== MC游戏功能配置 ====================
# Yggdrasil API 根地址 (自动生成，一般不需要修改)
YGGDRASIL_API_ROOT=https://your-domain.com/api/yggdrasil

# 每个用户最大角色数量
MAX_PROFILES_PER_USER=3

# 皮肤上传配置 (复用IMAGE_UPLOAD_STRATEGY)
SKIN_MAX_SIZE=500kb
SKIN_ALLOWED_TYPES=image/png

# Token过期时间 (单位: 天)
ACCESS_TOKEN_EXPIRES_IN=7
REFRESH_TOKEN_EXPIRES_IN=30
```

### B. 参考资料

- [Yggdrasil API 规范](https://wiki.vg/Authentication)
- [authlib-injector Wiki](https://github.com/yushijinhun/authlib-injector/wiki)
- [Blessing Skin Yggdrasil API 插件](https://github.com/bs-community/yggdrasil-api)
- [Minecraft 皮肤规格](https://minecraft.wiki/w/Skin)

### C. 版本历史

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|---------|
| v1.0.0 | 2026-05-30 | ZTMYO | 初始版本，完整功能设计 |

---

## 🎯 总结

本文档详细描述了悦社社区集成 Minecraft 外置登录功能的完整设计方案，包括：

✅ **完整的数据库设计** (4张表，含索引约束)  
✅ **标准的Yggdrasil API实现** (6个核心接口)  
✅ **完善的游戏管理API** (9个管理接口)  
✅ **符合现有风格的UI设计** (Vue3组件)  
✅ **多层次的安全机制** (双密码体系+审计)  
✅ **灵活的存储策略** (复用现有上传系统)  

下一步：按照实施计划开始编码实现。
