#!/usr/bin/env node
/**
 * scripts/reorg-finsmart.js
 * Migrate files according to the mapping for Hexagonal/Clean + FSD reorganization.
 * Safety: by default runs in --dry-run mode. Use --apply to perform filesystem moves.
 * Rewrites simple import paths using regex (best-effort). Review results before committing.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const mappings = [
  // backend mappings (examples)
  { from: 'backend/src/server.js', to: 'backend/src/adapters/http/server.js' },
  { from: 'backend/src/routes', to: 'backend/src/adapters/http/routes' },
  { from: 'backend/src/config/logger.js', to: 'backend/src/infrastructure/logging/logger.js' },
  { from: 'backend/src/utils/tokenCleanup.js', to: 'backend/src/infrastructure/security/tokenCleanup.js' },
  { from: 'backend/src/domain/NormalizedTransaction.js', to: 'backend/src/domain/transaction/NormalizedTransaction.js' },
  { from: 'backend/src/services/transactionDeduper.js', to: 'backend/src/app/services/transactionDeduper.js' },
  { from: 'backend/src/services/aiAnalysisService.js', to: 'backend/src/app/use-cases/analyzeTransaction.js' },
  { from: 'backend/src/services/emailSyncService.js', to: 'backend/src/adapters/msgraph/emailSyncService.js' },
  { from: 'backend/src/lib/email/bcp', to: 'backend/src/adapters/msgraph/email/bcp' },
  { from: 'backend/src/models', to: 'backend/src/adapters/db/mongoose/models' },

  // frontend mappings (examples)
  { from: 'frontend/src/main.jsx', to: 'frontend/src/app/index.jsx' },
  { from: 'frontend/src/App.jsx', to: 'frontend/src/app/app.jsx' },
  { from: 'frontend/src/stores/authStore.js', to: 'frontend/src/entities/session/model/authStore.js' },
  { from: 'frontend/src/stores/appStore.js', to: 'frontend/src/entities/app/model/appStore.js' },
  { from: 'frontend/src/services/api.js', to: 'frontend/src/shared/api/base.js' },
  { from: 'frontend/src/services/socket', to: 'frontend/src/shared/io/socket' }
];

function ensureDir(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function moveSync(src, dest, apply) {
  const absSrc = path.join(repoRoot, src);
  const absDest = path.join(repoRoot, dest);
  if (!fs.existsSync(absSrc)) {
    console.warn('[skip] source not found:', src);
    return;
  }
  ensureDir(path.dirname(absDest));
  if (apply) {
    fs.renameSync(absSrc, absDest);
    console.log('[moved]', src, '→', dest);
  } else {
    console.log('[dry-run] would move:', src, '→', dest);
  }
}

function rewriteImports(rootDir, apply) {
  // Best-effort regex replacements for a few common patterns.
  const files = execSync(`git ls-files`, { cwd: repoRoot }).toString().split(/\r?\n/).filter(Boolean);
  const jsFiles = files.filter(f => /\.(js|jsx|mjs|cjs)$/.test(f));
  const replacements = [
    { from: "../src/services/aiAnalysisService", to: "../app/use-cases/analyzeTransaction" },
    { from: "../src/services/emailSyncService", to: "../adapters/msgraph/emailSyncService" },
    { from: "src/services/api", to: "src/shared/api/base" },
    { from: "src/services/socket", to: "src/shared/io/socket" }
  ];

  jsFiles.forEach(file => {
    const abs = path.join(repoRoot, file);
    let content = fs.readFileSync(abs, 'utf8');
    let updated = content;
    replacements.forEach(r => {
      const re = new RegExp(r.from.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
      updated = updated.replace(re, r.to);
    });
    if (updated !== content) {
      if (apply) {
        fs.writeFileSync(abs, updated, 'utf8');
        console.log('[rewrote imports]', file);
      } else {
        console.log('[dry-run] would rewrite imports in', file);
      }
    }
  });
}

function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  console.log('reorg-finsmart.js', apply ? 'APPLY mode' : 'DRY-RUN mode');

  mappings.forEach(m => moveSync(m.from, m.to, apply));
  console.log('Attempting import rewrites (best-effort)...');
  try {
    rewriteImports(repoRoot, apply);
  } catch (err) {
    console.warn('Skipping import rewrite: git not available or other error', err.message);
  }

  console.log('Done. Review changes before committing. Use --apply to make changes.');
}

main();
#!/usr/bin/env node
/**
 * Reorganises the FinSmart repository into the new Hexagonal/FSD layout.
 * It mirrors the manual refactor performed in this branch so that future
 * contributors can reproduce the move deterministically.
 *
 * The script is idempotent: it will skip moves that already happened and
 * only rewrites imports when a known legacy pattern is detected.
 */

const fs = require('fs/promises');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

const moves = [
  // Backend
  ['backend/src/server.js', 'backend/src/adapters/http/server.js'],
  ['backend/src/routes', 'backend/src/adapters/http/routes'],
  ['backend/src/middleware/authMiddleware.js', 'backend/src/adapters/http/middleware/auth.js'],
  ['backend/src/middleware/errorHandler.js', 'backend/src/adapters/http/middleware/errorHandler.js'],
  ['backend/src/middleware/logger.js', 'backend/src/adapters/http/middleware/logger.js'],
  ['backend/src/config/helmet.js', 'backend/src/adapters/http/middleware/security.js'],
  ['backend/src/config/logger.js', 'backend/src/infrastructure/logging/logger.js'],
  ['backend/src/utils/tokenCleanup.js', 'backend/src/infrastructure/security/tokenCleanup.js'],
  ['backend/src/services/transactionDeduper.js', 'backend/src/app/services/transactionDeduper.js'],
  ['backend/src/services/emailSyncService.js', 'backend/src/adapters/msgraph/emailSyncService.js'],
  ['backend/src/services/graphService.js', 'backend/src/adapters/msgraph/graphService.js'],
  ['backend/src/services/emailParserService.js', 'backend/src/adapters/msgraph/email/parserService.js'],
  ['backend/src/lib/email/bcp', 'backend/src/adapters/msgraph/email/bcp'],
  ['backend/src/lib/email/normalize.js', 'backend/src/adapters/msgraph/email/normalize.js'],
  ['backend/src/models', 'backend/src/adapters/db/mongoose/models'],
  ['backend/src/domain/NormalizedTransaction.js', 'backend/src/domain/transaction/NormalizedTransaction.js'],
  ['backend/src/services/aiAnalysisService.js', 'backend/src/adapters/ai/openaiClient.js'],
  ['backend/src/services/__tests__/emailParserService.test.js', 'backend/tests/adapters/msgraph/email/parserService.test.js'],
  ['backend/tests/email/bcp', 'backend/tests/adapters/msgraph/email/bcp'],

  // Frontend
  ['frontend/src/main.jsx', 'frontend/src/app/index.jsx'],
  ['frontend/src/App.jsx', 'frontend/src/app/app.jsx'],
  ['frontend/src/config/msalConfig.js', 'frontend/src/app/config/msalConfig.js'],
  ['frontend/src/config/railway.js', 'frontend/src/app/config/railway.js'],
  ['frontend/src/stores/authStore.js', 'frontend/src/entities/session/model/authStore.js'],
  ['frontend/src/stores/appStore.js', 'frontend/src/entities/app/model/appStore.js'],
  ['frontend/src/services/api.js', 'frontend/src/shared/api/base.js'],
  ['frontend/src/services/socket.js', 'frontend/src/shared/io/socket.js'],
  ['frontend/src/hooks/useMicrosoftAuth.js', 'frontend/src/processes/auth/useMicrosoftAuth.js'],
  ['frontend/src/utils/formatters.js', 'frontend/src/shared/lib/formatters.js'],
];

const importRewrites = [
  {
    files: ['backend'],
    patterns: [
      { from: /require\('\.\.\/models\/userModel'\)/g, to: "require('../../db/mongoose/models/userModel')" },
      { from: /require\('\.\.\/models\/transactionModel'\)/g, to: "require('../../db/mongoose/models/transactionModel')" },
      { from: /require\('\.\.\/services\/aiAnalysisService'\)/g, to: "require('../../ai/openaiClient')" },
      { from: /require\('\.\.\/services\/transactionDeduper'\)/g, to: "require('../../../app/services/transactionDeduper')" },
      { from: /require\('\.\.\/services\/emailParserService'\)/g, to: "require('../../msgraph/email/parserService')" },
      { from: /require\('\.\.\/utils\/tokenCleanup'\)/g, to: "require('../../../infrastructure/security/tokenCleanup')" },
      { from: /require\('\.\.\/config\/helmet'\)/g, to: "require('./middleware/security')" }
    ],
  },
  {
    files: ['frontend'],
    patterns: [
      { from: /'\.\/components\//g, to: "'@pages/" },
      { from: /'\.\.\/stores\/authStore'/g, to: "'@entities/session/model/authStore'" },
      { from: /'\.\.\/stores\/appStore'/g, to: "'@entities/app/model/appStore'" },
      { from: /'\.\.\/services\/api'/g, to: "'@shared/api/base'" },
      { from: /'\.\.\/services\/socket'/g, to: "'@shared/io/socket'" },
      { from: /'\.\.\/hooks\/useMicrosoftAuth'/g, to: "'@processes/auth/useMicrosoftAuth'" },
      { from: /'\.\.\/utils\/formatters'/g, to: "'@shared/lib/formatters'" }
    ],
  },
];

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function move(from, to) {
  const absFrom = path.join(projectRoot, from);
  const absTo = path.join(projectRoot, to);
  try {
    await fs.access(absFrom);
  } catch {
    return; // Already moved
  }
  await ensureDir(absTo);
  await fs.rename(absFrom, absTo);
  console.log(`Moved ${from} -> ${to}`);
}

async function rewriteImports(scopeDir, patterns) {
  const baseDir = path.join(projectRoot, scopeDir);
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!/\.(js|jsx|mjs|cjs|ts|tsx)$/.test(entry.name)) continue;
      let contents = await fs.readFile(fullPath, 'utf8');
      let mutated = contents;
      patterns.forEach(({ from, to }) => {
        mutated = mutated.replace(from, to);
      });
      if (mutated !== contents) {
        await fs.writeFile(fullPath, mutated, 'utf8');
        console.log(`Updated imports in ${path.relative(projectRoot, fullPath)}`);
      }
    }
  }
  await walk(baseDir);
}

async function main() {
  for (const [from, to] of moves) {
    await move(from, to);
  }

  for (const rewrite of importRewrites) {
    for (const scope of rewrite.files) {
      await rewriteImports(scope, rewrite.patterns);
    }
  }

  console.log('Reorganisation script completed');
}

main().catch((error) => {
  console.error('Reorganisation failed:', error);
  process.exitCode = 1;
});
