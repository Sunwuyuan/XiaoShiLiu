-- 安全迁移脚本 - 检查列是否存在再添加 (PostgreSQL版本)

-- 1. 添加 logto_id 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin' AND column_name = 'logto_id'
    ) THEN
        ALTER TABLE admin ADD COLUMN logto_id VARCHAR(128) DEFAULT NULL;
        COMMENT ON COLUMN admin.logto_id IS 'Logto用户唯一ID';
        RAISE NOTICE '✅ logto_id 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️ logto_id 列已存在，跳过';
    END IF;
END $$;

-- 2. 添加 permissions 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin' AND column_name = 'permissions'
    ) THEN
        ALTER TABLE admin ADD COLUMN permissions JSONB DEFAULT NULL;
        COMMENT ON COLUMN admin.permissions IS '权限列表';
        RAISE NOTICE '✅ permissions 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️ permissions 列已存在，跳过';
    END IF;
END $$;

-- 3. 添加 is_super 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin' AND column_name = 'is_super'
    ) THEN
        ALTER TABLE admin ADD COLUMN is_super SMALLINT DEFAULT 0;
        COMMENT ON COLUMN admin.is_super IS '是否超级管理员 1-是 0-否';
        RAISE NOTICE '✅ is_super 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️ is_super 列已存在，跳过';
    END IF;
END $$;

-- 4. 添加 created_by 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE admin ADD COLUMN created_by BIGINT DEFAULT NULL;
        COMMENT ON COLUMN admin.created_by IS '创建者管理员ID';
        RAISE NOTICE '✅ created_by 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️ created_by 列已存在，跳过';
    END IF;
END $$;

-- 5. 添加 updated_at 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE admin ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        COMMENT ON COLUMN admin.updated_at IS '更新时间';
        RAISE NOTICE '✅ updated_at 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️ updated_at 列已存在，跳过';
    END IF;
END $$;

-- 6. 添加 nickname 字段
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'admin' AND column_name = 'nickname'
    ) THEN
        ALTER TABLE admin ADD COLUMN nickname VARCHAR(100) DEFAULT NULL;
        COMMENT ON COLUMN admin.nickname IS '昵称';
        RAISE NOTICE '✅ nickname 字段已添加';
    ELSE
        RAISE NOTICE 'ℹ️ nickname 列已存在，跳过';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '所有迁移完成！';
END $$;
