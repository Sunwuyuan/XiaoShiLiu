-- ============================================================
-- 悦社社区 - Token 暂时失效状态字段迁移脚本
-- 版本: v1.1.0
-- 说明: 添加 is_temporarily_invalidated 字段支持角色改名后 Token 暂时失效
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 添加 is_temporarily_invalidated 字段到 yggdrasil_tokens 表
ALTER TABLE `yggdrasil_tokens`
ADD COLUMN `is_temporarily_invalidated` TINYINT(1) DEFAULT 0 COMMENT '是否暂时失效(0=正常,1=暂时失效，角色改名后设置)' AFTER `expires_at`;

-- 添加索引优化查询
ALTER TABLE `yggdrasil_tokens`
ADD KEY `idx_invalidated` (`is_temporarily_invalidated`);

SET FOREIGN_KEY_CHECKS = 1;

-- 验证
SELECT '✅ is_temporarily_invalidated 字段添加成功' AS status 
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'yggdrasil_tokens' 
  AND column_name = 'is_temporarily_invalidated'
);
