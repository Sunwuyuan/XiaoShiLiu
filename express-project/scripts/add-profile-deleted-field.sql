-- ============================================================
-- 悦社社区 - 角色软删除字段迁移脚本
-- 说明: 添加 is_deleted 字段支持角色软删除
-- ============================================================

SET NAMES utf8mb4;

-- 添加 is_deleted 字段到 mc_profiles 表
ALTER TABLE `mc_profiles`
ADD COLUMN `is_deleted` TINYINT(1) DEFAULT 0 COMMENT '是否已删除(0=正常,1=已软删除)' AFTER `is_banned`;

-- 添加索引
ALTER TABLE `mc_profiles`
ADD KEY `idx_user_deleted` (`user_id`, `is_deleted`);

-- 验证
SELECT '✅ is_deleted 字段添加成功' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'mc_profiles'
  AND column_name = 'is_deleted'
);
