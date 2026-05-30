# 🎮 Minecraft 外置登录功能 - 开发任务清单

> **项目**: 悦社社区 - MC游戏功能模块  
> **版本**: v1.0.0  
> **创建日期**: 2026-05-30  
> **状态**: 开发中  

---

## 📋 总体进度

```
██████████████████████████████████████░░░░░  70%
├── 文档编写    ████████████████████████ 100% ✅
├── 后端开发    ░░░░░░░░░░░░░░░░░░░░░░░░░   0% ⏳
├── 前端开发    ░░░░░░░░░░░░░░░░░░░░░░░░░   0% ⏳
└── 测试优化    ░░░░░░░░░░░░░░░░░░░░░░░░░   0% ⏳
```

---

## ✅ 已完成任务

### Phase 0: 需求分析与文档 (已完成)

- [x] **TASK-001**: 分析现有项目架构（存储系统/路由/数据库）
- [x] **TASK-002**: 设计 Yggdrasil API 技术方案
- [x] **TASK-003**: 编写完整功能设计文档 `GAME_FEATURE.md`
  - 数据库设计（4张表）
  - 后端API设计（15个接口）
  - 前端UI设计（5个组件）
  - 安全机制设计
  - 实施计划

**产出物：**
- `GAME_FEATURE.md` - 完整技术设计文档（已提交）

---

## ⏳ 待完成任务

### Phase 1: 后端基础开发

#### 1.1 数据库层

- [ ] **TASK-004**: 创建数据库迁移脚本
  - **文件**: `express-project/scripts/add-mc-tables.sql`
  - **内容**: 
    - `mc_profiles` 表（MC角色表）
    - `yggdrasil_tokens` 表（Token会话表）
    - `mc_textures` 表（纹理记录表）
    - `mc_audit_logs` 表（操作审计表）
  - **验证**: 在MySQL中执行脚本，确认表创建成功
  - **预估时间**: 30分钟

#### 1.2 工具函数层

- [ ] **TASK-005**: 实现 Yggdrasil 工具函数
  - **文件**: `express-project/utils/yggdrasilHelper.js`
  - **功能**:
    - `generateAccessToken(profile)` - 生成JWT访问令牌
    - `generateRefreshToken()` - 生成刷新令牌
    - `validateToken(token)` - 验证Token有效性
    - `hashPassword(password)` - bcrypt密码加密
    - `verifyPassword(password, hash)` - 密码验证
    - `generateUuidV4()` - 生成UUID v4
    - `encodeTextures(textures)` - Base64编码纹理数据
    - `isValidPlayerName(name)` - 玩家名称验证
    - `auditLog(action, profileId, ip, details)` - 记录审计日志
  - **依赖**: jsonwebtoken, bcryptjs, crypto
  - **预估时间**: 1小时

#### 1.3 Yggdrasil 标准API路由

- [ ] **TASK-006**: 实现 Yggdrasil 认证API路由
  - **文件**: `express-project/routes/yggdrasil.js`
  - **接口清单**:
    
    | 接口 | 方法 | 路径 | 功能 | 优先级 |
    |------|------|------|------|--------|
    | 1 | POST | `/api/yggdrasil/authenticate` | 登录验证，返回accessToken | P0 |
    | 2 | POST | `/api/yggdrasil/refresh` | 刷新Token | P0 |
    | 3 | POST | `/api/yggdrasil/validate` | 验证Token有效性 | P0 |
    | 4 | POST | `/api/yggdrasil/signout` | 登出（使所有Token失效）| P0 |
    | 5 | POST | `/api/yggdrasil/invalidate` | 使指定Token失效 | P1 |
    | 6 | GET | `/api/yggdrasil/sessionserver/session/minecraft/profile/:uuid` | 获取角色信息+纹理 | P0 |

  - **特殊要求**:
    - 严格遵循 Mojang Yggdrasil API 规范
    - 返回格式必须与官方一致（兼容 authlib-injector）
    - 添加速率限制（15分钟30次/IP）
    - 完善的错误处理和日志记录
  - **预估时间**: 2小时

#### 1.4 游戏管理API路由

- [ ] **TASK-007**: 实现游戏管理API路由
  - **文件**: `express-project/routes/game.js`
  - **接口清单**:

    | 接口 | 方法 | 路径 | 功能 | 认证 | 优先级 |
    |------|------|------|------|------|--------|
    | 1 | GET | `/api/game/profile` | 获取当前用户的角色列表 | JWT | P0 |
    | 2 | POST | `/api/game/profile/create` | 创建新MC角色 | JWT | P0 |
    | 3 | PUT | `/api/game/profile/:id/name` | 修改角色名称 | JWT | P1 |
    | 4 | PUT | `/api/game/profile/:id/password` | 修改角色独立密码 | JWT | P1 |
    | 5 | POST | `/api/game/profile/:id/skin` | 上传皮肤 | JWT + Multer | P1 |
    | 6 | DELETE | `/api/game/profile/:id/skin` | 删除皮肤 | JWT | P2 |
    | 7 | POST | `/api/game/profile/:id/cape` | 上传披风 | JWT + Multer | P2 |
    | 8 | DELETE | `/api/game/profile/:id/cape` | 删除披风 | JWT | P2 |
    | 9 | GET | `/api/game/config` | 获取Yggdrasil配置信息 | 可选 | P1 |

  - **特殊要求**:
    - 所有写操作需要社区JWT认证
    - 皮肤上传复用 `uploadImage()` 函数（根据env自动选择存储策略）
    - 输入验证（玩家名格式、密码强度、文件类型/大小）
    - 权限检查（只能操作自己的角色）
  - **预估时间**: 2小时

#### 1.5 路由注册与配置

- [ ] **TASK-008**: 注册新路由到应用主文件
  - **修改文件**: `express-project/app.js`
  - **内容**:
    ```javascript
    // 导入新路由
    const yggdrasilRoutes = require('./routes/yggdrasil');
    const gameRoutes = require('./routes/game');

    // 注册路由（在现有路由之后）
    app.use('/api/yggdrasil', yggdrasilLimiter, yggdrasilRoutes);
    app.use('/api/game', gameLimiter, gameRoutes);
    ```
  - **添加速率限制器**:
    ```javascript
    const yggdrasilLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      message: { error: 'Too Many Requests', errorMessage: '请求过于频繁' }
    });

    const gameLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100
    });
    ```
  - **预估时间**: 15分钟

#### 1.6 后端测试验证

- [ ] **TASK-009**: 后端接口功能测试
  - **测试工具**: Postman / curl
  - **测试用例**:
    
    ```bash
    # 测试1: 创建角色
    curl -X POST http://localhost:3001/api/game/profile/create \
      -H "Authorization: Bearer <jwt_token>" \
      -H "Content-Type: application/json" \
      -d '{"player_name":"TestPlayer","password":"TestPass123"}'

    # 测试2: Yggdrasil认证
    curl -X POST http://localhost:3001/api/yggdrasil/authenticate \
      -H "Content-Type: application/json" \
      -d '{
        "agent":{"name":"Minecraft","version":1},
        "username":"TestPlayer",
        "password":"TestPass123",
        "clientToken":"test-token"
      }'

    # 测试3: 获取纹理
    curl http://localhost:3001/api/yggdrasil/sessionserver/session/minecraft/profile/<uuid>

    # 测试4: 上传皮肤
    curl -X POST http://localhost:3001/api/game/profile/1/skin \
      -H "Authorization: Bearer <jwt_token>" \
      -F "skin=@test_skin.png" \
      -F "model=classic"
    ```

  - **验收标准**:
    - [ ] 所有接口返回正确的HTTP状态码
    - [ ] 错误信息符合Yggdrasil规范
    - [ ] Token生成和验证正常工作
    - [ ] 皮肤上传后URL可访问
    - [ ] 数据库记录正确保存
  - **预估时间**: 1小时

---

### Phase 2: 前端开发

#### 2.1 图标资源

- [ ] **TASK-010**: 创建游戏图标SVG
  - **文件**: `vue3-project/src/assets/icons/game.svg`
  - **内容**: 游戏手柄图标 (24x24px)
  - **样式**: 
    - 使用 `stroke="currentColor"` 继承颜色
    - 支持 hover/active 状态
    - 与现有图标风格一致
  - **预估时间**: 10分钟

#### 2.2 API封装层

- [ ] **TASK-011**: 实现前端游戏API封装
  - **文件**: `vue3-project/src/api/game.js`
  - **功能**:
    ```javascript
    import request from './request'

    export const gameApi = {
      // 获取角色列表
      getProfiles: () => request.get('/game/profile'),
      
      // 创建角色
      createProfile: (data) => request.post('/game/profile/create', data),
      
      // 修改名称
      updateName: (id, newName) => request.put(`/game/profile/${id}/name`, { new_name: newName }),
      
      // 修改密码
      updatePassword: (id, data) => request.put(`/game/profile/${id}/password`, data),
      
      // 上传皮肤
      uploadSkin: (id, formData) => request.post(`/game/profile/${id}/skin`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      
      // 删除皮肤
      deleteSkin: (id) => request.delete(`/game/profile/${id}/skin`),
      
      // 上传披风
      uploadCape: (id, formData) => request.post(`/game/profile/${id}/cape`, formData),
      
      // 删除披风
      deleteCape: (id) => request.delete(`/game/profile/${id}/cape`),
      
      // 获取配置
      getConfig: () => request.get('/game/config')
    }
    ```
  - **预估时间**: 20分钟

#### 2.3 游戏主页组件

- [ ] **TASK-012**: 实现游戏主页页面
  - **文件**: `vue3-project/src/views/game/index.vue`
  - **功能**:
    - 显示当前用户的MC角色列表
    - 未登录时显示登录引导
    - 无角色时显示创建引导
    - 展示 API 配置信息卡片
    - 响应式布局（桌面/移动端适配）
  - **UI结构**:
    ```
    ┌─────────────────────────────────┐
    │  🎮 Minecraft 外置登录中心       │
    ├─────────────────────────────────┤
    │                                 │
    │  ┌───────────────────────────┐  │
    │  │ 我的游戏角色              │  │
    │  │                           │  │
    │  │ <ProfileCard />          │  │
    │  │ <ProfileCard />          │  │
    │  │                           │  │
    │  │ [+ 创建新角色]           │  │
    │  └───────────────────────────┘  │
    │                                 │
    │  ┌───────────────────────────┐  │
    │  │ <ApiConfigCard />         │  │
    │  └───────────────────────────┘  │
    │                                 │
    └─────────────────────────────────┘
    ```
  - **状态管理**:
    - 使用 `useAuthStore` 检查登录状态
    - 本地 `ref` 管理角色列表数据
    - 加载状态、错误处理
  - **预估时间**: 1.5小时

#### 2.4 子组件开发

##### 2.4.1 角色卡片组件

- [ ] **TASK-013**: 实现角色卡片组件
  - **文件**: `vue3-project/src/views/game/components/ProfileCard.vue`
  - **Props**:
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
  - **Events**: `@edit`, `@view-api`
  - **UI元素**:
    - 皮肤预览图（无皮肤显示默认Steve）
    - 玩家名称
    - 在线状态 / 最后登录时间
    - 编辑按钮、查看API按钮
  - **样式**: 卡片式布局，圆角12px，hover效果
  - **预估时间**: 45分钟

##### 2.4.2 创建角色弹窗

- [ ] **TASK-014**: 实现创建角色弹窗组件
  - **文件**: `vue3-project/src/views/game/components/CreateProfileModal.vue`
  - **功能**:
    - 玩家名称输入框（实时验证格式）
    - 角色密码输入框（显示/隐藏切换）
    - 重要提示信息展示
    - 提交按钮（含loading状态）
    - 取消按钮
  - **验证规则**:
    - 名称: 3-16字符，字母数字下划线，不以数字开头
    - 密码: 最少8位，包含大小写字母和数字
  - **交互**:
    - 输入时实时显示错误提示
    - 提交前最终验证
    - 成功后关闭弹窗并刷新列表
    - 失败时显示错误信息
  - **预估时间**: 1小时

##### 2.4.3 编辑角色弹窗

- [ ] **TASK-015**: 实现编辑角色弹窗组件
  - **文件**: `vue3-project/src/views/game/components/EditProfileModal.vue`
  - **Tabs切换**:
    - Tab1: 修改名称
    - Tab2: 修改密码
    - Tab3: 上传皮肤
  - **修改名称Tab**:
    - 当前名称显示
    - 新名称输入框
    - 唯一性检查（失焦时异步验证）
  - **修改密码Tab**:
    - 旧密码输入
    - 新密码输入（两次确认）
    - 强度提示
  - **上传皮肤Tab**:
    - 拖拽/点击上传区域
    - 图片预览
    - 模型选择（classic/slim）
    - 文件大小限制提示（500KB）
  - **预估时间**: 1.5小时

##### 2.4.4 API配置卡片

- [ ] **TASK-016**: 实现API配置展示卡片
  - **文件**: `vue3-project/src/views/game/components/ApiConfigCard.vue`
  - **功能**:
    - 显示 Yggdrasil API Root 地址
    - 一键复制到剪贴板（带成功提示）
    - 使用指南折叠面板
  - **使用指南内容**:
    ```
    1️⃣ 下载 authlib-injector
       GitHub: https://github.com/yushijinhun/authlib-injector
    
    2️⃣ 配置启动器（以HMCL为例）
       - 设置 → 账户 → 添加 → 高级设置
       - 填入API地址: https://your-domain.com/api/yggdrasil
       - 使用账户名+角色密码登录
    
    3️⃣ 开始游戏
       - 选择角色 → 启动游戏 → 进入服务器 ✅
    ```
  - **预估时间**: 45分钟

##### 2.4.5 皮肤上传组件（可选）

- [ ] **TASK-017**: 实现通用皮肤上传组件
  - **文件**: `vue3-project/src/views/game/components/SkinUploader.vue`
  - **功能**:
    - 支持拖拽上传
    - 点击选择文件
    - 图片预览（缩略图）
    - 格式验证（仅PNG）
    - 大小验证（≤500KB）
    - 上传进度条
    - 模型选择器（classic/slim）
  - **Props**:
    ```typescript
    interface SkinUploaderProps {
      modelValue?: File | null  // v-model绑定
      maxSize?: number          // 默认500KB
      acceptTypes?: string[]    // 默认 ['image/png']
    }
    ```
  - **Events**: 
    - `@update:modelValue` - 文件选择变化
    - `@upload-complete` - 上传完成
    - `@error` - 上传失败
  - **预估时间**: 1小时（可选，可合并到EditProfileModal）

#### 2.5 导航入口修改

##### 2.5.1 侧边栏修改

- [ ] **TASK-018**: 修改桌面端侧边栏
  - **文件**: `vue3-project/src/views/layout/components/Sidebar.vue`
  - **修改位置**: 第42行 menuItems 数组
  - **修改内容**:
    ```javascript
    const menuItems = ref([
      { label: '发现', icon: 'home', path: '/explore' },
      { label: '游戏', icon: 'game', path: '/game' },     // ← 新增
      { label: '发布', icon: 'publish', path: '/publish' },
      { label: '通知', icon: 'notification', path: '/notification' },
      { label: '我', icon: 'avatar', path: '/user' },
      { label: '更多', icon: 'menu', path: '' },
    ]);
    ```
  - **注意事项**: 保持原有顺序和风格不变
  - **预估时间**: 5分钟

##### 2.5.2 底部导航修改

- [ ] **TASK-019**: 修改移动端底部导航
  - **文件**: `vue3-project/src/views/layout/components/LayoutFooter.vue`
  - **修改位置**: 第36行 footerList 数组
  - **修改内容**:
    ```javascript
    const footerList = ref([
      { label: 'explore', icon: 'home', path: '/explore' },
      { label: 'game', icon: 'game', path: '/game' },      // ← 新增
      { label: 'publish', icon: 'publish', path: '/publish' },
      { label: 'notification', icon: 'notification', path: '/notification' },
      { label: 'user', icon: 'user', path: '/user' },
    ])
    ```
  - **注意事项**: 移动端空间有限，确保图标清晰可见
  - **预估时间**: 5分钟

#### 2.6 路由注册

- [ ] **TASK-020**: 注册游戏页面路由
  - **文件**: `vue3-project/src/router/index.js`
  - **添加位置**: layout children 数组内
  - **添加内容**:
    ```javascript
    import game from '@/views/game/index.vue'

    // 在 children 中添加
    {
      path: '/game',
      name: 'game',
      component: game,
      meta: {
        title: '游戏中心',
        requiresAuth: true  // 需要登录才能访问
      }
    }
    ```
  - **预估时间**: 5分钟

---

### Phase 3: 测试与优化

#### 3.1 功能测试

- [ ] **TASK-021**: 端到端功能测试
  - **测试场景**:
    
    | # | 场景 | 步骤 | 预期结果 | 状态 |
    |---|------|------|---------|------|
    | 1 | 创建角色流程 | 登录→进入游戏页→点击创建→填写信息→提交 | 角色创建成功，卡片显示 | ⬜ |
    | 2 | Yggdrasil认证 | 启动器配置API→输入角色名+密码→登录 | 进入服务器，皮肤正常显示 | ⬜ |
    | 3 | 皮肤上传 | 编辑角色→上传PNG→确认 | 皮肤更新成功 | ⬜ |
    | 4 | 名称修改 | 编辑→修改名称→确认 | 名称变更成功，唯一性检查生效 | ⬜ |
    | 5 | 密码修改 | 编辑→修改密码→用新密码认证通过 | 密码修改成功 | ⬜ |
    | 6 | 未登录访问 | 未登录状态下访问/game | 重定向到登录页或显示提示 | ⬜ |
    | 7 | API地址复制 | 点击复制按钮→粘贴 | 剪贴板包含正确地址 | ⬜ |

  - **工具**: Chrome DevTools / Postman / Minecraft客户端
  - **预估时间**: 2小时

#### 3.2 UI/UX测试

- [ ] **TASK-022**: 多设备响应式测试
  - **测试设备**:
    - [ ] 桌面端 (1920x1080, 1440x900)
    - [ ] 平板 (768x1024)
    - [ ] 手机横屏 (844x390)
    - [ ] 手机竖屏 (390x844)
  - **验收标准**:
    - [ ] 无横向滚动条
    - [ ] 字体大小合适
    - [ ] 按钮可点击区域足够大（≥44px）
    - [ ] 图片不变形
    - [ ] 弹窗居中显示
  - **预估时间**: 30分钟

#### 3.3 安全性测试

- [ ] **TASK-023**: 安全漏洞扫描
  - **测试项**:
    - [ ] SQL注入测试（玩家名称输入 `' OR 1=1 --`）
    - [ ] XSS攻击测试（名称输入 `<script>alert(1)</script>`）
    - [ ] 暴力破解测试（连续错误密码100次）
    - [ ] Token伪造测试（篡改JWT payload）
    - [ ] 权限越权测试（尝试操作他人角色）
    - [ ] 文件上传漏洞测试（上传恶意PHP文件伪装成PNG）
  - **工具**: Burp Suite / 手动测试
  - **预估时间**: 1小时

#### 3.4 性能优化

- [ ] **TASK-024**: 性能优化与监控
  - **优化项**:
    - [ ] API响应时间优化（目标：<200ms for DB查询）
    - [ ] 皮肤图片加载优化（懒加载、缩略图）
    - [ ] 前端组件按需加载（路由级 code-splitting）
    - [ ] 数据库查询优化（添加必要索引）
    - [ ] Token清理定时任务（删除过期Token）
  - **监控指标**:
    - API平均响应时间
    - 数据库查询耗时分布
    - 内存/CPU使用率
    - 并发用户数支持
  - **预估时间**: 1小时

#### 3.5 文档完善

- [ ] **TASK-025**: 编写用户使用手册
  - **文件**: `docs/MC_GAME_USER_GUIDE.md`
  - **内容**:
    - 功能介绍
    - 快速开始指南（5步上手）
    - 常见问题FAQ
    - 故障排查指南
    - 视频教程链接（可选）
  - **受众**: 悦社社区普通用户
  - **预估时间**: 45分钟

---

## 📊 任务统计

### 总览

| 类别 | 总数 | 已完成 | 进行中 | 待开始 | 完成率 |
|------|------|--------|--------|--------|--------|
| **Phase 0: 文档** | 3 | 3 | 0 | 0 | 100% ✅ |
| **Phase 1: 后端** | 6 | 0 | 0 | 6 | 0% ⏳ |
| **Phase 2: 前端** | 11 | 0 | 0 | 11 | 0% ⏳ |
| **Phase 3: 测试** | 5 | 0 | 0 | 5 | 0% ⏳ |
| **总计** | **25** | **3** | **0** | **22** | **12%** |

### 工作量估算

| Phase | 预估时间 | 详细分解 |
|-------|---------|---------|
| **Phase 0** | ✅ 已完成 | 3小时（需求分析+文档编写） |
| **Phase 1** | ~7.75小时 | 数据库(0.5h) + 工具函数(1h) + Yggdrasil API(2h) + 游戏API(2h) + 路由注册(0.25h) + 测试(1h) |
| **Phase 2** | ~7.25小时 | 图标(0.17h) + API封装(0.33h) + 主页(1.5h) + 组件(4.35h) + 导航修改(0.17h) + 路由(0.08h) |
| **Phase 3** | ~5.25小时 | 功能测试(2h) + UI测试(0.5h) + 安全测试(1h) + 性能优化(1h) + 文档(0.75h) |
| **总计** | **~20小时** | 约2-3个工作日 |

---

## 🔧 关键技术点备忘

### 必须注意的事项

#### 1. 数据库相关
- [ ] UUID字段使用 CHAR(36)，存储带横杠的格式
- [ ] password_hash 字段长度足够（bcrypt结果约60字符）
- [ ] skin_url/cape_url 使用 VARCHAR(500) 以容纳长URL
- [ ] 所有外键约束设置 ON DELETE CASCADE
- [ ] 审计表的 profile_id 允许 NULL（某些系统操作可能无关联角色）

#### 2. API规范相关
- [ ] Yggdrasil API 的错误响应必须使用特定格式：
  ```json
  { "error": "ForbiddenOperationException", "errorMessage": "具体错误信息" }
  ```
- [ ] authenticate 接口返回的 user.id 必须是字符串（社区的userId的hash）
- [ ] sessionserver/profile/:uuid 返回的 id 必须是去掉横杠的UUID
- [ ] textures.value 必须是 Base64 编码的 JSON 字符串
- [ ] 时间戳使用毫秒级 Unix timestamp

#### 3. 安全相关
- [ ] bcrypt cost 设置为 12（安全性和性能平衡）
- [ ] access_token 有效期 7天，refresh_token 30天
- [ ] Yggdrasil API 不需要社区JWT（面向MC客户端）
- [ ] Game API 必须验证社区JWT（面向Web前端）
- [ ] 皮肤上传必须验证 MIME type（不仅是扩展名）

#### 4. 存储相关
- [ ] 复用 `uploadImage()` 函数，不要重复实现上传逻辑
- [ ] 文件命名规则：`{uuid}_skin.png` 或 `{uuid}_cape.png`
- [ ] 根据环境变量 IMAGE_UPLOAD_STRATEGY 自动选择存储后端
- [ ] 数据库只存最终访问URL，不管哪种存储方式

#### 5. 前端相关
- [ ] 所有UI组件使用 CSS 变量，保持主题一致性
- [ ] 圆角风格：按钮999px，卡片12px
- [ ] 过渡动画：transition: 0.2s ease
- [ ] 移动端优先设计，断点 480/768/960px
- [ ] SVG图标使用 stroke="currentColor"

---

## 🚫 风险与阻塞

### 潜在风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| authlib-injector兼容性问题 | MC客户端无法连接 | 低 | 严格遵循官方API规范，参考Blessing Skin实现 |
| 存储后端迁移问题 | 皮肤无法访问 | 低 | 统一使用uploadHelper抽象层 |
| 高并发性能瓶颈 | API响应慢 | 中 | 添加缓存、索引优化、读写分离 |
| 安全漏洞 | 用户数据泄露 | 低 | 代码审查、安全测试、依赖更新 |

### 依赖关系

```
TASK-004 (数据库)
    ↓
TASK-005 (工具函数)
    ↓
TASK-006 (Yggdrasil API) ←──── TASK-007 (Game API)  [可并行]
    ↓                              ↓
TASK-008 (路由注册) ←─────────────┘
    ↓
TASK-009 (后端测试)
    ↓
TASK-010~020 (前端开发)  [TASK-010~012 可并行]
    ↓
TASK-021~025 (测试优化)
```

---

## 📝 更新日志

| 日期 | 版本 | 更新内容 | 操作人 |
|------|------|---------|--------|
| 2026-05-30 | v1.0.0 | 初始版本，完整任务清单创建 | AI Assistant |

---

## ✨ 下一步行动

**立即执行：**

1. ✅ 从 **TASK-004** 开始：创建数据库迁移脚本
2. ✅ 执行SQL脚本，初始化数据库表
3. ✅ 实现 **TASK-005**：yggdrasilHelper 工具函数
4. ✅ 依次实现后端API路由

**预计完成时间：** 2-3个工作日  
**里程碑：** 第一个可运行的MC角色创建流程

---

## 💡 备注

- 社区名称：**悦社**（不是小石榴）
- UI风格：严格保持现有社区风格
- 图标要求：使用SVG手绘，保持简洁
- 存储策略：完全复用现有的 local/imagehost/r2 三种模式
- 安全第一：双密码体系，角色不可删除，完整的审计日志

---

**祝开发顺利！🚀**
