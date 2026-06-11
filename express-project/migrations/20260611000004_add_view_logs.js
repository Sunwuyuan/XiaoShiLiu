exports.up = async function(knex) {
  await knex.schema.createTable('view_logs', (table) => {
    table.increments('id').primary();
    table.string('post_id', 50).notNullable();
    table.string('user_id', 50).notNullable(); // 悦社号
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // 索引：用于快速查询用户今天是否浏览过某帖子
    table.index(['post_id', 'user_id', 'created_at'], 'idx_view_logs_post_user_date');
    table.index(['user_id', 'created_at'], 'idx_view_logs_user_date');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('view_logs');
};
