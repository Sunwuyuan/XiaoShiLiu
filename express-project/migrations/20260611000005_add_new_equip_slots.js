exports.up = async function(knex) {
  // 1. 给 user_equipped 添加新装备槽位
  await knex.schema.alterTable('user_equipped', (table) => {
    table.string('cursor_id', 50).nullable();
    table.string('enter_effect_id', 50).nullable();
    table.string('loading_screen_id', 50).nullable();
  });
  console.log('✅ user_equipped 已添加 cursor_id, enter_effect_id, loading_screen_id');

  // 2. 修改 user_inventory 的 item_type 枚举（PostgreSQL 需要特殊处理）
  // 先检查当前枚举值
  const enumResult = await knex.raw(`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_inventory_item_type_enum'
    ORDER BY e.enumsortorder;
  `);
  console.log('当前枚举值:', enumResult.rows.map(r => r.enumlabel));

  // PostgreSQL 不能直接修改枚举，需要创建新枚举并替换
  // 简单方案：删除旧枚举约束，改为字符串
  await knex.raw(`
    ALTER TABLE user_inventory
    ALTER COLUMN item_type TYPE VARCHAR(50)
    USING item_type::VARCHAR(50);
  `);
  console.log('✅ user_inventory.item_type 已改为 VARCHAR');

  // 3. 修改 shop_items 的 item_type 同样处理
  await knex.raw(`
    ALTER TABLE shop_items
    ALTER COLUMN item_type TYPE VARCHAR(50)
    USING item_type::VARCHAR(50);
  `);
  console.log('✅ shop_items.item_type 已改为 VARCHAR');

  // 4. 删除 shop_items 的 item_type check 约束（只允许旧5种类型）
  await knex.raw(`
    ALTER TABLE shop_items DROP CONSTRAINT IF EXISTS shop_items_item_type_check;
  `);
  console.log('✅ shop_items_item_type_check 约束已删除');

  // 5. 删除 user_inventory 的 item_type check 约束（如果存在）
  await knex.raw(`
    ALTER TABLE user_inventory DROP CONSTRAINT IF EXISTS user_inventory_item_type_check;
  `);
  console.log('✅ user_inventory_item_type_check 约束已删除');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('user_equipped', (table) => {
    table.dropColumn('cursor_id');
    table.dropColumn('enter_effect_id');
    table.dropColumn('loading_screen_id');
  });
};
