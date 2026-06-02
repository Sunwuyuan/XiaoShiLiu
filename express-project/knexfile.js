const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
let DB_TYPE = process.env.DB_TYPE || (NODE_ENV === 'production' ? 'pg' : 'pg');

if (DB_TYPE === 'sqlite' || DB_TYPE === 'sqlite3') {
  console.warn('⚠️  警告: SQLite 在 Windows 上可能需要编译环境，建议使用 PostgreSQL');
  DB_TYPE = 'sqlite3';
}

const getConfig = () => {
  const baseConfig = {
    client: DB_TYPE,
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      tableName: 'knex_migrations',
      extension: 'js'
    },
    seeds: {
      directory: path.join(__dirname, 'seeds')
    }
  };

  if (DB_TYPE === 'sqlite3') {
    return {
      ...baseConfig,
      connection: {
        filename: process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data', 'dev.sqlite3')
      },
      pool: { min: 2, max: 10 }
    };
  }

  if (DB_TYPE === 'pg') {
    return {
      ...baseConfig,
      connection: {
        host: process.env.PG_HOST || process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.PG_PORT || process.env.DB_PORT) || 5432,
        user: process.env.PG_USER || process.env.DB_USER || 'postgres',
        password: process.env.PG_PASSWORD || process.env.DB_PASSWORD || (() => {
          console.warn('⚠️  警告: 未设置数据库密码环境变量 (PG_PASSWORD/DB_PASSWORD)，请在 .env 文件中配置');
          return '';
        })(),
        database: process.env.PG_DATABASE || process.env.DB_NAME || 'xiaoshiliu'
      },
      pool: { min: 2, max: 10 }
    };
  }

  throw new Error(`不支持的数据库类型: ${DB_TYPE}`);
};

module.exports = getConfig;
