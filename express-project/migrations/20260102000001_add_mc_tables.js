exports.up = async function(knex) {
  await knex.schema.createTable('mc_profiles', (table) => {
    table.increments('id').primary().comment('主键ID');
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').comment('绑定的社区用户ID');
    table.string('player_name', 16).notNullable().unique().comment('玩家名称(可修改)');
    table.string('uuid', 36).notNullable().unique().comment('UUID v4格式，固定不变');
    table.string('password_hash', 255).notNullable().comment('bcrypt加密的独立密码');
    table.string('skin_url', 500).defaultTo(null).comment('皮肤URL');
    table.string('cape_url', 500).defaultTo(null).comment('披风URL');
    table.enum('skin_model', ['classic', 'slim']).defaultTo('classic').comment('皮肤模型类型');
    table.boolean('is_banned').defaultTo(false).comment('是否被封禁');
    table.timestamps(true, true);
    table.boolean('is_deleted').defaultTo(false).comment('是否已删除(软删除)');
  });

  await knex.schema.createTable('yggdrasil_tokens', (table) => {
    table.increments('id').primary().comment('主键ID');
    table.integer('profile_id').notNullable().references('id').inTable('mc_profiles').onDelete('CASCADE').comment('关联的MC角色ID');
    table.string('access_token', 255).notNullable().unique().comment('访问令牌');
    table.string('refresh_token', 255).notNullable().unique().comment('刷新令牌');
    table.string('client_token', 255).defaultTo(null).comment('客户端标识符');
    table.timestamp('expires_at').notNullable().comment('令牌过期时间');
    table.string('ip_address', 45).defaultTo(null).comment('登录IP地址');
    table.string('user_agent', 500).defaultTo(null).comment('客户端User-Agent');
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('创建时间');
    table.boolean('is_temporarily_invalidated').defaultTo(false).comment('是否暂时失效');
  });

  await knex.schema.createTable('mc_textures', (table) => {
    table.increments('id').primary().comment('主键ID');
    table.integer('profile_id').notNullable().references('id').inTable('mc_profiles').onDelete('CASCADE').comment('关联的MC角色ID');
    table.enum('texture_type', ['skin', 'cape']).notNullable().comment('纹理类型');
    table.unique(['profile_id', 'texture_type']);
    table.string('texture_hash', 64).notNullable().unique().comment('SHA256哈希值');
    table.string('file_path', 500).defaultTo(null).comment('本地存储路径');
    table.string('url', 500).defaultTo(null).comment('外部访问URL');
    table.jsonb('metadata').defaultTo(null).comment('额外元数据');
    table.timestamp('uploaded_at').defaultTo(knex.fn.now()).comment('上传时间');
  });

  await knex.schema.createTable('mc_audit_logs', (table) => {
    table.increments('id').primary().comment('主键ID');
    table.integer('profile_id').defaultTo(null).comment('关联的MC角色ID');
    table.bigInteger('user_id').defaultTo(null).comment('操作者社区用户ID');
    table.string('action', 50).notNullable().comment('操作类型枚举');
    table.string('ip_address', 45).defaultTo(null).comment('操作者IP地址');
    table.jsonb('details').defaultTo(null).comment('操作详情');
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('操作时间');
  });

  console.log('✅ MC 相关表创建完成');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('mc_audit_logs');
  await knex.schema.dropTableIfExists('mc_textures');
  await knex.schema.dropTableIfExists('yggdrasil_tokens');
  await knex.schema.dropTableIfExists('mc_profiles');
  console.log('✅ MC 相关表已删除');
};
