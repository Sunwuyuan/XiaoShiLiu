const { getDB } = require('./db');

/**
 * 安全排序字段白名单
 * 防止SQL注入，只允许预定义的排序字段
 */
const ALLOWED_ORDER_FIELDS = {
  'created_at': 'created_at',
  'updated_at': 'updated_at',
  'id': 'id',
  'name': 'name',
  'title': 'title',
  'username': 'username',
  'nickname': 'nickname',
  'email': 'email',
  'like_count': 'like_count',
  'view_count': 'view_count',
  'comment_count': 'comment_count',
  'collect_count': 'collect_count',
  'follow_count': 'follow_count',
  'fans_count': 'fans_count',
  'use_count': 'use_count',
  'player_name': 'player_name',
  'expires_at': 'expires_at',
  'status': 'status',
  'sort_order': 'sort_order'
};

/**
 * 验证并构建安全的排序字符串
 * @param {string} orderBy - 原始排序字符串，如 "created_at DESC" 或 "name ASC"
 * @returns {Object} - { column: string, direction: string }
 */
function parseSafeOrderBy(orderBy) {
  if (!orderBy || typeof orderBy !== 'string') {
    return { column: 'created_at', direction: 'DESC' };
  }

  const parts = orderBy.trim().split(/\s+/);
  const field = parts[0].toLowerCase();
  const direction = parts[1] ? parts[1].toUpperCase() : 'DESC';

  // 验证字段是否在白名单中
  const safeColumn = ALLOWED_ORDER_FIELDS[field];
  if (!safeColumn) {
    console.warn(`[dbHelper] 不安全的排序字段: ${field}，使用默认排序 created_at DESC`);
    return { column: 'created_at', direction: 'DESC' };
  }

  // 验证排序方向
  const safeDirection = direction === 'ASC' ? 'ASC' : 'DESC';

  return { column: safeColumn, direction: safeDirection };
}

async function recordExists(table, field, value) {
  const db = getDB();
  const result = await db(table).where(field, value).first(1);
  return !!result;
}

async function recordsExist(table, field, values) {
  if (!values || values.length === 0) {
    return { existingCount: 0, missingValues: [] };
  }

  const db = getDB();
  const existingValues = await db(table).select(field).whereIn(field, values).then(rows => rows.map(row => row[field]));
  const missingValues = values.filter(value => !existingValues.includes(value));

  return {
    existingCount: existingValues.length,
    missingValues
  };
}

async function isUnique(table, field, value, excludeId = null) {
  const db = getDB();
  let query = db(table).where(field, value);

  if (excludeId) {
    query = query.whereNot('id', excludeId);
  }

  const result = await query.first(1);
  return !result;
}

async function createRecord(table, data) {
  const db = getDB();
  const result = await db(table).insert(data).returning('id');
  // PostgreSQL 返回 [{id: xxx}]，取第一个的 id
  const id = Array.isArray(result) && result.length > 0 ? result[0].id : result[0];
  return id;
}

async function updateRecord(table, id, data) {
  const db = getDB();
  if (id === undefined || id === null) {
    return 0;
  }
  const result = await db(table).where('id', id).update(data);
  return result;
}

async function deleteRecord(table, id) {
  const db = getDB();
  if (id === undefined || id === null) {
    return 0;
  }
  const result = await db(table).where('id', id).delete();
  return result;
}

async function deleteRecords(table, ids) {
  if (!ids || ids.length === 0) {
    return 0;
  }

  const db = getDB();
  const result = await db(table).whereIn('id', ids).delete();
  return result;
}

async function getRecord(table, id, fields = '*') {
  const db = getDB();
  if (id === undefined || id === null) {
    return null;
  }
  const result = await db(table).select(fields).where('id', id).first();
  return result || null;
}

async function getRecords(table, options = {}) {
  const {
    page = 1,
    limit = 20,
    where = '',
    params = [],
    orderBy = 'created_at DESC',
    fields = '*'
  } = options;

  const db = getDB();
  const offset = (page - 1) * limit;

  let query = db.table(table);

  if (where) {
    query = query.whereRaw(where, params);
  }

  const totalQuery = db.table(table);
  if (where) {
    totalQuery.whereRaw(where, params);
  }
  const [{ total }] = await totalQuery.count('* as total');

  // 使用安全的排序方式替代 orderByRaw
  const { column, direction } = parseSafeOrderBy(orderBy);

  const data = await query
    .select(fields)
    .orderBy(column, direction)
    .limit(limit)
    .offset(offset);

  return {
    data,
    total: parseInt(total),
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
}

/**
 * 级联删除 - 使用事务确保数据一致性
 * @param {Array} cascadeRules - 级联规则数组 [{table, field}, ...]
 * @param {Array|number} targetIds - 要删除的目标ID列表
 */
async function cascadeDelete(cascadeRules, targetIds) {
  const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
  const db = getDB();

  // 使用事务包裹所有删除操作
  await db.transaction(async (trx) => {
    for (const rule of cascadeRules) {
      const { table, field } = rule;
      await trx(table).whereIn(field, ids).delete();
    }
  });
}

module.exports = {
  recordExists,
  recordsExist,
  isUnique,
  createRecord,
  updateRecord,
  deleteRecord,
  deleteRecords,
  getRecord,
  getRecords,
  cascadeDelete,
  parseSafeOrderBy
};
