-- ============================================================
-- 悦社社区 - Token 暂时失效状态字段迁移脚本 (PostgreSQL版本)
-- 版本: v1.1.0
-- 说明: 添加 is_temporarily_invalidated 字段支持角色改名后 Token 暂时失效
-- ============================================================

-- 添加 is_temporarily_invalidated 字段到 yggdrasil_tokens 表
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'yggdrasil_tokens' AND column_name = 'is_temporarily_invalidated'
    ) THEN
        ALTER TABLE yggdrasil_tokens ADD COLUMN is_temporarily_invalidated SMALLINT DEFAULT 0;
        COMMENT ON COLUMN yggdrasil_tokens.is_temporarily_invalidated IS '是否暂时失效(0=正常,1=暂时失效，角色改名后设置)';
        RAISE NOTICE '✅ is_temporarily_invalidated 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️ is_temporarily_invalidated 字段已存在，跳过';
    END IF;
END $$;

-- 添加索引优化查询
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'yggdrasil_tokens' AND indexname = 'idx_yggdrasil_tokens_invalidated'
    ) THEN
        CREATE INDEX idx_yggdrasil_tokens_invalidated ON yggdrasil_tokens(is_temporarily_invalidated);
        RAISE NOTICE '✅ idx_yggdrasil_tokens_invalidated 索引已添加';
    ELSE
        RAISE NOTICE 'ℹ️ idx_yggdrasil_tokens_invalidated 索引已存在，跳过';
    END IF;
END $$;

-- 验证
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'yggdrasil_tokens' AND column_name = 'is_temporarily_invalidated'
    ) THEN
        RAISE NOTICE '✅ is_temporarily_invalidated 字段验证通过';
    ELSE
        RAISE EXCEPTION '❌ is_temporarily_invalidated 字段添加失败';
    END IF;
END $$;
