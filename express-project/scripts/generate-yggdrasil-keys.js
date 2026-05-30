/**
 * 生成 Yggdrasil RSA 签名密钥对
 * 用于角色属性的数字签名
 * 
 * 使用方法: node scripts/generate-yggdrasil-keys.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const KEYS_DIR = path.join(__dirname, '..', 'keys');
const PRIVATE_KEY_FILE = path.join(KEYS_DIR, 'yggdrasil-private.pem');
const PUBLIC_KEY_FILE = path.join(KEYS_DIR, 'yggdrasil-public.pem');

function generateKeyPair() {
  console.log('🔐 正在生成 Yggdrasil RSA 密钥对...');
  
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });
  
  return { privateKey, publicKey };
}

function saveKeys(privateKey, publicKey) {
  // 确保目录存在
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
    console.log(`📁 创建目录: ${KEYS_DIR}`);
  }
  
  // 保存私钥
  fs.writeFileSync(PRIVATE_KEY_FILE, privateKey);
  console.log(`✅ 私钥已保存: ${PRIVATE_KEY_FILE}`);
  
  // 保存公钥
  fs.writeFileSync(PUBLIC_KEY_FILE, publicKey);
  console.log(`✅ 公钥已保存: ${PUBLIC_KEY_FILE}`);
}

function main() {
  console.log('========================================');
  console.log('  Yggdrasil 签名密钥对生成工具');
  console.log('========================================\n');
  
  // 检查是否已存在密钥
  if (fs.existsSync(PRIVATE_KEY_FILE) || fs.existsSync(PUBLIC_KEY_FILE)) {
    console.log('⚠️  警告: 密钥文件已存在！');
    console.log('   重新生成将导致旧签名失效。');
    console.log('   如需重新生成，请手动删除 keys 目录下的文件。\n');
    console.log('   现有文件:');
    if (fs.existsSync(PRIVATE_KEY_FILE)) console.log(`   - ${PRIVATE_KEY_FILE}`);
    if (fs.existsSync(PUBLIC_KEY_FILE)) console.log(`   - ${PUBLIC_KEY_FILE}`);
    console.log('\n❌ 操作已取消');
    process.exit(1);
  }
  
  try {
    const { privateKey, publicKey } = generateKeyPair();
    saveKeys(privateKey, publicKey);
    
    console.log('\n========================================');
    console.log('  ✅ 密钥对生成成功！');
    console.log('========================================');
    console.log('\n请妥善保管私钥文件，不要泄露给他人。');
    console.log('公钥将在 API 元数据中公开，供客户端验证签名。');
    
  } catch (error) {
    console.error('\n❌ 生成密钥对失败:', error.message);
    process.exit(1);
  }
}

main();
