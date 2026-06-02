const { getDB } = require('./db');

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

  const data = await query
    .select(fields)
    .orderByRaw(orderBy)
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

async function cascadeDelete(cascadeRules, targetIds) {
  const ids = Array.isArray(targetIds) ? targetIds : [targetIds];
  const db = getDB();

  for (const rule of cascadeRules) {
    const { table, field } = rule;
    await db(table).whereIn(field, ids).delete();
  }
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
  cascadeDelete
};
