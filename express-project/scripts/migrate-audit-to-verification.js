const { getDB } = require('../utils/db');

function extractField(html, fieldName) {
  const regex = new RegExp(`<td[^>]*>${fieldName}</td>\\s*<td[^>]*>(.*?)</td>`, 'is');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function parsePersonalVerification(content) {
  return {
    real_name: extractField(content, '真实姓名'),
    id_card: extractField(content, '身份证号'),
    title: extractField(content, '职业/身份'),
    description: extractField(content, '认证理由')
  };
}

function parseOfficialVerification(content) {
  return {
    real_name: extractField(content, '机构/企业名称'),
    id_card: extractField(content, '统一社会信用代码'),
    contact_name: extractField(content, '联系人姓名'),
    contact_phone: extractField(content, '联系电话'),
    title: extractField(content, '机构/企业名称'),
    description: extractField(content, '认证理由')
  };
}

async function migrate() {
  try {
    console.log('========================================');
    console.log('⚠️  数据迁移工具 - 重要提示');
    console.log('========================================');
    console.log('1. 请确保在执行前已备份数据库');
    console.log('2. 此操作将从audit表迁移数据到user_verification表');
    console.log('3. 已存在的认证记录将被跳过');
    console.log('\n按回车键开始迁移，或按 Ctrl+C 取消...');
    
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    console.log('\n开始执行数据迁移...');
    console.log('========================================');
    
    const db = getDB();
    
    console.log('正在查询审核表中的认证记录...');
    const auditRecords = await db('audit')
      .select('id', 'type', 'target_id', 'content', 'status', 'created_at', 'audit_time')
      .whereIn('type', [1, 2]);

    console.log(`找到 ${auditRecords.length} 条认证记录`);

    if (auditRecords.length === 0) {
      console.log('没有需要迁移的记录');
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const record of auditRecords) {
      const { id, type, target_id, content, status, created_at } = record;

      const existing = await db('user_verification')
        .where('user_id', target_id.toString())
        .first();

      if (existing) {
        console.log(`用户 ${target_id} 已有认证记录，跳过`);
        skipCount++;
        continue;
      }

      let verificationData;
      if (type === 2) {
        verificationData = parsePersonalVerification(content);
      } else if (type === 1) {
        verificationData = parseOfficialVerification(content);
      } else {
        console.log(`未知的认证类型: ${type}，跳过`);
        skipCount++;
        continue;
      }

      if (!verificationData.real_name || !verificationData.id_card) {
        console.log(`记录 ${id} 缺少必要字段，跳过`);
        console.log(`  解析结果: ${JSON.stringify(verificationData)}`);
        errorCount++;
        continue;
      }

      try {
        await db('user_verification').insert({
          user_id: target_id.toString(),
          type: type,
          status: status,
          real_name: verificationData.real_name,
          id_card: verificationData.id_card,
          contact_name: verificationData.contact_name || null,
          contact_phone: verificationData.contact_phone || null,
          title: verificationData.title || null,
          description: verificationData.description || null,
          created_at: created_at
        });

        console.log(`用户 ${target_id} 认证记录迁移成功 (type=${type}, status=${status})`);
        successCount++;
      } catch (insertError) {
        console.error(`插入用户 ${target_id} 认证记录失败: ${insertError.message}`);
        errorCount++;
      }
    }

    console.log('\n迁移完成！');
    console.log(`成功: ${successCount} 条`);
    console.log(`跳过: ${skipCount} 条`);
    console.log(`失败: ${errorCount} 条`);
    console.log('\n========================================');
    console.log('迁移任务已完成');

  } catch (error) {
    console.error('迁移失败:', error.message);
    console.log('\n按回车键退出...');
    process.stdin.once('data', () => {
      process.exit(1);
    });
  }
}

migrate();
