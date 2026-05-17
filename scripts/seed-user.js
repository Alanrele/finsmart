/**
 * FinSmart - Seed Script
 * Creates a demo user directly in MongoDB.
 * 
 * Usage: node scripts/seed-user.js
 * 
 * Required env vars:
 *   MONGODB_URI - MongoDB connection string
 *   JWT_SECRET  - JWT signing secret
 * 
 * The script will prompt for email and password,
 * or use defaults if MONGODB_URI is not set.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finsmart';

// Default demo user
const DEMO_USER = {
  email: 'demo@finsmart.app',
  password: 'demo123',
  firstName: 'Demo',
  lastName: 'User',
  isDemo: true,
  isVerified: true
};

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => { rl.close(); resolve(ans); }));
}

async function createUser(userData) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Define schema inline to avoid importing the full app
  const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    preferences: {
      theme: { type: String, default: 'dark' },
      currency: { type: String, default: 'PEN' },
      notifications: { email: { type: Boolean, default: true }, push: { type: Boolean, default: true } }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  const User = mongoose.model('User', userSchema);

  // Check if already exists
  const existing = await User.findOne({ email: userData.email });
  if (existing) {
    console.log(`⚠️  User "${userData.email}" already exists.`);
    return existing;
  }

  const user = await User.create({
    ...userData,
    password: hashedPassword
  });

  console.log(`✅ User created: ${user.email}`);
  console.log(`   Password: ${userData.password}`);
  console.log(`   ID: ${user._id}`);
  return user;
}

async function main() {
  console.log(`🔌 Connecting to MongoDB: ${MONGO_URI.replace(/\/\/.*@/, '//***@')}...`);
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected.\n');

  const useDefaults = await ask('Use default demo user (demo@finsmart.app / demo123)? [Y/n]: ');

  if (useDefaults.toLowerCase() !== 'n') {
    await createUser(DEMO_USER);
  } else {
    const email = await ask('Email: ');
    const password = await ask('Password (min 6 chars): ');
    const firstName = await ask('First name: ');
    const lastName = await ask('Last name: ');

    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters.');
      process.exit(1);
    }

    await createUser({ email, password, firstName, lastName, isVerified: true, isDemo: true });
  }

  await mongoose.disconnect();
  console.log('\n👋 Done. You can now log in with these credentials.');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
