-- ============================================================
-- 悦社社区 - Minecraft 外置登录功能 数据库迁移脚本 (PostgreSQL版本)
-- 版本: v1.0.0
-- 创建日期: 2026-05-30
-- 说明: 创建MC游戏角色相关的4张数据表
-- ============================================================

-- 关闭外键约束检查（PostgreSQL使用session_replication_role）
SET session_replication_role = replica;

-- ----------------------------
-- 1. MC角色表 (mc_profiles)
-- ----------------------------
DROP TABLE IF EXISTS mc_audit_logs CASCADE;
DROP TABLE IF EXISTS mc_textures CASCADE;
DROP TABLE IF EXISTS yggdrasil_tokens CASCADE;
DROP TABLE IF EXISTS mc_profiles CASCADE;

CREATE TABLE mc_profiles (
  id SERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  player_name VARCHAR(16) NOT NULL,
  uuid CHAR(36) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  skin_url VARCHAR(500) DEFAULT NULL,
  cape_url VARCHAR(500) DEFAULT NULL,
  skin_model VARCHAR(10) DEFAULT 'classic' CHECK (skin_model IN ('classic', 'slim')),
  is_banned SMALLINT DEFAULT 0,
  is_deleted SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(uuid),
  UNIQUE(player_name)
);
COMMENT ON TABLE mc_profiles IS '悦社社区-MC游戏角色表';
COMMENT ON COLUMN mc_profiles.id IS '主键ID';
COMMENT ON COLUMN mc_profiles.user_id IS '绑定的社区用户ID';
COMMENT ON COLUMN mc_profiles.player_name IS '玩家名称(可修改)';
COMMENT ON COLUMN mc_profiles.uuid IS 'UUID v4格式，固定不变';
COMMENT ON COLUMN mc_profiles.password_hash IS 'bcrypt加密的独立密码';
COMMENT ON COLUMN mc_profiles.skin_url IS '皮肤URL';
COMMENT ON COLUMN mc_profiles.cape_url IS '披风URL';
COMMENT ON COLUMN mc_profiles.skin_model IS '皮肤模型类型(classic=经典,slim=细手臂)';
COMMENT ON COLUMN mc_profiles.is_banned IS '是否被封禁(0=正常,1=封禁)';
COMMENT ON COLUMN mc_profiles.is_deleted IS '是否已删除(0=正常,1=已软删除)';
COMMENT ON COLUMN mc_profiles.created_at IS '创建时间';
COMMENT ON COLUMN mc_profiles.updated_at IS '更新时间';

CREATE INDEX idx_mc_profiles_user_id ON mc_profiles(user_id);
CREATE INDEX idx_mc_profiles_is_banned ON mc_profiles(is_banned);
CREATE INDEX idx_mc_profiles_user_deleted ON mc_profiles(user_id, is_deleted);

ALTER TABLE mc_profiles
  ADD CONSTRAINT fk_mc_profiles_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE TRIGGER update_mc_profiles_updated_at BEFORE UPDATE ON mc_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------
-- 2. Yggdrasil Token会话表 (yggdrasil_tokens)
-- ----------------------------
CREATE TABLE yggdrasil_tokens (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  access_token VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255) NOT NULL UNIQUE,
  client_token VARCHAR(255) DEFAULT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  is_temporarily_invalidated SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE yggdrasil_tokens IS '悦社社区-Yggdrasil Token会话表';
COMMENT ON COLUMN yggdrasil_tokens.id IS '主键ID';
COMMENT ON COLUMN yggdrasil_tokens.profile_id IS '关联的MC角色ID';
COMMENT ON COLUMN yggdrasil_tokens.access_token IS 'JWT访问令牌';
COMMENT ON COLUMN yggdrasil_tokens.refresh_token IS '刷新令牌';
COMMENT ON COLUMN yggdrasil_tokens.client_token IS '客户端标识符';
COMMENT ON COLUMN yggdrasil_tokens.expires_at IS '令牌过期时间';
COMMENT ON COLUMN yggdrasil_tokens.ip_address IS '登录IP地址(IPv6兼容)';
COMMENT ON COLUMN yggdrasil_tokens.user_agent IS '客户端User-Agent';
COMMENT ON COLUMN yggdrasil_tokens.is_temporarily_invalidated IS '是否暂时失效(0=正常,1=暂时失效，角色改名后设置)';
COMMENT ON COLUMN yggdrasil_tokens.created_at IS '创建时间';

CREATE INDEX idx_yggdrasil_tokens_profile_id ON yggdrasil_tokens(profile_id);
CREATE INDEX idx_yggdrasil_tokens_expires_at ON yggdrasil_tokens(expires_at);
CREATE INDEX idx_yggdrasil_tokens_ip_address ON yggdrasil_tokens(ip_address);
CREATE INDEX idx_yggdrasil_tokens_invalidated ON yggdrasil_tokens(is_temporarily_invalidated);

ALTER TABLE yggdrasil_tokens
  ADD CONSTRAINT fk_yggdrasil_tokens_profile_id
  FOREIGN KEY (profile_id) REFERENCES mc_profiles(id) ON DELETE CASCADE;

-- ----------------------------
-- 3. 纹理记录表 (mc_textures)
-- ----------------------------
CREATE TABLE mc_textures (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  texture_type VARCHAR(10) NOT NULL CHECK (texture_type IN ('skin', 'cape')),
  texture_hash VARCHAR(64) NOT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  url VARCHAR(500) DEFAULT NULL,
  metadata JSONB DEFAULT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(profile_id, texture_type)
);
COMMENT ON TABLE mc_textures IS '悦社社区-MC皮肤/披风纹理记录表';
COMMENT ON COLUMN mc_textures.id IS '主键ID';
COMMENT ON COLUMN mc_textures.profile_id IS '关联的MC角色ID';
COMMENT ON COLUMN mc_textures.texture_type IS '纹理类型(skin=皮肤,cape=披风)';
COMMENT ON COLUMN mc_textures.texture_hash IS 'SHA256哈希值(用于去重)';
COMMENT ON COLUMN mc_textures.file_path IS '本地存储路径(local模式)';
COMMENT ON COLUMN mc_textures.url IS '外部访问URL(imagehost/r2模式)';
COMMENT ON COLUMN mc_textures.metadata IS '额外元数据(JSON格式:尺寸、模型等)';
COMMENT ON COLUMN mc_textures.uploaded_at IS '上传时间';

CREATE INDEX idx_mc_textures_profile_type ON mc_textures(profile_id, texture_type);
CREATE INDEX idx_mc_textures_uploaded_at ON mc_textures(uploaded_at);

ALTER TABLE mc_textures
  ADD CONSTRAINT fk_mc_textures_profile_id
  FOREIGN KEY (profile_id) REFERENCES mc_profiles(id) ON DELETE CASCADE;

-- ----------------------------
-- 4. 操作审计日志表 (mc_audit_logs)
-- ----------------------------
CREATE TABLE mc_audit_logs (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER DEFAULT NULL,
  user_id BIGINT DEFAULT NULL,
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  details JSONB DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE mc_audit_logs IS '悦社社区-MC游戏操作审计日志表';
COMMENT ON COLUMN mc_audit_logs.id IS '主键ID';
COMMENT ON COLUMN mc_audit_logs.profile_id IS '关联的MC角色ID(可为空，系统操作时为NULL)';
COMMENT ON COLUMN mc_audit_logs.user_id IS '操作者社区用户ID';
COMMENT ON COLUMN mc_audit_logs.action IS '操作类型枚举';
COMMENT ON COLUMN mc_audit_logs.ip_address IS '操作者IP地址(IPv6兼容)';
COMMENT ON COLUMN mc_audit_logs.details IS '操作详情(JSON格式)';
COMMENT ON COLUMN mc_audit_logs.created_at IS '操作时间';

CREATE INDEX idx_mc_audit_logs_profile_id ON mc_audit_logs(profile_id);
CREATE INDEX idx_mc_audit_logs_user_id ON mc_audit_logs(user_id);
CREATE INDEX idx_mc_audit_logs_action ON mc_audit_logs(action);
CREATE INDEX idx_mc_audit_logs_created_at ON mc_audit_logs(created_at);
CREATE INDEX idx_mc_audit_logs_ip_address ON mc_audit_logs(ip_address);

-- 恢复外键约束检查
SET session_replication_role = default;

-- ----------------------------
-- 验证脚本执行结果
-- ----------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mc_profiles') THEN
        RAISE NOTICE '✅ mc_profiles 表创建成功';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'yggdrasil_tokens') THEN
        RAISE NOTICE '✅ yggdrasil_tokens 表创建成功';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mc_textures') THEN
        RAISE NOTICE '✅ mc_textures 表创建成功';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mc_audit_logs') THEN
        RAISE NOTICE '✅ mc_audit_logs 表创建成功';
    END IF;
END $$;

-- 显示所有新创建表的统计信息
SELECT
  t.TABLE_NAME AS "表名",
  obj_description((t.TABLE_SCHEMA || '.' || t.TABLE_NAME)::regclass, 'pg_class') AS "表说明",
  pg_total_relation_size((t.TABLE_SCHEMA || '.' || t.TABLE_NAME)::regclass) / 1024 AS "数据大小(KB)"
FROM information_schema.tables t
WHERE t.TABLE_SCHEMA = current_schema()
AND t.TABLE_NAME IN ('mc_profiles', 'yggdrasil_tokens', 'mc_textures', 'mc_audit_logs')
ORDER BY t.TABLE_NAME;
