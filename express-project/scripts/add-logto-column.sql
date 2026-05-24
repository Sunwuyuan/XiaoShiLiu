-- 小石榴图文社区 - 添加 Logto 支持的数据库迁移脚本

USE `xiaoshiliu`;

-- 为 users 表添加 logto_id 字段
ALTER TABLE `users` 
ADD COLUMN IF NOT EXISTS `logto_id` VARCHAR(128) 
DEFAULT NULL 
COMMENT 'Logto 用户唯一标识符'
AFTER `id`;

-- 为 logto_id 添加唯一索引
ALTER TABLE `users` 
ADD UNIQUE KEY IF NOT EXISTS `idx_logto_id` (`logto_id`);
