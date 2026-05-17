const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'backend', 'src');

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const d of entries) {
    const p = path.join(dir, d.name);
    if (d.isDirectory() && d.name !== 'node_modules') {
      walk(p, cb);
    } else if (/\.(jsx?|tsx?)$/.test(d.name)) {
      cb(p);
    }
  }
}

walk(SRC, (file) => {
  const dir = path.dirname(file);
  const content = fs.readFileSync(file, 'utf8');

  // Match: require('./Foo') or require("../Foo")
  const re = /require\s*\(\s*['"](\.\.?\/[^'"]+)['"]\s*\)/g;
  let m;
  while ((m = re.exec(content))) {
    const imp = m[1];
    const base = imp.replace(/\.jsx?$/, '');
    const candidates = [
      base + '.js', base + '.jsx', base + '.ts', base + '.tsx',
      base + '.json',
      base + '/index.js', base + '/index.jsx',
      base
    ];
    const found = candidates.some(c => {
      try { return fs.existsSync(path.resolve(dir, c)); } catch { return false; }
    });
    if (!found) {
      console.log(`BROKEN: ${path.relative(SRC, file)} -> ${imp}`);
    }
  }
});

console.log('Done.');
