-- 小石榴图文社区数据库初始化脚本 (PostgreSQL版本)
-- 创建数据库（如果不存在）- 需要在postgres数据库中执行
-- CREATE DATABASE xiaoshiliu ENCODING 'UTF8' LC_COLLATE 'en_US.utf8' LC_CTYPE 'en_US.utf8' TEMPLATE template0;
-- \c xiaoshiliu;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  password VARCHAR(255) DEFAULT NULL,
  user_id VARCHAR(50) NOT NULL UNIQUE,
  nickname VARCHAR(100) NOT NULL,
  email VARCHAR(100) DEFAULT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  bio TEXT DEFAULT NULL,
  location VARCHAR(100) DEFAULT NULL,
  follow_count INTEGER DEFAULT 0,
  fans_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  is_active SMALLINT DEFAULT 1,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gender VARCHAR(10) DEFAULT NULL,
  zodiac_sign VARCHAR(20) DEFAULT NULL,
  mbti VARCHAR(4) DEFAULT NULL,
  education VARCHAR(50) DEFAULT NULL,
  major VARCHAR(100) DEFAULT NULL,
  interests JSONB DEFAULT NULL,
  verified SMALLINT DEFAULT 0,
  logto_id VARCHAR(128) DEFAULT NULL UNIQUE
);
COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户ID';
COMMENT ON COLUMN users.password IS '密码';
COMMENT ON COLUMN users.user_id IS '小石榴号';
COMMENT ON COLUMN users.nickname IS '昵称';
COMMENT ON COLUMN users.email IS '邮箱';
COMMENT ON COLUMN users.avatar IS '头像URL';
COMMENT ON COLUMN users.bio IS '个人简介';
COMMENT ON COLUMN users.location IS 'IP属地';
COMMENT ON COLUMN users.follow_count IS '关注数';
COMMENT ON COLUMN users.fans_count IS '粉丝数';
COMMENT ON COLUMN users.like_count IS '获赞数';
COMMENT ON COLUMN users.is_active IS '是否激活';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.created_at IS '创建时间';
COMMENT ON COLUMN users.updated_at IS '更新时间';
COMMENT ON COLUMN users.gender IS '性别';
COMMENT ON COLUMN users.zodiac_sign IS '星座';
COMMENT ON COLUMN users.mbti IS 'MBTI人格类型';
COMMENT ON COLUMN users.education IS '学历';
COMMENT ON COLUMN users.major IS '专业';
COMMENT ON COLUMN users.interests IS '兴趣爱好（JSON数组）';
COMMENT ON COLUMN users.verified IS '认证状态：0-未认证，1-已认证';
COMMENT ON COLUMN users.logto_id IS 'Logto 用户唯一标识符';

CREATE INDEX IF NOT EXISTS idx_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_logto_id ON users(logto_id);

-- 创建updated_at自动更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为用户表添加触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. 管理员表
CREATE TABLE IF NOT EXISTS admin (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logto_id VARCHAR(128) DEFAULT NULL UNIQUE,
  permissions JSONB DEFAULT NULL,
  is_super SMALLINT DEFAULT 0,
  created_by BIGINT DEFAULT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  nickname VARCHAR(100) DEFAULT NULL,
  avatar VARCHAR(500) DEFAULT NULL
);
COMMENT ON TABLE admin IS '管理员表';
COMMENT ON COLUMN admin.id IS '管理员ID';
COMMENT ON COLUMN admin.username IS '管理员用户名';
COMMENT ON COLUMN admin.password IS '管理员密码';
COMMENT ON COLUMN admin.logto_id IS 'Logto用户唯一ID';
COMMENT ON COLUMN admin.permissions IS '权限列表';
COMMENT ON COLUMN admin.is_super IS '是否超级管理员 1-是 0-否';
COMMENT ON COLUMN admin.created_by IS '创建者管理员ID';
COMMENT ON COLUMN admin.updated_at IS '更新时间';
COMMENT ON COLUMN admin.nickname IS '昵称';
COMMENT ON COLUMN admin.avatar IS '头像';

CREATE INDEX IF NOT EXISTS idx_admin_username ON admin(username);

CREATE TRIGGER update_admin_updated_at BEFORE UPDATE ON admin
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. 分类表
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    category_title VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE categories IS '分类表';
COMMENT ON COLUMN categories.name IS '分类名称';
COMMENT ON COLUMN categories.category_title IS '分类英文标题，用于URL路径';
COMMENT ON COLUMN categories.created_at IS '创建时间';

CREATE UNIQUE INDEX IF NOT EXISTS uk_category_title ON categories(category_title) WHERE category_title IS NOT NULL;

-- 4. 笔记表
CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category_id INTEGER DEFAULT NULL,
  type INTEGER DEFAULT 1,
  view_count BIGINT DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  collect_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status SMALLINT DEFAULT 2,
  CONSTRAINT posts_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);
COMMENT ON TABLE posts IS '笔记表';
COMMENT ON COLUMN posts.id IS '笔记ID';
COMMENT ON COLUMN posts.user_id IS '发布用户ID';
COMMENT ON COLUMN posts.title IS '标题';
COMMENT ON COLUMN posts.content IS '内容';
COMMENT ON COLUMN posts.category_id IS '分类ID';
COMMENT ON COLUMN posts.type IS '笔记类型：1-图片笔记，2-视频笔记';
COMMENT ON COLUMN posts.view_count IS '浏览量';
COMMENT ON COLUMN posts.like_count IS '点赞数';
COMMENT ON COLUMN posts.collect_count IS '收藏数';
COMMENT ON COLUMN posts.comment_count IS '评论数';
COMMENT ON COLUMN posts.created_at IS '发布时间';
COMMENT ON COLUMN posts.status IS '笔记状态：0-发布（审核通过），1-草稿，2-待审核';

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_like_count ON posts(like_count);
CREATE INDEX IF NOT EXISTS idx_posts_category_created_at ON posts(category_id, created_at);

-- 5. 笔记图片表
CREATE TABLE IF NOT EXISTS post_images (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  CONSTRAINT post_images_ibfk_1 FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
COMMENT ON TABLE post_images IS '笔记图片表';
COMMENT ON COLUMN post_images.id IS '图片ID';
COMMENT ON COLUMN post_images.post_id IS '笔记ID';
COMMENT ON COLUMN post_images.image_url IS '图片URL';

CREATE INDEX IF NOT EXISTS idx_post_images_post_id ON post_images(post_id);

-- 6. 笔记视频表
CREATE TABLE IF NOT EXISTS post_videos (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL,
  cover_url VARCHAR(500) DEFAULT NULL,
  video_url VARCHAR(500) NOT NULL,
  CONSTRAINT post_videos_ibfk_1 FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
COMMENT ON TABLE post_videos IS '笔记视频表';
COMMENT ON COLUMN post_videos.id IS '视频ID';
COMMENT ON COLUMN post_videos.post_id IS '笔记ID';
COMMENT ON COLUMN post_videos.cover_url IS '视频封面URL';
COMMENT ON COLUMN post_videos.video_url IS '视频URL';

CREATE INDEX IF NOT EXISTS idx_post_videos_post_id ON post_videos(post_id);

-- 7. 标签表
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE tags IS '标签表';
COMMENT ON COLUMN tags.id IS '标签ID';
COMMENT ON COLUMN tags.name IS '标签名';
COMMENT ON COLUMN tags.use_count IS '使用次数';
COMMENT ON COLUMN tags.created_at IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON tags(use_count);

-- 8. 笔记标签关联表
CREATE TABLE IF NOT EXISTS post_tags (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, tag_id),
  CONSTRAINT post_tags_ibfk_1 FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_tags_ibfk_2 FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
COMMENT ON TABLE post_tags IS '笔记标签关联表';
COMMENT ON COLUMN post_tags.id IS '关联ID';
COMMENT ON COLUMN post_tags.post_id IS '笔记ID';
COMMENT ON COLUMN post_tags.tag_id IS '标签ID';
COMMENT ON COLUMN post_tags.created_at IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag_id ON post_tags(tag_id);

-- 9. 关注关系表
CREATE TABLE IF NOT EXISTS follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL,
  following_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id),
  CONSTRAINT follows_ibfk_1 FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT follows_ibfk_2 FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
);
COMMENT ON TABLE follows IS '关注关系表';
COMMENT ON COLUMN follows.id IS '关注ID';
COMMENT ON COLUMN follows.follower_id IS '关注者ID';
COMMENT ON COLUMN follows.following_id IS '被关注者ID';
COMMENT ON COLUMN follows.created_at IS '关注时间';

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_following ON follows(follower_id, following_id);

-- 10. 点赞表
CREATE TABLE IF NOT EXISTS likes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  target_type SMALLINT NOT NULL,
  target_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, target_type, target_id),
  CONSTRAINT likes_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
COMMENT ON TABLE likes IS '点赞表';
COMMENT ON COLUMN likes.id IS '点赞ID';
COMMENT ON COLUMN likes.user_id IS '用户ID';
COMMENT ON COLUMN likes.target_type IS '目标类型: 1-笔记, 2-评论';
COMMENT ON COLUMN likes.target_id IS '目标ID';
COMMENT ON COLUMN likes.created_at IS '点赞时间';

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_target_type ON likes(user_id, target_type, target_id);

-- 11. 收藏表
CREATE TABLE IF NOT EXISTS collections (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  post_id BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, post_id),
  CONSTRAINT collections_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT collections_ibfk_2 FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);
COMMENT ON TABLE collections IS '收藏表';
COMMENT ON COLUMN collections.id IS '收藏ID';
COMMENT ON COLUMN collections.user_id IS '用户ID';
COMMENT ON COLUMN collections.post_id IS '笔记ID';
COMMENT ON COLUMN collections.created_at IS '收藏时间';

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_post_id ON collections(post_id);

-- 12. 评论表
CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  parent_id BIGINT DEFAULT NULL,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT comments_ibfk_1 FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT comments_ibfk_2 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT comments_ibfk_3 FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);
COMMENT ON TABLE comments IS '评论表';
COMMENT ON COLUMN comments.id IS '评论ID';
COMMENT ON COLUMN comments.post_id IS '笔记ID';
COMMENT ON COLUMN comments.user_id IS '评论用户ID';
COMMENT ON COLUMN comments.parent_id IS '父评论ID';
COMMENT ON COLUMN comments.content IS '评论内容';
COMMENT ON COLUMN comments.like_count IS '点赞数';
COMMENT ON COLUMN comments.created_at IS '评论时间';

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- 13. 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  sender_id BIGINT NOT NULL,
  type SMALLINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  target_id BIGINT DEFAULT NULL,
  comment_id BIGINT DEFAULT NULL,
  is_read SMALLINT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT notifications_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT notifications_ibfk_2 FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_comment_id FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);
COMMENT ON TABLE notifications IS '通知表';
COMMENT ON COLUMN notifications.id IS '通知ID';
COMMENT ON COLUMN notifications.user_id IS '接收用户ID';
COMMENT ON COLUMN notifications.sender_id IS '发送用户ID';
COMMENT ON COLUMN notifications.type IS '通知类型: 1-点赞, 2-评论, 3-关注';
COMMENT ON COLUMN notifications.title IS '通知标题';
COMMENT ON COLUMN notifications.target_id IS '关联目标ID';
COMMENT ON COLUMN notifications.comment_id IS '关联评论ID，用于评论和回复通知';
COMMENT ON COLUMN notifications.is_read IS '是否已读';
COMMENT ON COLUMN notifications.created_at IS '通知时间';

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sender_id ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_comment_id ON notifications(comment_id);

-- 14. 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255) DEFAULT NULL,
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT DEFAULT NULL,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_sessions_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
COMMENT ON TABLE user_sessions IS '用户会话表';
COMMENT ON COLUMN user_sessions.id IS '会话ID';
COMMENT ON COLUMN user_sessions.user_id IS '用户ID';
COMMENT ON COLUMN user_sessions.token IS '访问令牌';
COMMENT ON COLUMN user_sessions.refresh_token IS '刷新令牌';
COMMENT ON COLUMN user_sessions.expires_at IS '过期时间';
COMMENT ON COLUMN user_sessions.user_agent IS '用户代理';
COMMENT ON COLUMN user_sessions.is_active IS '是否激活';
COMMENT ON COLUMN user_sessions.created_at IS '创建时间';
COMMENT ON COLUMN user_sessions.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. 管理员会话表
CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  refresh_token VARCHAR(255) DEFAULT NULL,
  expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT DEFAULT NULL,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT admin_sessions_ibfk_1 FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE CASCADE
);
COMMENT ON TABLE admin_sessions IS '管理员会话表';
COMMENT ON COLUMN admin_sessions.id IS '会话ID';
COMMENT ON COLUMN admin_sessions.admin_id IS '管理员ID';
COMMENT ON COLUMN admin_sessions.token IS '访问令牌';
COMMENT ON COLUMN admin_sessions.refresh_token IS '刷新令牌';
COMMENT ON COLUMN admin_sessions.expires_at IS '过期时间';
COMMENT ON COLUMN admin_sessions.user_agent IS '用户代理';
COMMENT ON COLUMN admin_sessions.is_active IS '是否激活';
COMMENT ON COLUMN admin_sessions.created_at IS '创建时间';
COMMENT ON COLUMN admin_sessions.updated_at IS '更新时间';

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

CREATE TRIGGER update_admin_sessions_updated_at BEFORE UPDATE ON admin_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 16. 审核表
CREATE TABLE IF NOT EXISTS audit (
  id BIGSERIAL PRIMARY KEY,
  admin_id BIGINT DEFAULT NULL,
  type SMALLINT NOT NULL,
  target_id BIGINT NOT NULL,
  remark TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  audit_time TIMESTAMP NULL DEFAULT NULL,
  status SMALLINT DEFAULT 0,
  CONSTRAINT audit_ibfk_1 FOREIGN KEY (admin_id) REFERENCES admin(id) ON DELETE SET NULL
);
COMMENT ON TABLE audit IS '审核表';
COMMENT ON COLUMN audit.id IS '审核ID';
COMMENT ON COLUMN audit.admin_id IS '审核人ID（管理员ID）';
COMMENT ON COLUMN audit.type IS '审核类型：1-用户个人审核，2-用户官方审核，3-内容审核，4-评论审核';
COMMENT ON COLUMN audit.target_id IS '目标ID：根据type不同，对应用户ID、笔记ID或评论ID';
COMMENT ON COLUMN audit.remark IS '审核备注';
COMMENT ON COLUMN audit.created_at IS '创建时间';
COMMENT ON COLUMN audit.audit_time IS '审核时间';
COMMENT ON COLUMN audit.status IS '审核状态：0-待审核，1-审核通过，2-审核拒绝';

CREATE INDEX IF NOT EXISTS idx_audit_admin_id ON audit(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit(type);
CREATE INDEX IF NOT EXISTS idx_audit_target_id ON audit(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_status ON audit(status);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_type_target ON audit(type, target_id);

-- 17. 用户认证表
CREATE TABLE IF NOT EXISTS user_verification (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL UNIQUE,
  type SMALLINT NOT NULL,
  status SMALLINT DEFAULT 0,
  real_name VARCHAR(200) NOT NULL,
  id_card VARCHAR(18) NOT NULL,
  contact_name VARCHAR(50) DEFAULT NULL,
  contact_phone VARCHAR(20) DEFAULT NULL,
  title VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_verification_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
COMMENT ON TABLE user_verification IS '用户认证表';
COMMENT ON COLUMN user_verification.id IS '主键ID';
COMMENT ON COLUMN user_verification.user_id IS '用户ID';
COMMENT ON COLUMN user_verification.type IS '认证类型：1=官方认证 2=个人认证';
COMMENT ON COLUMN user_verification.status IS '认证状态：0=待审核 1=已通过 2=已拒绝';
COMMENT ON COLUMN user_verification.real_name IS '真实姓名/机构名称';
COMMENT ON COLUMN user_verification.id_card IS '身份证号/信用代码';
COMMENT ON COLUMN user_verification.contact_name IS '联系人姓名';
COMMENT ON COLUMN user_verification.contact_phone IS '联系电话';
COMMENT ON COLUMN user_verification.title IS '认证称号';
COMMENT ON COLUMN user_verification.description IS '认证理由';
COMMENT ON COLUMN user_verification.created_at IS '创建时间';

CREATE INDEX IF NOT EXISTS idx_user_verification_type ON user_verification(type);
CREATE INDEX IF NOT EXISTS idx_user_verification_status ON user_verification(status);

-- 18. 用户封禁表
CREATE TABLE IF NOT EXISTS user_ban (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  reason TEXT NOT NULL,
  end_time TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status SMALLINT DEFAULT 0,
  operator BIGINT NOT NULL,
  CONSTRAINT user_ban_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
COMMENT ON TABLE user_ban IS '用户封禁表';
COMMENT ON COLUMN user_ban.id IS '封禁记录ID';
COMMENT ON COLUMN user_ban.user_id IS '用户ID';
COMMENT ON COLUMN user_ban.reason IS '封禁原因';
COMMENT ON COLUMN user_ban.end_time IS '封禁结束时间';
COMMENT ON COLUMN user_ban.created_at IS '创建时间';
COMMENT ON COLUMN user_ban.status IS '状态：0=封禁中，1=管理员解封，2=自动解封，3=永久封禁，4=封禁撤销';
COMMENT ON COLUMN user_ban.operator IS '操作人ID';

CREATE INDEX IF NOT EXISTS idx_user_ban_user_id ON user_ban(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ban_status ON user_ban(status);
CREATE INDEX IF NOT EXISTS idx_user_ban_created_at ON user_ban(created_at);
CREATE INDEX IF NOT EXISTS idx_user_ban_operator ON user_ban(operator);

-- 插入默认管理员账户
-- 密码: 123456
INSERT INTO admin (username, password) 
VALUES ('admin', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92')
ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username;

-- 注意：默认数据插入请使用专门的数据生成脚本

-- 数据库初始化完成
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成！';
END $$;

SELECT COUNT(*) AS table_count FROM information_schema.tables WHERE table_schema = current_schema();
