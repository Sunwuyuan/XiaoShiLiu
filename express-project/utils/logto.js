const { LogtoNodeClient, NodeClientStorageAdapter } = require('@logto/node');
const config = require('../config/config');

// 内存存储用于 Logto 会话
class MemoryStorage {
  constructor() {
    this.data = {};
  }

  async set(key, value) {
    this.data[key] = value;
  }

  async get(key) {
    return this.data[key];
  }

  async delete(key) {
    delete this.data[key];
  }
}

const storage = new MemoryStorage();

// 创建 Logto 客户端
let logtoClient;

const getLogtoClient = () => {
  if (!logtoClient) {
    logtoClient = new LogtoNodeClient({
      endpoint: config.logto.endpoint,
      appId: config.logto.appId,
      appSecret: config.logto.appSecret,
      storage: new NodeClientStorageAdapter(storage),
    });
  }
  return logtoClient;
};

module.exports = {
  getLogtoClient,
  MemoryStorage
};
