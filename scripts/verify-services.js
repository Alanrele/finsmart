#!/usr/bin/env node
/**
 * scripts/verify-services.js
 * Simple dev-time health checker for local services
 */
const http = require('http');

const checks = [
  { name: 'backend /health', url: 'http://localhost:5000/health' },
  { name: 'AI /api/ai/health', url: 'http://localhost:5000/api/ai/health' },
  { name: 'Graph /api/graph/status', url: 'http://localhost:5000/api/graph/status' }
];

function ping(url) {
  return new Promise((resolve) => {
    const req = http.get(url, res => {
      resolve({ url, status: res.statusCode });
    });
    req.on('error', err => resolve({ url, error: err.message }));
    req.setTimeout(2000, () => {
      req.abort();
      resolve({ url, error: 'timeout' });
    });
  });
}

(async function main(){
  for (const c of checks) {
    const r = await ping(c.url);
    if (r.error) {
      console.error(`${c.name} -> ERROR: ${r.error}`);
    } else {
      console.log(`${c.name} -> ${r.status}`);
    }
  }
})();
#!/usr/bin/env node
/**
 * Verifies that the local backend services respond as expected.
 * Run the backend beforehand (`npm run dev --workspace backend`).
 */

const http = require('http');

const targets = [
  { name: 'health', path: '/health' },
  { name: 'ai', path: '/api/ai/health' },
  { name: 'graph', path: '/api/graph/status' }
];

const baseUrl = process.env.FINSMART_VERIFY_BASE || 'http://localhost:5000';

function request(target) {
  return new Promise((resolve) => {
    const url = new URL(target.path, baseUrl);
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          target: target.name,
          status: res.statusCode,
          ok: res.statusCode && res.statusCode < 400,
          body: body.slice(0, 500)
        });
      });
    });
    req.on('error', (error) => {
      resolve({
        target: target.name,
        status: 0,
        ok: false,
        body: error.message
      });
    });
  });
}

async function main() {
  const results = await Promise.all(targets.map(request));
  let hasFailure = false;

  results.forEach(result => {
    const icon = result.ok ? '✅' : '❌';
    console.log(`${icon} [${result.target}] ${result.status}`);
    if (!result.ok) {
      console.log(`    ${result.body}`);
      hasFailure = true;
    }
  });

  if (hasFailure) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('verify-services failed:', error);
  process.exit(1);
});
