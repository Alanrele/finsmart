const path = require('path');
const dotenv = require('dotenv');

// Load environment variables once when the module is required
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const bool = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const number = (value, defaultValue) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

const array = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: number(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/finsmart',
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
  corsAllowedOrigins: array(process.env.CORS_ALLOWED_ORIGINS),
  logLevel: process.env.LOG_LEVEL || 'info',
  allowDemoMode: bool(process.env.ALLOW_DEMO_MODE),
  enableEmailSync: process.env.ENABLE_EMAIL_SYNC !== 'false',
  syncLookbackHours: number(process.env.SYNC_LOOKBACK_HOURS, 24),
  syncInitialLookbackHours: number(process.env.SYNC_INITIAL_LOOKBACK_HOURS, 720),
  openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
  azureOcrConfigured: Boolean(process.env.AZURE_OCR_KEY),
  frontendGraphClientId: process.env.VITE_GRAPH_CLIENT_ID,
  frontendGraphTenantId: process.env.VITE_GRAPH_TENANT_ID,
  frontendApiUrl: process.env.VITE_API_URL,
};

module.exports = {
  env,
  bool,
  number,
  array,
};
