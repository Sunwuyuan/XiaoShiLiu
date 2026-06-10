/**
 * 修复 user_equipped.name_style 字段类型
 * 从 json 改为 string，因为存的是 item_id
 */
exports.up = async function(knex) {
  // 先删除旧列
  await knex.schema.alterTable('user_equipped', (table) => {
    table.dropColumn('name_style');
  });

  // 添加新列（string 类型）
  await knex.schema.alterTable('user_equipped', (table) => {
    table.string('name_style', 50).nullable();
  });

  console.log('✅ user_equipped.name_style 已改为 string 类型');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('user_equipped', (table) => {
    table.dropColumn('name_style');
  });

  await knex.schema.alterTable('user_equipped', (table) => {
    table.json('name_style').nullable();
  });
};
