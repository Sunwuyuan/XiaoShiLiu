# 管理员权限系统使用指南

## 一、系统架构

### 1.1 角色类型

系统支持以下角色：

| 角色 | 说明 | 权限范围 |
|------|------|----------|
| **超级管理员** | 拥有所有权限 | 所有功能，包括管理员管理 |
| **内容管理员** | 负责内容管理 | 笔记、评论、分类、标签管理 |
| **用户管理员** | 负责用户管理 | 用户管理、认证审核 |
| **运维人员** | 负责系统运维 | 监控、会话管理、API文档 |

### 1.2 权限列表

```javascript
// 系统功能
api_docs:view - 查看API文档
monitor:view - 查看系统监控

// 用户管理
users:view - 查看用户
users:edit - 编辑用户
users:delete - 删除用户
users:ban - 封禁/解封用户

// 内容管理
posts:view - 查看笔记
posts:edit - 编辑笔记
posts:delete - 删除笔记
post_audit:view - 查看待审核笔记
post_audit:audit - 审核笔记
comments:view - 查看评论
comments:edit - 编辑评论
comments:delete - 删除评论

// 分类与标签
categories:view - 查看分类
categories:edit - 编辑分类
categories:delete - 删除分类
categories:create - 创建分类
tags:view - 查看标签
tags:edit - 编辑标签
tags:delete - 删除标签
tags:create - 创建标签

// 互动管理
likes:view - 查看点赞
likes:delete - 删除点赞
collections:view - 查看收藏
collections:delete - 删除收藏
follows:view - 查看关注
follows:delete - 删除关注

// 通知管理
notifications:view - 查看通知
notifications:create - 发送通知
notifications:delete - 删除通知

// 会话管理
user_sessions:view - 查看用户会话
user_sessions:delete - 禁用用户会话
admin_sessions:view - 查看管理员会话
admin_sessions:delete - 禁用管理员会话

// 认证管理
audit:view - 查看认证审核
audit:audit - 审核认证

// 管理员管理（仅超级管理员可用）
admins:view - 查看管理员
admins:edit - 编辑管理员
admins:delete - 删除管理员
admins:create - 创建管理员
```

## 二、设置第一个超级管理员

### 2.1 前提条件

1. 已完成数据库迁移脚本
2. 知道自己的 Logto 用户 ID（sub 字段）

### 2.2 获取 Logto 用户 ID

1. 登录 Logto 控制台
2. 进入"用户管理"
3. 点击你的用户头像
4. 复制用户的 `sub` 字段

### 2.3 设置超级管理员

执行以下 SQL（替换 `你的Logto用户ID`）：

```sql
USE xiaoshiliu;

-- 方法1：更新现有管理员
UPDATE admin 
SET is_super = 1, 
    logto_id = '你的Logto用户ID',
    nickname = '你的昵称'
WHERE id = 1;

-- 方法2：创建新的超级管理员
INSERT INTO admin (username, logto_id, nickname, is_super, permissions, created_at)
VALUES ('你的用户名', '你的Logto用户ID', '你的昵称', 1, NULL, NOW());

-- 验证设置
SELECT id, username, nickname, is_super, logto_id FROM admin WHERE is_super = 1;
```

## 三、使用权限管理系统

### 3.1 登录管理后台

1. 访问 `/admin/login`
2. 使用 Logto OAuth 登录
3. 进入管理后台

### 3.2 查看管理员列表

只有超级管理员可以看到"管理员管理"菜单。

路径：`/admin/admins`

功能：
- 查看所有管理员
- 查看管理员角色和权限
- 查看 Logto 用户 ID

### 3.3 创建新管理员

1. 点击"创建"按钮
2. 填写表单：
   - **账号**：Logto 用户 ID（sub）
   - **昵称**：管理员显示名称
   - **超级管理员**：是否给予全部权限
3. 如果不是超级管理员，需要勾选相应权限

### 3.4 编辑管理员权限

1. 点击管理员行的"编辑"按钮
2. 修改权限：
   - **预设角色**：快速选择预设权限组合
   - **自定义权限**：手动勾选具体权限
3. 点击保存

### 3.5 预设角色

| 角色 | 权限范围 | 适用场景 |
|------|----------|----------|
| **超级管理员** | 全部权限 | 系统所有者 |
| **内容管理员** | 内容相关 | 内容运营团队 |
| **用户管理员** | 用户相关 | 用户运营团队 |
| **运维人员** | 系统相关 | 技术运维团队 |

## 四、权限验证机制

### 4.1 前端权限验证

```javascript
// 检查单个权限
if (adminStore.hasPermission('posts:delete')) {
  // 有权限
}

// 检查多个权限（任一）
if (adminStore.hasAnyPermission(['posts:delete', 'posts:edit'])) {
  // 有权限
}

// 检查是否超级管理员
if (adminStore.isSuperAdmin) {
  // 超级管理员拥有所有权限
}
```

### 4.2 后端权限验证

```javascript
// 在路由中使用
router.get('/admin/posts', authenticateToken, async (req, res) => {
  // 检查权限
  if (!checkPermission(req.user.adminPermissions, 'posts:view', req.user.isSuper)) {
    return res.status(403).json({ 
      code: 'FORBIDDEN', 
      message: '无权限查看笔记' 
    });
  }
  // 继续处理...
});
```

### 4.3 权限中间件

也可以使用中间件方式：

```javascript
const { requirePermission } = require('../middleware/permission');

router.delete('/admin/posts/:id', authenticateToken, requirePermission('posts:delete'), async (req, res) => {
  // 只有拥有 posts:delete 权限才能执行
});
```

## 五、常见问题

### Q1: 忘记了超级管理员密码怎么办？

由于使用 Logto OAuth 登录，不需要密码。如果需要重置：
1. 登录 Logto 控制台
2. 修改 Logto 用户密码
3. 重新登录即可

### Q2: 如何删除管理员？

1. 访问 `/admin/admins`
2. 找到要删除的管理员
3. 点击"删除"按钮
4. 确认删除

### Q3: 普通管理员能看到其他管理员信息吗？

可以查看列表，但无法编辑或删除（除非有相应权限）。

### Q4: 如何转移超级管理员权限？

1. 当前超级管理员登录
2. 访问 `/admin/admins`
3. 找到新管理员
4. 勾选"超级管理员"选项
5. 保存

### Q5: 管理员登录后立即退出？

可能原因：
1. 会话已过期 → 重新登录
2. Token 无效 → 清除浏览器缓存后重新登录
3. 数据库会话表字段不匹配 → 检查数据库结构

## 六、安全建议

1. **最小权限原则**：只授予必要的权限
2. **定期审查**：定期检查管理员权限配置
3. **日志审计**：查看操作日志了解管理员行为
4. **多因素认证**：Logto 支持 MFA，建议启用
5. **会话管理**：定期清理过期会话
