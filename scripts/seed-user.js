/**
 * FinSmart - Seed Script (PostgreSQL)
 * Creates a demo user directly in PostgreSQL.
 * 
 * Usage: node scripts/seed-user.js
 * 
 * Required env vars:
 *   DATABASE_URL or MONGODB_URI - PostgreSQL connection string
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const CONN_STR = process.env.DATABASE_URL || process.env.MONGODB_URI || 'postgresql://localhost:5432/finsmart';
const pool = new Pool({ connectionString: CONN_STR });

const DEMO_USER = {
  email: 'demo@finsmart.app',
  password: 'demo123',
  firstName: 'Demo',
  lastName: 'User',
};

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function createUser(userData) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  const client = await pool.connect();
  try {
    // Check if exists
    const { rows: existing } = await client.query('SELECT id FROM users WHERE email = $1', [userData.email.toLowerCase()]);
    if (existing.length > 0) {
      console.log(`⚠️  User "${userData.email}" already exists.`);
      return;
    }

    const { rows } = await client.query(
      `INSERT INTO users (email, password, first_name, last_name, is_verified, is_demo, preferences)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, email`,
      [userData.email.toLowerCase(), hashedPassword, userData.firstName, userData.lastName, true, true, JSON.stringify({})]
    );

    console.log(`✅ User created: ${rows[0].email}`);
    console.log(`   Password: ${userData.password}`);
    console.log(`   ID: ${rows[0].id}`);
  } finally {
    client.release();
  }
}

async function main() {
  console.log(`🔌 Connecting to PostgreSQL: ${CONN_STR.replace(/\/\/.*@/, '//***@')}...`);
  await pool.query('SELECT 1');
  console.log('✅ Connected.\n');

  const useDefaults = await ask('Use default demo user (demo@finsmart.app / demo123)? [Y/n]: ');

  if (useDefaults.toLowerCase() !== 'n') {
    await createUser(DEMO_USER);
  } else {
    const email = await ask('Email: ');
    const password = await ask('Password (min 6 chars): ');
    const firstName = await ask('First name: ');
    const lastName = await ask('Last name: ');
    if (password.length < 6) { console.error('❌ Password must be at least 6 characters.'); process.exit(1); }
    await createUser({ email, password, firstName, lastName });
  }

  await pool.end();
  console.log('\n👋 Done. You can now log in with these credentials.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
