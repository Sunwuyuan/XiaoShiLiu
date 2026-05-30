-- ============================================================
-- 悦社社区 - 清理MC游戏相关表（用于重新执行迁移）
-- 说明: 删除已存在的MC相关表，然后重新创建
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 删除所有MC相关的外键约束和表
DROP TABLE IF EXISTS `mc_audit_logs`;
DROP TABLE IF EXISTS `mc_textures`;
DROP TABLE IF EXISTS `yggdrasil_tokens`;
DROP TABLE IF EXISTS `mc_profiles`;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ 已清理完成，可以重新执行 add-mc-tables.sql' AS status;
