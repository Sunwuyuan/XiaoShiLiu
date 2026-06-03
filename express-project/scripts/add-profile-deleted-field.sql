-- ============================================================
-- 悦社社区 - 角色软删除字段迁移脚本 (PostgreSQL版本)
-- 说明: 添加 is_deleted 字段支持角色软删除
-- ============================================================

-- 添加 is_deleted 字段到 mc_profiles 表
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mc_profiles' AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE mc_profiles ADD COLUMN is_deleted SMALLINT DEFAULT 0;
        COMMENT ON COLUMN mc_profiles.is_deleted IS '是否已删除(0=正常,1=已软删除)';
        RAISE NOTICE '✅ is_deleted 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️ is_deleted 字段已存在，跳过';
    END IF;
END $$;

-- 添加索引
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'mc_profiles' AND indexname = 'idx_mc_profiles_user_deleted'
    ) THEN
        CREATE INDEX idx_mc_profiles_user_deleted ON mc_profiles(user_id, is_deleted);
        RAISE NOTICE '✅ idx_mc_profiles_user_deleted 索引已添加';
    ELSE
        RAISE NOTICE 'ℹ️ idx_mc_profiles_user_deleted 索引已存在，跳过';
    END IF;
END $$;

-- 验证
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'mc_profiles' AND column_name = 'is_deleted'
    ) THEN
        RAISE NOTICE '✅ is_deleted 字段验证通过';
    ELSE
        RAISE EXCEPTION '❌ is_deleted 字段添加失败';
    END IF;
END $$;
