exports.up = async function(knex) {
  // 添加 username 字段（Logto 用户名，用于 @提及）
  await knex.schema.alterTable('users', (table) => {
    table.string('username', 100).unique();
  });

  // 不自动填充已有用户的 username
  // username 会在用户下次登录时从 Logto 获取并保存
  // 如果 Logto 不返回 username，用户可以通过个人设置页面自行设置
};

exports.down = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('username');
  });
};
