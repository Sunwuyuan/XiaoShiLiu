const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  await knex('admin').del();

  const hashedPassword = await bcrypt.hash('123456', 10);

  await knex('admin').insert([
    {
      username: 'admin',
      password: hashedPassword,
      is_super: true,
      nickname: '超级管理员'
    }
  ]);
};
