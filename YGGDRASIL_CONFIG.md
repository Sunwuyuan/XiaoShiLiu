# Yggdrasil API 配置指南

## 🎮 Minecraft 启动器配置

### 1. authlib-injector 配置

在启动器中设置以下参数：

**Base URL (API 基础地址):**
```
http://你的服务器地址:端口/api/yggdrasil
```

**示例（本地开发）:**
```
http://localhost:3000/api/yggdrasil
```

### 2. 完整端点列表

#### Auth Server (认证服务)
| 方法 | 路径 | 用途 |
|------|------|------|
| POST | `/api/yggdrasil/authserver/authenticate` | 用户认证登录 |
| POST | `/api/yggdrasil/authserver/refresh` | 刷新访问令牌 |
| POST | `/api/yggdrasil/authserver/validate` | 验证令牌有效性 |
| POST | `/api/yggdrasil/authserver/signout` | 用户登出 |
| POST | `/api/yggdrasil/authserver/invalidate` | 使令牌失效 |

#### Session Server (会话服务)
| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/yggdrasil/sessionserver/session/minecraft/profile/:uuid` | 获取角色信息 |

---

## 🔧 测试方法

### 1. 使用 curl 测试

```bash
# 测试认证端点
curl -X POST http://localhost:3000/api/yggdrasil/authserver/authenticate \
  -H "Content-Type: application/json" \
  -d '{"username":"你的玩家名","password":"你的游戏密码"}'

# 测试获取角色信息
curl http://localhost:3000/api/yggdrasil/sessionserver/session/minecraft/profile/你的UUID
```

### 2. 使用浏览器测试

直接访问：
```
http://localhost:3000/api/health
```

应该返回：
```json
{
  "code": 0,
  "message": "OK",
  "timestamp": "...",
  "uptime": ...
}
```

---

## 📋 日志查看

重启后端服务后，控制台会显示：

```
========================================
[Yggdrasil] 🎮 Minecraft 认证服务已启动
========================================
[Yggdrasil] 📋 Auth Server 端点 (认证):
[Yggdrasin]    POST /api/yggdrasil/authserver/authenticate
...
========================================

[Yggdrasil] ✅ Yggdrasil API 路由加载完成
[Yggdrasil] 📍 可用端点:
  Auth Server (认证服务):
    - POST /authserver/authenticate  (认证)
    ...
  Session Server (会话服务):
    - GET  /sessionserver/session/minecraft/profile/:uuid
========================================
```

当有请求时，会看到详细日志：
```
[Yggdrasil] 📥 POST /api/yggdrasil/authserver/authenticate
[Yggdrasil] 🔍 IP: ::1
[Yggdrasil] 🌐 User-Agent: Minecraft/...
[Yggdrasil] 📦 Body: {"username":"test","password":"***"}
[Yggdrasil] 🔐 开始认证流程...
[Yggdrasil] 👤 尝试登录用户: test
...
```

---

## ❓ 常见问题

### Q: 启动器提示"找不到服务器"？

**检查清单：**
1. ✅ 确认服务器正在运行（访问 `/api/health`）
2. ✅ 确认 Base URL 正确：`http://域名:端口/api/yggdrasil`
3. ✅ 确认防火墙允许该端口
4. ✅ 如果是 HTTPS，需要使用 `https://` 前缀
5. ✅ 检查 CORS 配置（已默认开启）

### Q: 提示"无效的凭据"？

**可能原因：**
- 用户名或密码错误
- 角色不存在
- 角色被封禁

查看后端日志：
```
[Yggdrasil] ❌ 用户 xxx 不存在
[Yggdrasil] ❌ 用户 xxx 密码错误
[Yggdrasil] ❌ 用户 xxx 已被封禁
```

### Q: 皮肤不显示？

**检查步骤：**
1. 确认皮肤已上传成功
2. 访问皮肤 URL 是否可访问
3. 检查 sessionserver 日志：
   ```
   [Yggdrasil] 📤 返回角色信息: playername (皮肤: ✅, 披风: ❌)
   ```

---

## 🚀 生产环境部署

如果使用 Docker 或 Nginx 反向代理：

### Nginx 配置示例
```nginx
location /api/yggdrasil/ {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    
    # 支持大文件上传（皮肤）
    client_max_body_size 10m;
}
```

### Docker Compose
```yaml
services:
  backend:
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
```

---

## 📞 需要帮助？

如果问题仍然存在，请提供：
1. 后端完整启动日志
2. 启动器的具体错误信息
3. 浏览器控制台错误（F12）

---
