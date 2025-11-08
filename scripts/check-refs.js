#!/usr/bin/env node
/**
 * scripts/check-refs.js
 * Scan repository for legacy import paths that should be updated after reorg.
 * Exits with code 1 if findings are present.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

const patterns = [
  /backend\/src\//g,
  /frontend\/src\//g,
  /src\/services\//g,
  /src\/stores\//g
];

function scanFile(file) {
  const abs = path.join(repoRoot, file);
  const txt = fs.readFileSync(abs, 'utf8');
  const hits = [];
  patterns.forEach(p => {
    if (p.test(txt)) hits.push(p);
  });
  return hits.length ? true : false;
}

function main() {
  const walk = (dir) => {
    const res = [];
    fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        res.push(...walk(full));
      } else if (/\.(js|jsx|mjs|cjs|json)$/.test(d.name)) {
        res.push(path.relative(repoRoot, full));
      }
    });
    return res;
  };

  const files = walk(repoRoot);
  const findings = [];
  files.forEach(f => {
    const abs = path.join(repoRoot, f);
    const content = fs.readFileSync(abs, 'utf8');
    patterns.forEach(p => {
      if (p.test(content)) {
        findings.push({ file: f, pattern: p.toString() });
      }
    });
  });

  if (findings.length) {
    console.error('Found legacy import patterns:');
    findings.forEach(h => console.error(` - ${h.file}: ${h.pattern}`));
    process.exitCode = 1;
  } else {
    console.log('No legacy imports detected.');
  }
}

main();
#!/usr/bin/env node
/**
 * Simple guard script that fails if legacy import paths remain after the reorganisation.
 * It can be wired into CI or npm scripts.
 */

const fs = require('fs/promises');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const includeRoots = ['backend/src', 'frontend/src'];

const checks = [
  { regex: /['"]\.\.\/services\//, message: 'Legacy services folder reference detected' },
  { regex: /['"]\.\.\/models\//, message: 'Legacy models folder reference detected' },
  { regex: /['"]\.\.\/middleware\/authMiddleware/, message: 'Old auth middleware path detected' },
  { regex: /['"]\.\.\/routes\//, message: 'Routes should live under adapters/http/routes' },
  { regex: /['"]\.\.\/stores\//, message: 'Zustand stores must be referenced via entities alias' },
  { regex: /['"]\.\.\/config\/msalConfig/, message: 'MSAL config moved under app/config' },
  { regex: /['"]\.\.\/lib\/email/, message: 'Email helpers moved under adapters/msgraph/email' }
];

async function walk(dir, collector) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, collector);
    } else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) {
      const contents = await fs.readFile(fullPath, 'utf8');
      checks.forEach(({ regex, message }) => {
        if (regex.test(contents)) {
          collector.push({ file: path.relative(projectRoot, fullPath), message });
        }
      });
    }
  }
}

async function main() {
  const violations = [];
  for (const root of includeRoots) {
    const absRoot = path.join(projectRoot, root);
    try {
      await walk(absRoot, violations);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
  }

  if (violations.length) {
    console.error('Import reference check failed:');
    violations.forEach(({ file, message }) => {
      console.error(` - ${file}: ${message}`);
    });
    process.exit(1);
  }

  console.log('No legacy references detected');
}

main().catch(err => {
  console.error('check-refs failed:', err);
  process.exit(1);
});
