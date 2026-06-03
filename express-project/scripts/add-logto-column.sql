-- 小石榴图文社区 - 添加 Logto 支持的数据库迁移脚本 (PostgreSQL版本)

-- 为 users 表添加 logto_id 字段（检查列是否存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'logto_id'
    ) THEN
        ALTER TABLE users ADD COLUMN logto_id VARCHAR(128) DEFAULT NULL;
        COMMENT ON COLUMN users.logto_id IS 'Logto 用户唯一标识符';
        RAISE NOTICE '✅ logto_id 列已添加';
    ELSE
        RAISE NOTICE 'ℹ️ logto_id 列已存在，跳过';
    END IF;
END $$;

-- 为 logto_id 添加唯一索引（检查索引是否存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'users' AND indexname = 'idx_logto_id'
    ) THEN
        CREATE UNIQUE INDEX idx_logto_id ON users(logto_id) WHERE logto_id IS NOT NULL;
        RAISE NOTICE '✅ logto_id 唯一索引已添加';
    ELSE
        RAISE NOTICE 'ℹ️ logto_id 索引已存在，跳过';
    END IF;
END $$;
