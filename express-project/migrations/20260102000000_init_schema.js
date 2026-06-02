exports.up = async function(knex) {
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary();
    table.string('password', 255);
    table.string('user_id', 50).notNullable().unique();
    table.string('nickname', 100).notNullable();
    table.string('email', 100);
    table.string('avatar', 500);
    table.text('bio');
    table.string('location', 100);
    table.integer('follow_count').defaultTo(0);
    table.integer('fans_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.string('gender', 10);
    table.string('zodiac_sign', 20);
    table.string('mbti', 4);
    table.string('education', 50);
    table.string('major', 100);
    table.json('interests');
    table.boolean('verified').defaultTo(false);
  });

  await knex.schema.createTable('admin', (table) => {
    table.bigIncrements('id').primary();
    table.string('username', 50).notNullable().unique();
    table.string('logto_id', 128);
    table.json('permissions');
    table.smallint('is_super').nullable().defaultTo(0);
    table.bigInteger('created_by');
    table.string('nickname', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('categories', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.string('category_title', 50).unique();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('posts', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 200).notNullable();
    table.text('content').notNullable();
    table.integer('category_id').references('id').inTable('categories').onDelete('SET NULL');
    table.integer('type').defaultTo(1);
    table.bigInteger('view_count').defaultTo(0);
    table.integer('like_count').defaultTo(0);
    table.integer('collect_count').defaultTo(0);
    table.integer('comment_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.integer('status').defaultTo(2);
  });

  await knex.schema.createTable('post_images', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.string('image_url', 500).notNullable();
  });

  await knex.schema.createTable('post_videos', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.string('cover_url', 500);
    table.string('video_url', 500).notNullable();
  });

  await knex.schema.createTable('tags', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.integer('use_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('post_tags', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.integer('tag_id').notNullable().references('id').inTable('tags').onDelete('CASCADE');
    table.unique(['post_id', 'tag_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('follows', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('follower_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.bigInteger('following_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.unique(['follower_id', 'following_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('likes', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('target_type').notNullable();
    table.bigInteger('target_id').notNullable();
    table.unique(['user_id', 'target_type', 'target_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('collections', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.bigInteger('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.unique(['user_id', 'post_id']);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('comments', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.bigInteger('parent_id').references('id').inTable('comments').onDelete('CASCADE');
    table.text('content').notNullable();
    table.integer('like_count').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('notifications', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.bigInteger('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('type').notNullable();
    table.string('title', 200).notNullable();
    table.bigInteger('target_id');
    table.bigInteger('comment_id').references('id').inTable('comments').onDelete('CASCADE');
    table.boolean('is_read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_sessions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token', 255).notNullable().unique();
    table.string('refresh_token', 255);
    table.timestamp('expires_at');
    table.text('user_agent');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('admin_sessions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('admin_id').notNullable().references('id').inTable('admin').onDelete('CASCADE');
    table.string('token', 255).notNullable().unique();
    table.string('refresh_token', 255);
    table.timestamp('expires_at');
    table.text('user_agent');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('audit', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('admin_id').references('id').inTable('admin').onDelete('SET NULL');
    table.integer('type').notNullable();
    table.bigInteger('target_id').notNullable();
    table.text('remark');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('audit_time');
    table.integer('status').defaultTo(0);
  });

  await knex.schema.createTable('user_verification', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.integer('type').notNullable();
    table.integer('status').defaultTo(0);
    table.string('real_name', 200).notNullable();
    table.string('id_card', 18).notNullable();
    table.string('contact_name', 50);
    table.string('contact_phone', 20);
    table.string('title', 100);
    table.text('description');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('user_ban', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('reason').notNullable();
    table.timestamp('end_time');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.integer('status').defaultTo(0);
    table.bigInteger('operator').notNullable();
  });
};

exports.down = async function(knex) {
  const tables = [
    'user_ban',
    'user_verification',
    'audit',
    'admin_sessions',
    'user_sessions',
    'notifications',
    'comments',
    'collections',
    'likes',
    'follows',
    'post_tags',
    'tags',
    'post_videos',
    'post_images',
    'posts',
    'categories',
    'admin',
    'users'
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
