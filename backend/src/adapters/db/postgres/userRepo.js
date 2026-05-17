const pool = require('./pool');
const bcrypt = require('bcryptjs');

/**
 * PostgreSQL User Repository
 * Replaces Mongoose userModel — maintains compatible API where possible.
 */

const userRepo = {
  // Find user by query object (supports: { email }, { _id: id }, { microsoftId: id })
  async findOne(query) {
    const client = await pool.connect();
    try {
      if (query.email) {
        const { rows } = await client.query('SELECT * FROM users WHERE email = $1', [query.email.toLowerCase()]);
        return rows[0] ? mapUser(rows[0]) : null;
      }
      if (query._id || query.id) {
        const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [String(query._id || query.id)]);
        return rows[0] ? mapUser(rows[0]) : null;
      }
      if (query.$or) {
        const conditions = query.$or.map(c => {
          if (c.email) return `email = ${pool.escapeLiteral ? `'${c.email.toLowerCase()}'` : '$' + (1)}`;
          if (c.microsoftId) return `microsoft_id = '${c.microsoftId}'`;
          return '';
        }).filter(Boolean).join(' OR ');
        // Build parameterized
        const params = [];
        const clauses = query.$or.map(c => {
          if (c.email) { params.push(c.email.toLowerCase()); return `email = $${params.length}`; }
          if (c.microsoftId) { params.push(c.microsoftId); return `microsoft_id = $${params.length}`; }
          return '';
        }).filter(Boolean).join(' OR ');
        const { rows } = await client.query(`SELECT * FROM users WHERE ${clauses}`, params);
        return rows[0] ? mapUser(rows[0]) : null;
      }
      return null;
    } finally {
      client.release();
    }
  },

  // Find by ID
  async findById(id) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [String(id)]);
      return rows[0] ? mapUser(rows[0]) : null;
    } finally {
      client.release();
    }
  },

  // Create a new user
  async create(userData) {
    const client = await pool.connect();
    try {
      // Hash password if not already hashed
      let password = userData.password;
      if (password && !password.startsWith('$2a$') && !password.startsWith('$2b$')) {
        const salt = await bcrypt.genSalt(10);
        password = await bcrypt.hash(password, salt);
      }

      const { rows } = await client.query(
        `INSERT INTO users (email, password, first_name, last_name, microsoft_id, access_token, refresh_token, token_expiry, is_verified, is_demo, preferences, sync_enabled)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          userData.email.toLowerCase(),
          password,
          userData.firstName || userData.first_name || '',
          userData.lastName || userData.last_name || '',
          userData.microsoftId || userData.microsoft_id || null,
          userData.accessToken || userData.access_token || null,
          userData.refreshToken || userData.refresh_token || null,
          userData.tokenExpiry || userData.token_expiry || null,
          userData.isVerified ?? userData.is_verified ?? false,
          userData.isDemo ?? userData.is_demo ?? false,
          JSON.stringify(userData.preferences || {}),
          userData.syncEnabled ?? userData.sync_enabled ?? false,
        ]
      );
      return mapUser(rows[0]);
    } finally {
      client.release();
    }
  },

  // Update user by ID
  async findByIdAndUpdate(id, updates, options = {}) {
    const client = await pool.connect();
    try {
      const setClauses = [];
      const params = [];
      let paramIdx = 1;

      const fieldMap = {
        firstName: 'first_name', lastName: 'last_name',
        accessToken: 'access_token', refreshToken: 'refresh_token',
        tokenExpiry: 'token_expiry', isVerified: 'is_verified',
        microsoftId: 'microsoft_id', syncEnabled: 'sync_enabled',
        lastSync: 'last_sync',
      };

      // Handle $set
      const data = updates.$set || updates;
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined && updates.$unset && updates.$unset[key] !== undefined) continue;
        const col = fieldMap[key] || key;
        setClauses.push(`${col} = $${paramIdx++}`);
        params.push(value);
      }

      // Handle $unset
      if (updates.$unset) {
        for (const key of Object.keys(updates.$unset)) {
          const col = fieldMap[key] || key;
          setClauses.push(`${col} = NULL`);
        }
      }

      setClauses.push(`updated_at = NOW()`);

      const select = options.select ? options.select.replace('-password -accessToken -refreshToken', 'id, email, first_name, last_name, microsoft_id, is_verified, is_demo, preferences, sync_enabled, last_sync, created_at, updated_at') : '*';
      const cols = select === '*' ? '*' : select.split(' ').filter(s => !s.startsWith('-')).join(', ');

      const { rows } = await client.query(
        `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIdx} RETURNING ${cols}`,
        [...params, String(id)]
      );
      return rows[0] ? mapUser(rows[0]) : null;
    } finally {
      client.release();
    }
  },

  // Find users matching a filter
  async find(filter) {
    const client = await pool.connect();
    try {
      let where = [];
      let params = [];
      let idx = 1;

      for (const [key, value] of Object.entries(filter)) {
        const col = { accessToken: 'access_token', syncEnabled: 'sync_enabled' }[key] || key;
        if (value && typeof value === 'object') {
          if (value.$exists !== undefined && value.$ne !== null) {
            where.push(`${col} IS NOT NULL`);
          }
        } else {
          where.push(`${col} = $${idx++}`);
          params.push(value);
        }
      }

      const sql = `SELECT * FROM users${where.length ? ' WHERE ' + where.join(' AND ') : ''}`;
      const { rows } = await client.query(sql, params);
      return rows.map(mapUser);
    } finally {
      client.release();
    }
  },

  // Delete user by ID
  async findByIdAndDelete(id) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query('DELETE FROM users WHERE id = $1 RETURNING *', [String(id)]);
      return rows[0] ? mapUser(rows[0]) : null;
    } finally {
      client.release();
    }
  },

  // Bulk update
  async updateMany(filter, update) {
    const client = await pool.connect();
    try {
      let where = [];
      let params = [];
      let idx = 1;

      for (const [key, value] of Object.entries(filter)) {
        const col = { accessToken: 'access_token' }[key] || key;
        where.push(`${col} = $${idx++}`);
        params.push(value);
      }

      const setClauses = [];
      if (update.$unset) {
        for (const key of Object.keys(update.$unset)) {
          const col = { accessToken: 'access_token', refreshToken: 'refresh_token', tokenExpiry: 'token_expiry' }[key] || key;
          setClauses.push(`${col} = NULL`);
        }
      }
      if (update.$set) {
        for (const [key, value] of Object.entries(update.$set)) {
          const col = { lastSync: 'last_sync', syncEnabled: 'sync_enabled' }[key] || key;
          setClauses.push(`${col} = $${idx++}`);
          params.push(value);
        }
      }

      const { rowCount } = await client.query(
        `UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW() WHERE ${where.join(' AND ')}`,
        params
      );
      return { modifiedCount: rowCount };
    } finally {
      client.release();
    }
  },

  // Count documents
  async countDocuments(filter) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT COUNT(*) as count FROM users');
      return parseInt(rows[0].count);
    } finally {
      client.release();
    }
  },

  // Special: for seed script — check existence and create
  async exists(email) {
    const user = await this.findOne({ email });
    return !!user;
  },
};

// Map snake_case DB row to camelCase (Mongoose-like)
function mapUser(row) {
  if (!row) return null;
  const user = {
    ...row,
    _id: row.id,
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    microsoftId: row.microsoft_id,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiry: row.token_expiry,
    isVerified: row.is_verified,
    isDemo: row.is_demo,
    syncEnabled: row.sync_enabled,
    lastSync: row.last_sync,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences || {},
  };
  // Methods
  user.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };
  user.save = async function() {
    // Simplified save — mainly for updating tokens
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `UPDATE users SET access_token=$1, refresh_token=$2, token_expiry=$3, microsoft_id=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
        [this.accessToken, this.refreshToken, this.tokenExpiry, this.microsoftId, this._id]
      );
      Object.assign(this, mapUser(rows[0]));
      return this;
    } finally {
      client.release();
    }
  };
  user.toJSON = function() {
    const obj = { ...this };
    delete obj.password;
    delete obj.accessToken;
    delete obj.refreshToken;
    delete obj.comparePassword;
    delete obj.save;
    delete obj.toJSON;
    return obj;
  };
  user.select = function(fields) {
    // Mock Mongoose select — returns self (fields filtered by caller)
    return this;
  };
  return user;
}

// Compatibility: export as if it were a Mongoose model
module.exports = userRepo;
