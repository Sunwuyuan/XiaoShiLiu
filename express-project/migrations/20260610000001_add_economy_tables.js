/**
 * 经济系统数据库迁移
 * 创建经济系统相关的所有数据表
 */

exports.up = async function(knex) {
  // 用户经济表
  const hasUserEconomy = await knex.schema.hasTable('user_economy');
  if (!hasUserEconomy) {
    await knex.schema.createTable('user_economy', (table) => {
      table.string('user_id', 36).primary();
      table.integer('pi_keys').defaultTo(0);
      table.integer('alpha_keys').defaultTo(0);
      table.integer('total_pi_earned').defaultTo(0);
      table.integer('total_alpha_earned').defaultTo(0);
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('✅ user_economy 表已创建');
  }

  // 用户等级表
  const hasUserLevels = await knex.schema.hasTable('user_levels');
  if (!hasUserLevels) {
    await knex.schema.createTable('user_levels', (table) => {
      table.string('user_id', 36).primary();
      table.integer('level').defaultTo(1);
      table.integer('exp').defaultTo(0);
      table.integer('total_exp').defaultTo(0);
      table.string('title', 20).defaultTo('Esc');
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('✅ user_levels 表已创建');
  }

  // 用户装备表
  const hasUserEquipped = await knex.schema.hasTable('user_equipped');
  if (!hasUserEquipped) {
    await knex.schema.createTable('user_equipped', (table) => {
      table.string('user_id', 36).primary();
      table.string('frame_id', 50).nullable();
      table.string('accessory_id', 50).nullable();
      table.json('name_style').nullable();
      table.string('card_bg_id', 50).nullable();
      table.string('chat_bubble_id', 50).nullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('✅ user_equipped 表已创建');
  }

  // 用户背包
  const hasUserInventory = await knex.schema.hasTable('user_inventory');
  if (!hasUserInventory) {
    await knex.schema.createTable('user_inventory', (table) => {
      table.increments('id').primary();
      table.string('user_id', 36).notNullable();
      table.string('item_id', 50).notNullable();
      table.enu('item_type', ['frame', 'accessory', 'name_style', 'card_bg', 'chat_bubble']).notNullable();
      table.string('name', 100);
      table.enu('rarity', ['common', 'rare', 'epic', 'legendary', 'mythic']).defaultTo('common');
      table.json('style_config').nullable();
      table.timestamp('acquired_at').defaultTo(knex.fn.now());
      table.boolean('equipped').defaultTo(false);
      table.unique(['user_id', 'item_id']);
      table.index('user_id');
    });
    console.log('✅ user_inventory 表已创建');
  }

  // 道具商店
  const hasShopItems = await knex.schema.hasTable('shop_items');
  if (!hasShopItems) {
    await knex.schema.createTable('shop_items', (table) => {
      table.string('item_id', 50).primary();
      table.enu('item_type', ['frame', 'accessory', 'name_style', 'card_bg', 'chat_bubble']).notNullable();
      table.string('name', 100).notNullable();
      table.string('description', 255);
      table.enu('rarity', ['common', 'rare', 'epic', 'legendary', 'mythic']).defaultTo('common');
      table.integer('price_pi').defaultTo(0);
      table.integer('price_alpha').defaultTo(0);
      table.json('style_config').nullable();
      table.boolean('is_limited').defaultTo(false);
      table.timestamp('limited_end').nullable();
      table.boolean('is_on_sale').defaultTo(true);
    });
    console.log('✅ shop_items 表已创建');
  }

  // 交易记录
  const hasTransactions = await knex.schema.hasTable('transactions');
  if (!hasTransactions) {
    await knex.schema.createTable('transactions', (table) => {
      table.increments('id').primary();
      table.string('user_id', 36).notNullable();
      table.enu('currency', ['pi', 'alpha']).notNullable();
      table.integer('amount').notNullable();
      table.enu('type', ['earn', 'spend']).notNullable();
      table.string('action', 50);
      table.string('description', 255);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('user_id');
      table.index('created_at');
    });
    console.log('✅ transactions 表已创建');
  }

  // 经验记录
  const hasExpRecords = await knex.schema.hasTable('exp_records');
  if (!hasExpRecords) {
    await knex.schema.createTable('exp_records', (table) => {
      table.increments('id').primary();
      table.string('user_id', 36).notNullable();
      table.string('action', 50);
      table.integer('exp_gained').defaultTo(0);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('user_id');
    });
    console.log('✅ exp_records 表已创建');
  }

  // 任务表
  const hasUserTasks = await knex.schema.hasTable('user_tasks');
  if (!hasUserTasks) {
    await knex.schema.createTable('user_tasks', (table) => {
      table.increments('id').primary();
      table.string('user_id', 36).notNullable();
      table.string('task_id', 50).notNullable();
      table.enu('task_type', ['daily', 'weekly', 'main']).notNullable();
      table.integer('progress').defaultTo(0);
      table.integer('target').defaultTo(1);
      table.boolean('completed').defaultTo(false);
      table.boolean('claimed').defaultTo(false);
      table.timestamp('reset_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.index('user_id');
    });
    console.log('✅ user_tasks 表已创建');
  }

  // 成就表
  const hasUserAchievements = await knex.schema.hasTable('user_achievements');
  if (!hasUserAchievements) {
    await knex.schema.createTable('user_achievements', (table) => {
      table.increments('id').primary();
      table.string('user_id', 36).notNullable();
      table.string('achievement_id', 50).notNullable();
      table.timestamp('completed_at').defaultTo(knex.fn.now());
      table.boolean('claimed').defaultTo(false);
      table.unique(['user_id', 'achievement_id']);
      table.index('user_id');
    });
    console.log('✅ user_achievements 表已创建');
  }

  // 创建自动更新时间戳的触发器函数（PostgreSQL 需要）
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  // 为用户经济表添加触发器
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_economy_updated_at'
      ) THEN
        CREATE TRIGGER trg_user_economy_updated_at
        BEFORE UPDATE ON user_economy
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$;
  `);

  // 为用户等级表添加触发器
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_levels_updated_at'
      ) THEN
        CREATE TRIGGER trg_user_levels_updated_at
        BEFORE UPDATE ON user_levels
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$;
  `);

  // 为用户装备表添加触发器
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_equipped_updated_at'
      ) THEN
        CREATE TRIGGER trg_user_equipped_updated_at
        BEFORE UPDATE ON user_equipped
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$;
  `);

  console.log('✅ 经济系统数据库迁移完成');
};

exports.down = async function(knex) {
  const tables = [
    'user_achievements',
    'user_tasks',
    'exp_records',
    'transactions',
    'shop_items',
    'user_inventory',
    'user_equipped',
    'user_levels',
    'user_economy'
  ];

  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }

  // 删除触发器函数
  await knex.raw(`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;`);

  console.log('✅ 经济系统数据库表已回滚');
};
