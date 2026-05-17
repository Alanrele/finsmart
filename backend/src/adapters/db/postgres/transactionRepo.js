const pool = require('./pool');

/**
 * PostgreSQL Transaction Repository
 * Replaces mongoose transactionModel + TransactionRepo
 */

const transactionRepo = {
  // Find transactions by filter
  async find(filter) {
    const client = await pool.connect();
    try {
      const { where, params } = buildWhere(filter);
      const { rows } = await client.query(
        `SELECT * FROM transactions${where ? ' WHERE ' + where : ''} ORDER BY date DESC`,
        params
      );
      return rows.map(mapTransaction);
    } finally {
      client.release();
    }
  },

  // Find with query builder (supports .sort, .limit, .select, .exec)
  async findByFilter(filter, options = {}) {
    const client = await pool.connect();
    try {
      const { where, params } = buildWhere(filter);
      let sql = `SELECT * FROM transactions${where ? ' WHERE ' + where : ''}`;
      if (options.sort) {
        const orderCols = Object.entries(options.sort).map(([k, v]) => `${snakeCase(k)} ${v === -1 ? 'DESC' : 'ASC'}`);
        sql += ` ORDER BY ${orderCols.join(', ')}`;
      } else {
        sql += ' ORDER BY date DESC';
      }
      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
      }
      if (options.skip) {
        sql += ` OFFSET ${options.skip}`;
      }
      const { rows } = await client.query(sql, params);
      return rows.map(mapTransaction);
    } finally {
      client.release();
    }
  },

  // Find recent transactions for a user
  async findRecentForUser(userId, limit = 20) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC LIMIT $2',
        [String(userId), limit]
      );
      return rows.map(mapTransaction);
    } finally {
      client.release();
    }
  },

  // Create or update from email (upsert by messageId)
  async createOrUpdateFromEmail(criteria, updates) {
    const client = await pool.connect();
    try {
      const msgId = criteria.messageId;
      // Check existing
      const { rows: existing } = await client.query(
        'SELECT id FROM transactions WHERE message_id = $1',
        [msgId]
      );

      if (existing.length > 0) {
        // Update
        const setParts = [];
        const params = [];
        let idx = 1;
        for (const [key, value] of Object.entries(updates)) {
          if (key === '$setOnInsert' || key === '$set') continue;
          setParts.push(`${snakeCase(key)} = $${idx++}`);
          params.push(value);
        }
        // Also handle $set
        if (updates.$set) {
          for (const [key, value] of Object.entries(updates.$set)) {
            setParts.push(`${snakeCase(key)} = $${idx++}`);
            params.push(value);
          }
        }
        setParts.push(`updated_at = NOW()`);
        params.push(msgId);
        const { rows } = await client.query(
          `UPDATE transactions SET ${setParts.join(', ')} WHERE message_id = $${idx} RETURNING *`,
          params
        );
        return mapTransaction(rows[0]);
      } else {
        // Insert
        const insertData = {
          ...criteria,
          ...updates,
          ...(updates.$set || {}),
          ...(updates.$setOnInsert || {}),
        };
        return await this.create(insertData);
      }
    } finally {
      client.release();
    }
  },

  // Create a transaction
  async create(data) {
    const client = await pool.connect();
    try {
      const cols = ['user_id', 'message_id', 'amount', 'currency', 'type', 'category', 'description', 'date', 'raw_text'];
      const vals = [
        String(data.userId || data.user_id),
        data.messageId || data.message_id,
        data.amount,
        data.currency || 'PEN',
        data.type,
        data.category || 'other',
        data.description,
        data.date || new Date(),
        data.rawText || data.raw_text || '',
      ];
      const extraCols = ['subcategory', 'merchant', 'channel', 'operation_number', 'card_number', 'balance', 'location', 'is_processed'];
      const extraMap = { subcategory: 'subcategory', merchant: 'merchant', channel: 'channel', operationNumber: 'operation_number', cardNumber: 'card_number', balance: 'balance', location: 'location', isProcessed: 'is_processed' };

      let placeholders = cols.map((_, i) => `$${i + 1}`);
      let allCols = [...cols];
      let allVals = [...vals];
      let idx = cols.length + 1;

      for (const [camel, snake] of Object.entries(extraMap)) {
        if (data[camel] !== undefined) {
          allCols.push(snake);
          allVals.push(data[camel]);
          placeholders.push(`$${idx++}`);
        }
      }

      const { rows } = await client.query(
        `INSERT INTO transactions (${allCols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
        allVals
      );
      return mapTransaction(rows[0]);
    } finally {
      client.release();
    }
  },

  // Aggregate (simplified — supports $match, $group, $sort)
  async aggregate(pipeline) {
    const client = await pool.connect();
    try {
      let where = '';
      let params = [];
      let idx = 1;
      let groupBy = '';
      let select = '';
      let orderBy = '';

      for (const stage of pipeline) {
        if (stage.$match) {
          const result = buildWhere(stage.$match);
          where = result.where ? `WHERE ${result.where}` : '';
          params = result.params;
        }
        if (stage.$group) {
          const fields = stage.$group._id;
          if (typeof fields === 'object') {
            groupBy = Object.values(fields).map(f => {
              if (f === '$category') return 'category';
              if (f === '$type') return 'type';
              if (f.$year) return 'EXTRACT(YEAR FROM date)';
              if (f.$month) return 'EXTRACT(MONTH FROM date)';
              return f.replace('$', '');
            }).join(', ');
            select = groupBy.split(', ').map((g, i) => `${g} as _id_${i}`).join(', ');
          }
          if (stage.$group.totalAmount) select += ', SUM(amount) as total_amount';
          if (stage.$group.count) select += ', COUNT(*) as count';
          if (stage.$group.avgAmount) select += ', AVG(amount) as avg_amount';
        }
        if (stage.$sort) {
          const sortCol = Object.keys(stage.$sort)[0];
          const dir = stage.$sort[sortCol] === -1 ? 'DESC' : 'ASC';
          const col = sortCol === 'totalAmount' ? 'total_amount' : sortCol;
          orderBy = `ORDER BY ${col} ${dir}`;
        }
      }

      const sql = `SELECT ${select || '*'} FROM transactions ${where} ${groupBy ? `GROUP BY ${groupBy}` : ''} ${orderBy}`;
      const { rows } = await client.query(sql, params);
      return rows.map(r => ({
        ...r,
        _id: r._id_0 !== undefined ? r._id_0 : (r.category || r.type || undefined),
      }));
    } finally {
      client.release();
    }
  },

  // Delete transactions by user
  async deleteMany(filter) {
    const client = await pool.connect();
    try {
      const { where, params } = buildWhere(filter);
      const { rows } = await client.query(
        `DELETE FROM transactions${where ? ' WHERE ' + where : ''} RETURNING *`,
        params
      );
      return { deletedCount: rows.length };
    } finally {
      client.release();
    }
  },

  // Count documents
  async countDocuments(filter) {
    const client = await pool.connect();
    try {
      const { where, params } = buildWhere(filter);
      const { rows } = await client.query(
        `SELECT COUNT(*) as count FROM transactions${where ? ' WHERE ' + where : ''}`,
        params
      );
      return parseInt(rows[0].count);
    } finally {
      client.release();
    }
  },

  // Get monthly summary
  async getMonthlySummary(userId, year, month) {
    const client = await pool.connect();
    try {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      const { rows } = await client.query(
        `SELECT category, SUM(amount) as total_amount, COUNT(*) as count, AVG(amount) as avg_amount
         FROM transactions
         WHERE user_id = $1 AND date >= $2 AND date <= $3
         GROUP BY category
         ORDER BY total_amount DESC`,
        [String(userId), startDate, endDate]
      );
      return rows.map(r => ({
        _id: r.category,
        totalAmount: parseFloat(r.total_amount),
        count: parseInt(r.count),
        avgAmount: parseFloat(r.avg_amount),
      }));
    } finally {
      client.release();
    }
  },

  // Get spending trends
  async getSpendingTrends(userId, months = 6) {
    const client = await pool.connect();
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      const { rows } = await client.query(
        `SELECT EXTRACT(YEAR FROM date) as year, EXTRACT(MONTH FROM date) as month, category,
                SUM(amount) as total_amount, COUNT(*) as count
         FROM transactions
         WHERE user_id = $1 AND date >= $2 AND type IN ('debit','payment','withdrawal')
         GROUP BY year, month, category
         ORDER BY year, month`,
        [String(userId), startDate]
      );
      return rows.map(r => ({
        _id: { year: parseInt(r.year), month: parseInt(r.month), category: r.category },
        totalAmount: parseFloat(r.total_amount),
        count: parseInt(r.count),
      }));
    } finally {
      client.release();
    }
  },
};

// Helper: build WHERE clause from Mongoose-style filter object
function buildWhere(filter) {
  const parts = [];
  const params = [];
  let idx = 1;

  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null) continue;

    const col = snakeCase(key);

    if (typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
      if ('$gte' in value) {
        parts.push(`${col} >= $${idx++}`);
        params.push(value.$gte);
      }
      if ('$lte' in value) {
        parts.push(`${col} <= $${idx++}`);
        params.push(value.$lte);
      }
      if ('$lt' in value) {
        parts.push(`${col} < $${idx++}`);
        params.push(value.$lt);
      }
      if ('$in' in value) {
        parts.push(`${col} = ANY($${idx++}::varchar[])`);
        params.push(value.$in);
      }
      if ('$ne' in value) {
        parts.push(`${col} != $${idx++}`);
        params.push(value.$ne);
      }
    } else {
      parts.push(`${col} = $${idx++}`);
      params.push(typeof value === 'string' && col === 'user_id' ? String(value) : value);
    }
  }

  return { where: parts.join(' AND '), params };
}

function snakeCase(str) {
  return str.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
}

function mapTransaction(row) {
  if (!row) return null;
  const t = {
    ...row,
    _id: row.id,
    userId: row.user_id,
    messageId: row.message_id,
    amount: parseFloat(row.amount),
    operationNumber: row.operation_number,
    cardNumber: row.card_number,
    isProcessed: row.is_processed,
    rawText: row.raw_text,
    aiAnalysis: row.ai_analysis,
    balance: row.balance ? parseFloat(row.balance) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  t.toObject = function() { return { ...this }; };
  t.save = async function() { return transactionRepo.save(this); };
  return t;
}

// Find one transaction
  async findOne(filter) {
    const results = await this.findByFilter(filter, { limit: 1 });
    return results[0] || null;
  },

  // Check if any document matches filter
  async exists(filter) {
    const count = await this.countDocuments(filter);
    return count > 0;
  },

  // Save an existing transaction (update by id)
  async save(transaction) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `UPDATE transactions SET amount=$1, type=$2, category=$3, subcategory=$4, description=$5, merchant=$6, location=$7, raw_text=$8, updated_at=NOW() WHERE id=$9 RETURNING *`,
        [transaction.amount, transaction.type, transaction.category, transaction.subcategory, transaction.description, transaction.merchant, transaction.location, transaction.rawText, transaction._id]
      );
      return rows[0] ? mapTransaction(rows[0]) : null;
    } finally {
      client.release();
    }
  },
};

// Static methods (Mongoose-style)
transactionRepo.getMonthlySummary = transactionRepo.getMonthlySummary;
transactionRepo.getSpendingTrends = transactionRepo.getSpendingTrends;
transactionRepo.findOne = transactionRepo.findOne;
transactionRepo.exists = transactionRepo.exists;
transactionRepo.save = transactionRepo.save;

module.exports = transactionRepo;
