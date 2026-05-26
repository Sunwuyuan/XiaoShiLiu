/**
 * 启动配置验证脚本
 * 在服务器启动前验证所有必需的配置
 */

const fs = require('fs');
const path = require('path');

console.log('服务器启动前配置检查');

let hasError = false;

// 1. 检查 .env 文件
const envPath = path.resolve(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');

  // 检查必需的环境变量
  const requiredVars = ['JWT_SECRET', 'DB_HOST', 'DB_NAME'];

  for (const varName of requiredVars) {
    const regex = new RegExp(`^${varName}=(.+)`, 'm');
    const match = envContent.match(regex);

    if (match) {
      const value = match[1].trim();
      if (value === '' || value.includes('your_') || value === 'undefined') {
        console.log(`错误: ${varName} 未正确设置 (值: "${value}")`);
        hasError = true;
      }
    } else {
      console.log(`错误: ${varName} 未找到`);
      hasError = true;
    }
  }
} else {
  console.log('错误: .env 文件不存在');
  console.log('请确保在项目根目录有 .env 文件');
  hasError = true;
}

// 2. 检查 node_modules
const nodeModulesPath = path.resolve(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('错误: node_modules 目录不存在，请先运行 npm install');
  hasError = true;
}

// 3. 检查 uploads 目录
const uploadsPath = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
  } catch (err) {
    console.error('创建uploads目录失败:', err.message);
  }
}

// 输出结果
if (hasError) {
  console.log('配置检查失败，请修复上述错误后再启动服务器');
  process.exit(1);
} else {
  console.log('所有配置检查通过');
}

module.exports = { hasError };