-- 设置第一个超级管理员 (PostgreSQL版本)
-- 请替换 :logto_user_id 为实际的 Logto 用户 ID
-- Logto 用户 ID 可以在 Logto 控制台 -> 用户管理 -> 用户详情中查看

-- 方式1：如果你已经有了第一个管理员账号
UPDATE admin
SET is_super = 1,
    logto_id = COALESCE(:logto_user_id, logto_id),
    nickname = COALESCE(NULLIF(:nickname, ''), '超级管理员'),
    permissions = NULL
WHERE id = 1;

-- 方式2：创建新的超级管理员（如果id=1的管理员不想用）
INSERT INTO admin (username, logto_id, nickname, is_super, permissions, created_at)
VALUES (
    COALESCE(:username, 'super_admin'),
    :logto_user_id,
    COALESCE(NULLIF(:nickname, ''), '超级管理员'),
    1,
    NULL,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE SET
    logto_id = EXCLUDED.logto_id,
    nickname = EXCLUDED.nickname,
    is_super = EXCLUDED.is_super,
    permissions = EXCLUDED.permissions;

-- 验证设置
SELECT id, username, nickname, is_super, logto_id FROM admin WHERE is_super = 1;
