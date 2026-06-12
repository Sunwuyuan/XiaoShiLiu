/**
 * 聊天系统数据库迁移
 * 创建会话、会话成员和消息相关的数据表
 */

exports.up = async function(knex) {
  // 会话表
  await knex.schema.createTable('conversations', (table) => {
    table.bigIncrements('id').primary();
    table.string('type', 20).notNullable().checkIn(['private', 'group']);
    table.string('title', 100).nullable();
    table.text('avatar_url').nullable();
    table.bigInteger('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('last_message_at').defaultTo(knex.fn.now());
  });

  // 会话成员表
  await knex.schema.createTable('conversation_members', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 20).defaultTo('member').checkIn(['owner', 'admin', 'member']);
    table.string('nickname', 50).nullable();
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.integer('unread_count').defaultTo(0);
    table.boolean('is_muted').defaultTo(false);
    table.unique(['conversation_id', 'user_id']);
  });

  // 消息表
  await knex.schema.createTable('messages', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('conversation_id').notNullable().references('id').inTable('conversations').onDelete('CASCADE');
    table.bigInteger('sender_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('type', 20).notNullable().defaultTo('text').checkIn(['text', 'image', 'video', 'file', 'system']);
    table.text('content').notNullable();
    table.bigInteger('reply_to').nullable().references('id').inTable('messages').onDelete('SET NULL');
    table.timestamp('edited_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 索引
  await knex.schema.table('messages', (table) => {
    table.index(['conversation_id', 'created_at'], 'idx_messages_conv_created');
    table.index('sender_id', 'idx_messages_sender');
  });

  await knex.schema.table('conversation_members', (table) => {
    table.index('user_id', 'idx_conv_members_user');
    table.index('conversation_id', 'idx_conv_members_conv');
  });
};

exports.down = async function(knex) {
  const tables = [
    'messages',
    'conversation_members',
    'conversations'
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
