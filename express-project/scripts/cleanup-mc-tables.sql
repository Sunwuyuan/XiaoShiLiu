-- ============================================================
-- 悦社社区 - 清理MC游戏相关表（用于重新执行迁移）(PostgreSQL版本)
-- 说明: 删除已存在的MC相关表，然后重新创建
-- ============================================================

-- 使用 CASCADE 删除表及其外键约束
DROP TABLE IF EXISTS mc_audit_logs CASCADE;
DROP TABLE IF EXISTS mc_textures CASCADE;
DROP TABLE IF EXISTS yggdrasil_tokens CASCADE;
DROP TABLE IF EXISTS mc_profiles CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ 已清理完成，可以重新执行 add-mc-tables.sql';
END $$;
