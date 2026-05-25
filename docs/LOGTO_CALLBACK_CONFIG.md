# 悦社动态社区 - Logto 回调地址配置指南

## 一、回调地址说明

系统使用两个独立的回调地址：
1. **用户登录回调**: `/callback`
2. **管理员登录回调**: `/admin/callback`

## 二、配置步骤

### 1. 后端环境变量配置 (.env)

```bash
# Logto 服务配置
LOGTO_ENDPOINT=https://your-logto-domain.com
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret

# 回调地址配置 - 必须与 Logto 控制台中配置的完全一致！
LOGTO_REDIRECT_URI=https://your-frontend-domain.com/callback
LOGTO_ADMIN_REDIRECT_URI=https://your-frontend-domain.com/admin/callback
LOGTO_POST_LOGOUT_REDIRECT_URI=https://your-frontend-domain.com
```

### 2. Logto 控制台配置

在 Logto 控制台的应用设置中：

1. **Redirect URIs** (重定向 URI)
   ```
   https://your-frontend-domain.com/callback
   https://your-frontend-domain.com/admin/callback
   ```

2. **Post Sign-out URIs** (退出后重定向 URI)
   ```
   https://your-frontend-domain.com
   ```

### 3. 前端环境变量 (.env.production)

```bash
VITE_API_BASE_URL=https://your-api-domain.com/api
```

## 三、不同部署场景配置示例

### 场景1：前后端分离部署

**服务器架构：**
- 前端: `https://www.yoursite.com`
- 后端 API: `https://api.yoursite.com`
- Logto: `https://logto.yoursite.com`

**后端 .env 配置：**
```bash
API_BASE_URL=https://api.yoursite.com
LOGTO_ENDPOINT=https://logto.yoursite.com
LOGTO_REDIRECT_URI=https://www.yoursite.com/callback
LOGTO_ADMIN_REDIRECT_URI=https://www.yoursite.com/admin/callback
```

**Logto 控制台 Redirect URIs：**
```
https://www.yoursite.com/callback
https://www.yoursite.com/admin/callback
```

### 场景2：子目录部署

**服务器架构：**
- 前端: `https://yoursite.com/app`
- 后端 API: `https://yoursite.com/api`

**后端 .env 配置：**
```bash
API_BASE_URL=https://yoursite.com/api
LOGTO_ENDPOINT=https://logto.yoursite.com
LOGTO_REDIRECT_URI=https://yoursite.com/app/callback
LOGTO_ADMIN_REDIRECT_URI=https://yoursite.com/app/admin/callback
```

### 场景3：本地开发

**后端 .env 配置：**
```bash
API_BASE_URL=http://localhost:3001
LOGTO_ENDPOINT=http://localhost:3001  # 如果 Logto 也本地运行
LOGTO_REDIRECT_URI=http://localhost:5173/callback
LOGTO_ADMIN_REDIRECT_URI=http://localhost:5173/admin/callback
```

**Logto 控制台 Redirect URIs：**
```
http://localhost:5173/callback
http://localhost:5173/admin/callback
```

## 四、常见问题

### Q: 回调地址不匹配错误

**错误信息：** `The given redirect URI is not in the list of allowed redirect URIs`

**解决方案：**
1. 检查后端 `LOGTO_ADMIN_REDIRECT_URI` 配置
2. 检查 Logto 控制台的 Redirect URIs 配置
3. 确保两边配置的地址**完全一致**（包括协议 http/https、域名、端口、路径）

### Q: 生产环境回调地址仍然是 localhost

**原因：** `.env.production` 未正确配置或未重新构建

**解决方案：**
```bash
# 1. 创建生产环境配置文件
cp .env.example .env.production

# 2. 编辑配置
vim .env.production

# 3. 重新构建
npm run build

# 4. 重新部署
```

### Q: CORS 错误

**原因：** 后端 CORS 配置未包含生产环境域名

**解决方案：** 编辑后端 `.env`：
```bash
CORS_ORIGIN=https://your-frontend-domain.com,https://www.yoursite.com
```

## 五、验证配置

### 1. 检查后端配置
访问后端健康检查接口：
```
GET https://api.yoursite.com/api/health
```

### 2. 检查 Logto 配置
在 Logto 控制台测试应用连接。

### 3. 测试登录流程
1. 访问 `https://yoursite.com/admin/login`
2. 点击"使用 Logto 登录"
3. 在 Logto 完成授权
4. 检查是否正确跳转到 `/admin/callback`

## 六、安全注意事项

1. **使用 HTTPS**：生产环境必须使用 HTTPS
2. **回调地址验证**：Logto 控制台的回调地址必须精确匹配
3. **CORS 配置**：只允许受信任的域名
4. **环境变量**：不要将敏感信息提交到代码仓库
