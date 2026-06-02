# 数据库迁移指南

## 🚀 快速开始

### 方案一：PostgreSQL（推荐）

#### 1. 本地开发环境

**选项 A：使用 Docker（推荐）**
```bash
# 启动 PostgreSQL
docker compose -f docker-compose.db.yml up -d

# 查看日志
docker compose -f docker-compose.db.yml logs -f postgres

# 停止服务
docker compose -f docker-compose.db.yml down
```

**选项 B：本地安装 PostgreSQL**
- 下载并安装 [PostgreSQL](https://www.postgresql.org/download/)
- 默认配置已设置在 `.env` 文件中

#### 2. 运行迁移
```bash
# 执行所有待执行的迁移
npm run migrate:latest

# 回滚上一个迁移
npm run migrate:rollback

# 查看迁移状态
knex migrate:status --knexfile knexfile.js
```

#### 3. 填充种子数据
```bash
# 运行所有种子数据脚本
npm run seed:run
```

### 方案二：SQLite（备选）

> ⚠️ **注意**: SQLite 在 Windows 上需要编译原生模块，可能遇到以下问题：
> - 需要安装 Python 3.6+ 和 Visual Studio Build Tools
> - 或使用 `windows-build-tools` npm 包

#### 安装步骤：
```bash
# 1. 安装构建工具（如果失败）
npm install --global windows-build-tools

# 2. 安装 SQLite3 驱动
npm install sqlite3

# 3. 修改 .env 文件
DB_TYPE=sqlite3
SQLITE_DB_PATH=./data/dev.sqlite3

# 4. 运行迁移
npm run migrate:latest
```

## 📝 迁移命令参考

### 创建新迁移
```bash
# 创建新的迁移文件
npm run migrate:make --name=add_user_avatar_field
```

### 迁移管理
```bash
# 执行最新迁移
npm run migrate:latest

# 回滚最近一次迁移
npm run migrate:rollback

# 回滚所有迁移
npm run migrate:rollback --all

# 查看迁移执行状态
knex migrate:status --knexfile knexfile.js
```

### 种子数据
```bash
# 创建新的种子文件
npm run seed:make --name=demo_users

# 运行所有种子数据
npm run seed:run

# 运行特定种子文件
knex seed:run --specific=01_admin.js --knexfile knexfile.js
```

## 🔧 环境配置

### 开发环境 (.env)
```env
DB_TYPE=pg
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=123456
PG_DATABASE=xiaoshiliu
```

### 生产环境 (.env.production)
```env
NODE_ENV=production
DB_TYPE=pg
PG_HOST=your-production-db-host.com
PG_PORT=5432
PG_USER=your_production_user
PG_PASSWORD=secure_password_here
PG_DATABASE=xiaoshiliu_prod
```

## 📁 项目结构

```
express-project/
├── knexfile.js              # Knex 配置文件
├── migrations/              # 数据库迁移目录
│   └── 20260102000000_init_schema.js  # 初始表结构
├── seeds/                   # 种子数据目录
│   └── 01_admin.js          # 管理员初始数据
├── utils/
│   ├── db.js               # Knex 实例管理
│   └── dbHelper.js         # 数据库操作工具函数
├── docker-compose.db.yml    # PostgreSQL Docker 配置
└── data/                    # SQLite 数据库文件目录（如使用）
```

## 🛠️ 常见问题

### Q: 连接被拒绝 (ECONNREFUSED)
**A:** 确保 PostgreSQL 正在运行：
- Docker 用户：`docker compose -f docker-compose.db.yml up -d`
- 本地安装：检查 PostgreSQL 服务是否启动

### Q: SQLite 编译失败
**A:** Windows 上需要构建工具：
```bash
# 方法 1：安装 windows-build-tools
npm install --global windows-build-tools

# 方法 2：手动安装
# 1. 安装 Python 3.6+
# 2. 安装 Visual Studio Build Tools (勾选 "C++ 构建")
# 3. 重启终端后重新运行 npm install sqlite3
```

### Q: 如何切换数据库类型？
**A:** 修改 `.env` 文件中的 `DB_TYPE`：
- `pg` - PostgreSQL
- `sqlite3` - SQLite

然后重新运行 `npm run migrate:latest`

### Q: 迁移失败如何回滚？
```bash
# 回滚到指定版本
knex migrate:rollback --knexfile knexfile.js

# 如果完全混乱，可以删除数据库重建：
# PostgreSQL:
psql -U postgres -c "DROP DATABASE xiaoshiliu; CREATE DATABASE xiaoshiliu;"
# 然后重新运行 migrate:latest
```

## 💡 最佳实践

1. **始终先在测试环境验证迁移**
2. **不要修改已执行的迁移文件**
3. **每个迁移应该可逆（提供 down 方法）**
4. **敏感信息放在 .env 文件中**
5. **定期备份生产数据库**

## 📊 当前支持的表

迁移文件 `20260102000000_init_schema.js` 包含以下表：
- users - 用户表
- admin - 管理员表
- categories - 分类表
- posts - 笔记表
- post_images / post_videos - 媒体表
- tags / post_tags - 标签表
- follows - 关注关系表
- likes / collections - 点赞和收藏表
- comments - 评论表
- notifications - 通知表
- user_sessions / admin_sessions - 会话表
- audit - 审核表
- user_verification - 用户认证表
- user_ban - 封禁表
