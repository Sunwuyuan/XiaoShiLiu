exports.seed = async function(knex) {
  await knex('categories').del();

  await knex('categories').insert([
    { name: '学习', category_title: 'study' },
    { name: '校园', category_title: 'campus' },
    { name: '情感', category_title: 'emotion' },
    { name: '兴趣', category_title: 'hobby' },
    { name: '生活', category_title: 'life' },
    { name: '社交', category_title: 'social' },
    { name: '求助', category_title: 'help' },
    { name: '观点', category_title: 'opinion' },
    { name: '毕业', category_title: 'graduation' },
    { name: '职场', category_title: 'workplace' }
  ]);

  console.log('✅ 基础数据插入完成：10个分类');
};
