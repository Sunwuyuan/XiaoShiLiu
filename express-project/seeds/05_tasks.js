/**
 * 任务种子数据
 * 给所有现有用户初始化每日任务
 */

exports.seed = async function(knex) {
  // 每日任务定义
  const dailyTasks = [
    { task_id: 'daily_login',   task_type: 'daily',  target: 1 },
    { task_id: 'daily_like',    task_type: 'daily',  target: 3 },
    { task_id: 'daily_comment', task_type: 'daily',  target: 1 },
    { task_id: 'daily_share',   task_type: 'daily',  target: 1 },
    { task_id: 'daily_browse',  task_type: 'daily',  target: 10 },
  ];

  // 每周任务定义
  const weeklyTasks = [
    { task_id: 'weekly_post',     task_type: 'weekly', target: 2 },
    { task_id: 'weekly_comment5', task_type: 'weekly', target: 5 },
    { task_id: 'weekly_like10',   task_type: 'weekly', target: 10 },
    { task_id: 'weekly_login5',   task_type: 'weekly', target: 5 },
  ];

  // 主线任务定义
  const mainTasks = [
    { task_id: 'main_first_post', task_type: 'main', target: 1 },
    { task_id: 'main_post5',      task_type: 'main', target: 5 },
    { task_id: 'main_post20',     task_type: 'main', target: 20 },
    { task_id: 'main_post50',     task_type: 'main', target: 50 },
    { task_id: 'main_comment10',  task_type: 'main', target: 10 },
    { task_id: 'main_like100',    task_type: 'main', target: 100 },
    { task_id: 'main_fans50',     task_type: 'main', target: 50 },
    { task_id: 'main_level5',     task_type: 'main', target: 1 },
    { task_id: 'main_level10',    task_type: 'main', target: 1 },
  ];

  const allTaskDefs = [...dailyTasks, ...weeklyTasks, ...mainTasks];

  // 获取所有用户
  const users = await knex('users').select('user_id');
  if (!users.length) {
    console.log('⚠️ 没有用户，跳过任务种子数据');
    return;
  }

  let insertedCount = 0;

  for (const user of users) {
    for (const taskDef of allTaskDefs) {
      // 检查是否已存在
      const existing = await knex('user_tasks')
        .where({ user_id: user.user_id, task_id: taskDef.task_id, task_type: taskDef.task_type })
        .first();

      if (!existing) {
        await knex('user_tasks').insert({
          user_id: user.user_id,
          task_id: taskDef.task_id,
          task_type: taskDef.task_type,
          progress: 0,
          target: taskDef.target,
          completed: false,
          claimed: false,
          created_at: knex.fn.now(),
        });
        insertedCount++;
      }
    }
  }

  console.log(`✅ 任务种子数据插入完成，新增 ${insertedCount} 条任务记录（${users.length} 个用户）`);
};
