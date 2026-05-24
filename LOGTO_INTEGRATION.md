# 小石榴 - Logto 统一认证集成指南

本文档介绍如何为小石榴项目配置和使用 Logto 统一认证系统。

## 目录

- [前置准备](#前置准备)
- [后端配置](#后端配置)
- [前端配置](#前端配置)
- [数据库迁移](#数据库迁移)
- [完整流程](#完整流程)
- [注意事项](#注意事项)

## 前置准备

在开始之前，您需要：

1. **安装 Logto**
   - 访问 [Logto 官方文档](https://docs.logto.io) 了解如何安装和部署 Logto
   - 可以使用 Docker 快速部署 Logto 服务

2. **创建 Logto 应用**
   - 登录 Logto 管理控制台
   - 创建一个新的"传统 Web"应用
   - 获取以下信息：
     - `App ID` (应用 ID)
     - `App Secret` (应用密钥)
     - `Endpoint` (Logto 服务地址)

3. **配置回调地址**
   在 Logto 应用设置中添加以下回调地址：
   - `http://localhost:5173/callback` (开发环境)
   - `https://your-domain.com/callback` (生产环境)

## 后端配置

### 1. 安装依赖

```bash
cd express-project
npm install @logto/node
```

### 2. 配置环境变量

复制 `express-project/.env.example` 为 `.env`，并配置以下 Logto 相关环境变量：

```env
# Logto 统一认证配置
LOGTO_ENDPOINT=https://your-logto-instance.com
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
LOGTO_REDIRECT_URI=http://localhost:5173/callback
LOGTO_POST_LOGOUT_REDIRECT_URI=http://localhost:5173
LOGTO_COOKIE_SECRET=your-secret-key-here  # 可选，自动生成
```

### 3. 数据库迁移

执行以下 SQL 为用户表添加 `logto_id` 字段：

```sql
USE xiaoshiliu;

-- 添加 logto_id 字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS logto_id VARCHAR(128) 
DEFAULT NULL 
COMMENT 'Logto 用户唯一标识符'
AFTER id;

-- 添加唯一索引
ALTER TABLE users 
ADD UNIQUE KEY IF NOT EXISTS idx_logto_id (logto_id);
```

或者直接运行提供的迁移脚本：

```bash
mysql -u root -p xiaoshiliu < express-project/scripts/add-logto-column.sql
```

### 4. 启动后端服务

```bash
npm run dev
```

## 前端配置

### 1. 安装依赖

```bash
cd vue3-project
npm install @logto/vue
```

### 2. 配置回调路由

路由已经在 `vue3-project/src/router/index.js` 中配置完成，
访问 `/callback` 路径将自动处理 Logto 回调。

### 3. 启动前端服务

```bash
npm run dev
```

## 完整流程

### 用户登录/注册流程

1. **用户点击"使用 Logto 登录"按钮**
2. **后端获取 Logto 登录 URL**
   - 调用 `GET /api/logto/sign-in`
3. **前端重定向到 Logto 登录页面**
   - 用户在 Logto 页面完成登录/注册
4. **Logto 回调到应用**
   - 重定向到 `http://localhost:5173/callback?code=xxx&state=xxx`
5. **前端处理回调**
   - 调用 `POST /api/logto/callback` 传递授权码
6. **后端验证并创建/更新用户**
   - 获取用户信息
   - 在本地数据库中查找或创建用户
   - 生成 JWT token
7. **登录完成**
   - 用户信息和 token 保存到本地
   - 重定向到首页

### 主要文件说明

#### 后端文件

- `express-project/routes/logto.js` - Logto 认证路由和中间件
- `express-project/utils/logto.js` - Logto 客户端工具
- `express-project/config/config.js` - 配置文件（已添加 Logto 配置）
- `express-project/scripts/add-logto-column.sql` - 数据库迁移脚本

#### 前端文件

- `vue3-project/src/components/LogtoLoginButton.vue` - Logto 登录按钮组件
- `vue3-project/src/views/LogtoCallback.vue` - Logto 回调处理页面
- `vue3-project/src/components/modals/AuthModal.vue` - 认证模态框（已集成 Logto）
- `vue3-project/src/api/index.js` - API 接口（已添加 Logto 相关接口）
- `vue3-project/src/router/index.js` - 路由配置（已添加回调路由）

## 混合认证模式

本项目支持**混合认证模式**：

- **传统方式**：用户可以继续使用原有的小石榴号/密码登录
- **Logto 方式**：用户可以选择使用 Logto 统一认证登录

两种方式共享同一用户系统，通过 `logto_id` 关联。

## 注意事项

1. **生产环境配置**
   - 在生产环境中，请确保使用 HTTPS
   - 配置正确的 CORS 策略
   - 使用强密码和安全的密钥

2. **用户数据迁移**
   - 老用户可以继续使用原账号
   - 老用户可以绑定 Logto 账号（需要额外开发）
   - 新用户可以直接使用 Logto 注册

3. **会话管理**
   - Logto 会话和本地会话是独立的
   - 建议统一使用 Logto 会话管理（可进一步优化）

4. **错误处理**
   - Logto 服务不可用时应有降级方案
   - 保留原认证方式作为备份

## 测试

1. 确保 Logto 服务正常运行
2. 配置好环境变量
3. 执行数据库迁移
4. 启动后端和前端服务
5. 点击"使用 Logto 登录"按钮测试

## 故障排查

### 问题：无法获取登录地址
- 检查 `LOGTO_ENDPOINT`、`LOGTO_APP_ID`、`LOGTO_APP_SECRET` 是否正确
- 检查 Logto 服务是否正常运行
- 检查网络连接

### 问题：回调失败
- 确认 Logto 应用中配置了正确的回调地址
- 检查 `LOGTO_REDIRECT_URI` 是否与 Logto 配置一致
- 查看后端日志获取详细错误信息

### 问题：数据库错误
- 确认已执行数据库迁移脚本
- 检查 `users` 表结构是否包含 `logto_id` 字段

## 下一步优化

- 完善 Logto 登出功能
- 支持用户绑定/解绑 Logto 账号
- 集成更多 Logto 功能（如社交登录、MFA 等）
- 优化错误处理和用户体验

## 参考资源

- [Logto 官方文档](https://docs.logto.io)
- [Logto Node SDK](https://docs.logto.io/sdk/node)
- [Logto Vue SDK](https://docs.logto.io/sdk/vue)
