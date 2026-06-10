# 悦社社区 - 经济系统与等级系统完整设计

## 目录

1. [核心概念](#核心概念)
2. [货币系统](#货币系统)
3. [等级系统](#等级系统)
4. [装备系统](#装备系统)
5. [任务系统](#任务系统)
6. [成就系统](#成就系统)
7. [后端数据表设计](#后端数据表设计)
8. [前端组件设计](#前端组件设计)
9. [API 设计](#api-设计)
10. [实现路线图](#实现路线图)

---

## 核心概念

### 设计哲学

社区不盈利，货币和等级纯粹是游戏化激励手段，增强用户活跃度和归属感。

### 两种货币

| 货币 | 符号 | 定位 | 获取难度 | 用途 |
|------|------|------|---------|------|
| **Pi 键** | `π` | 日常活跃货币 | 容易，量大 | 普通消费、每日任务 |
| **Alpha 键** | `α` | 稀缺荣誉货币 | 困难，量少 | 稀有装备、成就奖励 |

### 等级命名（键盘主题）

| 等级 | 称号 | 经验阈值 |
|------|------|---------|
| 1 | `Esc` 访客 | 0 |
| 2-3 | `F1-F2` 新手 | 50-150 |
| 4-6 | `Tab` 探索者 | 300-800 |
| 7-10 | `Shift` 进阶者 | 1500-4000 |
| 11-15 | `Ctrl` 核心用户 | 7000-20000 |
| 16-19 | `Alt` 资深玩家 | 35000-80000 |
| 20 | `Space` 传说 | 150000 |

---

## 货币系统

### Pi 键获取途径

| 行为 | Pi 键奖励 | 每日上限 |
|------|----------|---------|
| 每日签到 | 10-50（连续7天翻倍） | 50 |
| 发布笔记 | 20 | 100 |
| 获得点赞 | 2/个 | 200 |
| 获得收藏 | 5/个 | 150 |
| 获得评论 | 3/个 | 150 |
| 被关注 | 10 | 100 |
| 每日首次分享 | 15 | 15 |
| 完善资料 | 50（一次性） | - |
| 邀请好友 | 30/人 | 150 |

### Alpha 键获取途径

| 行为 | Alpha 键奖励 |
|------|-------------|
| 笔记被官方精选 | 1 |
| 连续签到30天 | 1 |
| 等级达到 `Ctrl` (11) | 2 |
| 单篇笔记获得1000赞 | 1 |
| 单篇笔记被10人以上收藏 | 1 |
| 邀请好友注册并发布首篇 | 1 |
| 参与社区活动获奖 | 1-5 |
| 举报违规被采纳 | 1 |
| 成就系统达成稀有成就 | 1-3 |

### Pi 键消耗

| 行为 | Pi 键消耗 |
|------|----------|
| 改名 | 500 |
| 购买头像框 | 200-2000 |
| 购买主题皮肤 | 500-5000 |
| 笔记加精申请 | 1000 |
| 给作者打赏 | 自定义 |
| 解锁特殊表情 | 100/个 |
| 购买聊天气泡 | 300-1500 |

### Alpha 键消耗

| 行为 | Alpha 键消耗 |
|------|-------------|
| 专属称号（永久） | 5 |
| 定制头像框 | 3 |
| 社区名人堂展示位 | 10 |
| 优先客服响应 | 2/次 |
| 特殊标识（30天） | 2 |
| 渐变色用户名 | 5 |
| 动态彩虹用户名 | 8 |
| 霓虹发光用户名 | 10 |

---

## 等级系统

### 经验获取

| 行为 | 经验 |
|------|------|
| 每日登录 | 5 |
| 发布笔记 | 10 |
| 获得点赞 | 1/个 |
| 获得收藏 | 2/个 |
| 获得评论 | 1/个 |
| 关注他人 | 1 |
| 被关注 | 5 |
| 连续签到7天 | 额外20 |
| 连续签到30天 | 额外100 |

### 等级特权

| 特权 | 解锁等级 |
|------|---------|
| 发视频笔记 | `Tab` (4) |
| 自定义主页背景 | `Shift` (7) |
| 笔记置顶（Pi键） | `Shift` (10) |
| 专属客服通道 | `Ctrl` (12) |
| 优先内容审核 | `Ctrl` (15) |
| 社区治理投票权 | `Alt` (17) |
| 全站特殊标识 | `Space` (20) |

### 等级衰减机制

连续7天未登录：每日衰减当前经验的 1%

---

## 装备系统

### 装备类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 头像框 | 围绕头像的装饰 | 金框、彩虹框、霓虹框 |
| 头饰 | 头像上方的小装饰 | 皇冠、猫耳、光环 |
| 用户名样式 | 名字的颜色/字体/动画 | 渐变色、彩虹、霓虹 |
| 资料卡背景 | 个人主页背景 | 星空、赛博朋克、极简 |
| 聊天气泡 | 评论/消息的对话框样式 | 圆角、尖角、渐变 |

### 用户名样式类型

```json
// 纯色
{ "type": "solid", "color": "#FF6B6B" }

// 渐变色
{ "type": "gradient", "gradient": "linear-gradient(90deg, #667eea 0%, #764ba2 100%)" }

// 彩虹动态
{ "type": "rainbow", "animation": "rainbow-shift", "duration": "3s" }

// 闪烁金色
{ "type": "shimmer", "colors": ["#FFD700", "#FFA500", "#FFD700"], "animation": "shimmer", "duration": "2s" }

// 霓虹发光
{ "type": "neon", "color": "#00f3ff", "glow": "#00f3ff", "shadow": "0 0 10px #00f3ff, 0 0 20px #00f3ff" }

// 火焰效果
{ "type": "fire", "animation": "fire-text", "colors": ["#ff0000", "#ff7f00", "#ffff00"] }

// 组合效果
{ "type": "combo", "gradient": "linear-gradient(90deg, #f093fb 0%, #f5576c 100%)", "animation": "shimmer", "fontFamily": "'Segoe UI', sans-serif", "textShadow": "0 0 10px rgba(245,87,108,0.5)" }
```

### 稀有度体系

| 稀有度 | 颜色 | 获取方式 |
|--------|------|---------|
| Common 普通 | 灰色 | 默认、签到 |
| Rare 稀有 | 蓝色 | Pi键商店 |
| Epic 史诗 | 紫色 | Alpha键商店 |
| Legendary 传说 | 金色 | 活动限定、成就 |
| Mythic 神话 | 彩虹 | 全服唯一活动 |

---

## 任务系统

### 每日任务（每日刷新）

| 任务 | 要求 | 奖励 |
|------|------|------|
| 每日签到 | 登录并签到 | π 10-50 |
| 发布笔记 | 发布1篇笔记 | π 20 |
| 获得点赞 | 获得5个点赞 | π 10 |
| 浏览发现 | 浏览10篇笔记 | π 5 |
| 关注用户 | 关注1位用户 | π 5 |
| 分享笔记 | 分享1篇笔记 | π 15 |

### 每周任务（每周一刷新）

| 任务 | 要求 | 奖励 |
|------|------|------|
| 活跃达人 | 发布5篇笔记 | π 100 + α 1 |
| 社交达人 | 获得50个点赞 | π 80 |
| 连续签到 | 连续签到7天 | π 50 + α 1 |
| 评论互动 | 评论10篇笔记 | π 60 |

### 主线任务（一次性）

| 任务 | 要求 | 奖励 |
|------|------|------|
| 初来乍到 | 完善个人资料 | π 50 |
| 首次创作 | 发布第一篇笔记 | π 30 + 头像框 |
| 小有名气 | 获得100个粉丝 | π 200 + α 1 |
| 内容创作者 | 发布50篇笔记 | π 500 + α 2 |
| 社区之星 | 单篇笔记获得1000赞 | π 1000 + α 3 + 传说头像框 |

---

## 成就系统

### 成就分类

| 分类 | 说明 |
|------|------|
| 创作成就 | 与发布内容相关 |
| 社交成就 | 与互动相关 |
| 探索成就 | 与使用功能相关 |
| 稀有成就 | 极难达成 |

### 成就示例

| 成就名称 | 要求 | 奖励 |
|----------|------|------|
| 第一滴血 | 发布第一篇笔记 | π 30 |
| 点赞收割机 | 累计获得1000个点赞 | π 200 + α 1 |
| 收藏大师 | 累计被收藏100次 | π 300 + α 1 |
| 粉丝破千 | 拥有1000个粉丝 | π 500 + α 2 |
| 夜猫子 | 连续7天在23:00后发布笔记 | π 100 + α 1 |
| 早起的鸟儿 | 连续7天在7:00前签到 | π 100 + α 1 |
| 社交蝴蝶 | 关注100个用户 | π 150 |
| 评论达人 | 累计评论500条 | π 200 |
| 完美主义 | 连续30天发布笔记 | π 500 + α 2 |
| 社区守护者 | 举报10条违规并被采纳 | π 200 + α 2 |
| 传说创作者 | 单篇笔记获得10000赞 | α 5 + 神话头像框 |
| 一年之约 | 连续签到365天 | α 10 + 限定称号 |

---

## 后端数据表设计

### 用户经济表

```sql
CREATE TABLE user_economy (
  user_id VARCHAR(36) PRIMARY KEY,
  pi_keys INT DEFAULT 0 COMMENT 'Pi键',
  alpha_keys INT DEFAULT 0 COMMENT 'Alpha键',
  total_pi_earned INT DEFAULT 0,
  total_alpha_earned INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 用户等级表

```sql
CREATE TABLE user_levels (
  user_id VARCHAR(36) PRIMARY KEY,
  level INT DEFAULT 1,
  exp INT DEFAULT 0,
  total_exp INT DEFAULT 0,
  title VARCHAR(20) DEFAULT 'Esc',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 用户装备表

```sql
CREATE TABLE user_equipped (
  user_id VARCHAR(36) PRIMARY KEY,
  frame_id VARCHAR(50),
  accessory_id VARCHAR(50),
  name_style JSON,
  card_bg_id VARCHAR(50),
  chat_bubble_id VARCHAR(50),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 用户背包

```sql
CREATE TABLE user_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  item_id VARCHAR(50),
  item_type ENUM('frame', 'accessory', 'name_style', 'card_bg', 'chat_bubble'),
  name VARCHAR(100),
  rarity ENUM('common', 'rare', 'epic', 'legendary', 'mythic'),
  style_config JSON,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  equipped BOOLEAN DEFAULT FALSE,
  UNIQUE KEY uk_user_item (user_id, item_id)
);
```

### 道具商店

```sql
CREATE TABLE shop_items (
  item_id VARCHAR(50) PRIMARY KEY,
  item_type ENUM('frame', 'accessory', 'name_style', 'card_bg', 'chat_bubble'),
  name VARCHAR(100),
  description VARCHAR(255),
  rarity ENUM('common', 'rare', 'epic', 'legendary', 'mythic'),
  price_pi INT DEFAULT 0,
  price_alpha INT DEFAULT 0,
  style_config JSON,
  is_limited BOOLEAN DEFAULT FALSE,
  limited_end TIMESTAMP NULL,
  is_on_sale BOOLEAN DEFAULT TRUE
);
```

### 交易记录

```sql
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  currency ENUM('pi', 'alpha'),
  amount INT,
  type ENUM('earn', 'spend'),
  action VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 经验记录

```sql
CREATE TABLE exp_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  action VARCHAR(50),
  exp_gained INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 任务表

```sql
CREATE TABLE user_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  task_id VARCHAR(50),
  task_type ENUM('daily', 'weekly', 'main'),
  progress INT DEFAULT 0,
  target INT,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  reset_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 成就表

```sql
CREATE TABLE user_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36),
  achievement_id VARCHAR(50),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed BOOLEAN DEFAULT FALSE
);
```

---

## 前端组件设计

### UserAvatar.vue — 用户头像组件

```vue
<template>
  <div class="user-avatar" :class="[`size-${size}`, { 'has-frame': frame }]">
    <div v-if="frame" class="avatar-frame">
      <img :src="frame" alt="frame" />
    </div>
    <div v-if="accessory" class="avatar-accessory">
      <img :src="accessory" alt="accessory" />
    </div>
    <img :src="avatarUrl" :alt="nickname" class="avatar-img" />
    <div v-if="showLevel" class="avatar-level">
      <span class="level-badge">{{ levelTitle }}</span>
    </div>
  </div>
</template>
```

**尺寸规格：**
| size | 像素 | 使用场景 |
|------|------|---------|
| xs | 24px | 评论嵌套回复 |
| sm | 32px | 评论区、消息列表 |
| md | 40px | 笔记卡片作者、关注列表 |
| lg | 56px | 个人主页头部 |
| xl | 80px | 个人资料页 |

### UserName.vue — 用户名组件

```vue
<template>
  <span class="user-name" :class="nameClasses" :style="nameStyle">
    <span class="name-text">{{ displayName }}</span>
  </span>
</template>
```

支持样式：solid、gradient、rainbow、shimmer、neon、fire、combo

### UserCard.vue — 资料卡片组件

```vue
<template>
  <div class="user-card" :class="[`layout-${layout}`]">
    <UserAvatar :user="user" :size="avatarSize" show-level />
    <div class="card-info">
      <UserName :user="user" show-level />
      <div class="info-meta">
        <span>{{ user?.postCount || 0 }} 笔记</span>
        <span>{{ user?.followerCount || 0 }} 粉丝</span>
      </div>
    </div>
  </div>
</template>
```

---

## API 设计

### 经济相关

```javascript
// 获取用户经济信息
GET /api/user/economy
Response: { pi_keys, alpha_keys, total_pi_earned, total_alpha_earned }

// 获取交易记录
GET /api/user/transactions?type=earn&limit=20

// 购买道具
POST /api/shop/buy
Body: { item_id, currency: 'pi' | 'alpha' }
```

### 等级相关

```javascript
// 获取等级信息
GET /api/user/level
Response: { level, exp, total_exp, title, next_level_exp }

// 获取经验记录
GET /api/user/exp-records?limit=20
```

### 装备相关

```javascript
// 获取已装备
GET /api/user/equipped

// 获取背包
GET /api/user/inventory?type=name_style

// 装备道具
POST /api/user/equip
Body: { item_id }

// 获取商店列表
GET /api/shop/items?type=name_style&rarity=legendary
```

### 任务相关

```javascript
// 获取任务列表
GET /api/user/tasks
Response: { daily: [], weekly: [], main: [] }

// 领取任务奖励
POST /api/tasks/claim
Body: { task_id }
```

### 成就相关

```javascript
// 获取成就列表
GET /api/user/achievements
Response: { completed: [], in_progress: [] }

// 领取成就奖励
POST /api/achievements/claim
Body: { achievement_id }
```

---

## 实现路线图

### 第一阶段：基础系统
- [ ] 创建数据表
- [ ] 实现 Pi/Alpha 键发放逻辑
- [ ] 实现等级经验计算
- [ ] 用户行为触发奖励

### 第二阶段：装备系统
- [ ] 创建装备商店
- [ ] 实现购买/装备逻辑
- [ ] 前端头像框/头饰展示
- [ ] 用户名样式系统

### 第三阶段：任务成就
- [ ] 每日/每周任务系统
- [ ] 主线任务系统
- [ ] 成就系统
- [ ] 任务面板UI

### 第四阶段：高级功能
- [ ] 等级特权实现
- [ ] 排行榜系统
- [ ] 活动限定道具
- [ ] 社区治理投票
