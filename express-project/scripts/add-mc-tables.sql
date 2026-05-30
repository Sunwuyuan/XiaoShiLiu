-- ============================================================
-- 悦社社区 - Minecraft 外置登录功能 数据库迁移脚本
-- 版本: v1.0.0
-- 创建日期: 2026-05-30
-- 说明: 创建MC游戏角色相关的4张数据表
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. MC角色表 (mc_profiles)
-- ----------------------------
DROP TABLE IF EXISTS `mc_profiles`;
CREATE TABLE `mc_profiles` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `user_id` BIGINT(20) NOT NULL COMMENT '绑定的社区用户ID',
  `player_name` VARCHAR(16) NOT NULL COMMENT '玩家名称(可修改)',
  `uuid` CHAR(36) NOT NULL COMMENT 'UUID v4格式，固定不变',
  `password_hash` VARCHAR(255) NOT NULL COMMENT 'bcrypt加密的独立密码',
  `skin_url` VARCHAR(500) DEFAULT NULL COMMENT '皮肤URL',
  `cape_url` VARCHAR(500) DEFAULT NULL COMMENT '披风URL',
  `skin_model` ENUM('classic', 'slim') DEFAULT 'classic' COMMENT '皮肤模型类型(classic=经典,slim=细手臂)',
  `is_banned` TINYINT(1) DEFAULT 0 COMMENT '是否被封禁(0=正常,1=封禁)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_uuid` (`uuid`),
  UNIQUE KEY `uk_player_name` (`player_name`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_banned` (`is_banned`),
  CONSTRAINT `fk_mc_profiles_user_id` 
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='悦社社区-MC游戏角色表';

-- ----------------------------
-- 2. Yggdrasil Token会话表 (yggdrasil_tokens)
-- ----------------------------
DROP TABLE IF EXISTS `yggdrasil_tokens`;
CREATE TABLE `yggdrasil_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `profile_id` INT NOT NULL COMMENT '关联的MC角色ID',
  `access_token` VARCHAR(255) NOT NULL COMMENT 'JWT访问令牌',
  `refresh_token` VARCHAR(255) NOT NULL COMMENT '刷新令牌',
  `client_token` VARCHAR(255) DEFAULT NULL COMMENT '客户端标识符',
  `expires_at` TIMESTAMP NOT NULL COMMENT '令牌过期时间',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT '登录IP地址(IPv6兼容)',
  `user_agent` VARCHAR(500) DEFAULT NULL COMMENT '客户端User-Agent',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_access_token` (`access_token`),
  UNIQUE KEY `uk_refresh_token` (`refresh_token`),
  KEY `idx_profile_id` (`profile_id`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_ip_address` (`ip_address`),
  CONSTRAINT `fk_yggdrasil_tokens_profile_id` 
    FOREIGN KEY (`profile_id`) REFERENCES `mc_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='悦社社区-Yggdrasil Token会话表';

-- ----------------------------
-- 3. 纹理记录表 (mc_textures)
-- ----------------------------
DROP TABLE IF EXISTS `mc_textures`;
CREATE TABLE `mc_textures` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `profile_id` INT NOT NULL COMMENT '关联的MC角色ID',
  `texture_type` ENUM('skin', 'cape') NOT NULL COMMENT '纹理类型(skin=皮肤,cape=披风)',
  `texture_hash` VARCHAR(64) NOT NULL COMMENT 'SHA256哈希值(用于去重)',
  `file_path` VARCHAR(500) DEFAULT NULL COMMENT '本地存储路径(local模式)',
  `url` VARCHAR(500) DEFAULT NULL COMMENT '外部访问URL(imagehost/r2模式)',
  `metadata` JSON DEFAULT NULL COMMENT '额外元数据(JSON格式:尺寸、模型等)',
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_texture_hash` (`texture_hash`),
  KEY `idx_profile_type` (`profile_id`, `texture_type`),
  KEY `idx_uploaded_at` (`uploaded_at`),
  CONSTRAINT `fk_mc_textures_profile_id` 
    FOREIGN KEY (`profile_id`) REFERENCES `mc_profiles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='悦社社区-MC皮肤/披风纹理记录表';

-- ----------------------------
-- 4. 操作审计日志表 (mc_audit_logs)
-- ----------------------------
DROP TABLE IF EXISTS `mc_audit_logs`;
CREATE TABLE `mc_audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `profile_id` INT DEFAULT NULL COMMENT '关联的MC角色ID(可为空，系统操作时为NULL)',
  `user_id` BIGINT(20) DEFAULT NULL COMMENT '操作者社区用户ID',
  `action` VARCHAR(50) NOT NULL COMMENT '操作类型枚举',
  `ip_address` VARCHAR(45) DEFAULT NULL COMMENT '操作者IP地址(IPv6兼容)',
  `details` JSON DEFAULT NULL COMMENT '操作详情(JSON格式)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_profile_id` (`profile_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_ip_address` (`ip_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
COLLATE=utf8mb4_unicode_ci 
COMMENT='悦社社区-MC游戏操作审计日志表';

SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------
-- 验证脚本执行结果
-- ----------------------------
SELECT '✅ mc_profiles 表创建成功' AS status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mc_profiles');
SELECT '✅ yggdrasil_tokens 表创建成功' AS status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yggdrasil_tokens');
SELECT '✅ mc_textures 表创建成功' AS status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mc_textures');
SELECT '✅ mc_audit_logs 表创建成功' AS status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mc_audit_logs');

-- 显示所有新创建表的统计信息
SELECT 
  TABLE_NAME AS '表名',
  TABLE_COMMENT AS '表说明',
  TABLE_ROWS AS '行数',
  ROUND(DATA_LENGTH/1024, 2) AS '数据大小(KB)'
FROM information_schema.tables 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('mc_profiles', 'yggdrasil_tokens', 'mc_textures', 'mc_audit_logs')
ORDER BY TABLE_NAME;
