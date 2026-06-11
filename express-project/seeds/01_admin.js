const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  await knex('admin').del();

  const hashedPassword = await bcrypt.hash('123456', 10);

  // 检查 password 列是否存在（兼容迁移07删除password后的情况）
  const hasPasswordColumn = await knex.schema.hasColumn('admin', 'password');

  const adminData = {
    username: 'admin',
    is_super: 1,
    nickname: '超级管理员'
  };

  // 如果 password 列存在，则添加密码
  if (hasPasswordColumn) {
    adminData.password = hashedPassword;
  }

  await knex('admin').insert([adminData]);
};
