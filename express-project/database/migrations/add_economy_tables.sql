-- ============================================================
-- 经济系统数据库迁移
-- 创建经济系统相关的所有数据表
-- ============================================================

-- 用户经济表
CREATE TABLE IF NOT EXISTS user_economy (
  user_id VARCHAR(36) PRIMARY KEY,
  pi_keys INT DEFAULT 0,
  alpha_keys INT DEFAULT 0,
  total_pi_earned INT DEFAULT 0,
  total_alpha_earned INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户等级表
CREATE TABLE IF NOT EXISTS user_levels (
  user_id VARCHAR(36) PRIMARY KEY,
  level INT DEFAULT 1,
  exp INT DEFAULT 0,
  total_exp INT DEFAULT 0,
  title VARCHAR(20) DEFAULT 'Esc',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户装备表
CREATE TABLE IF NOT EXISTS user_equipped (
  user_id VARCHAR(36) PRIMARY KEY,
  frame_id VARCHAR(50) DEFAULT NULL,
  accessory_id VARCHAR(50) DEFAULT NULL,
  name_style JSON DEFAULT NULL,
  card_bg_id VARCHAR(50) DEFAULT NULL,
  chat_bubble_id VARCHAR(50) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 用户背包
CREATE TABLE IF NOT EXISTS user_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  item_type ENUM('frame', 'accessory', 'name_style', 'card_bg', 'chat_bubble') NOT NULL,
  name VARCHAR(100),
  rarity ENUM('common', 'rare', 'epic', 'legendary', 'mythic') DEFAULT 'common',
  style_config JSON DEFAULT NULL,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  equipped BOOLEAN DEFAULT FALSE,
  UNIQUE KEY uk_user_item (user_id, item_id),
  INDEX idx_user_id (user_id)
);

-- 道具商店
CREATE TABLE IF NOT EXISTS shop_items (
  item_id VARCHAR(50) PRIMARY KEY,
  item_type ENUM('frame', 'accessory', 'name_style', 'card_bg', 'chat_bubble') NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  rarity ENUM('common', 'rare', 'epic', 'legendary', 'mythic') DEFAULT 'common',
  price_pi INT DEFAULT 0,
  price_alpha INT DEFAULT 0,
  style_config JSON DEFAULT NULL,
  is_limited BOOLEAN DEFAULT FALSE,
  limited_end TIMESTAMP NULL,
  is_on_sale BOOLEAN DEFAULT TRUE
);

-- 交易记录
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  currency ENUM('pi', 'alpha') NOT NULL,
  amount INT NOT NULL,
  type ENUM('earn', 'spend') NOT NULL,
  action VARCHAR(50),
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- 经验记录
CREATE TABLE IF NOT EXISTS exp_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  action VARCHAR(50),
  exp_gained INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id)
);

-- 任务表
CREATE TABLE IF NOT EXISTS user_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  task_id VARCHAR(50) NOT NULL,
  task_type ENUM('daily', 'weekly', 'main') NOT NULL,
  progress INT DEFAULT 0,
  target INT DEFAULT 1,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  reset_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_task (user_id, task_id, task_type, DATE(reset_at)),
  INDEX idx_user_id (user_id)
);

-- 成就表
CREATE TABLE IF NOT EXISTS user_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  achievement_id VARCHAR(50) NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  claimed BOOLEAN DEFAULT FALSE,
  UNIQUE KEY uk_user_achievement (user_id, achievement_id),
  INDEX idx_user_id (user_id)
);
