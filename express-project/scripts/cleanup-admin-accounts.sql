-- 清理预设的管理员账号（不再使用账号密码登录）(PostgreSQL版本)

-- 删除预设管理员账号
DELETE FROM admin WHERE username IN ('content_admin', 'user_admin', 'operator');

-- 返回清理结果
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已删除预设管理员账号: content_admin, user_admin, operator (共 % 条记录)', deleted_count;
END $$;
