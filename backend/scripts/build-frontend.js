/*
 Ensure frontend is built and copied into backend/public during deploys (e.g., Railway)
*/
const path = require('path')
const { execSync } = require('child_process')
const fs = require('fs')
const fse = require('fs-extra')

const repoRoot = path.resolve(__dirname, '..', '..')
const frontendDir = path.join(repoRoot, 'frontend')
const backendPublic = path.join(repoRoot, 'backend', 'public')

function run(cmd, cwd) {
  console.log(`$ ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd })
}

try {
  if (!fs.existsSync(frontendDir)) {
    console.log('Frontend directory not found, skipping build')
    process.exit(0)
  }
  // Install deps if node_modules missing
  if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
    run('npm ci || npm install', frontendDir)
  }
  // Build frontend
  run('npm run build', frontendDir)
  // Copy dist to backend/public
  fse.ensureDirSync(backendPublic)
  fse.copySync(path.join(frontendDir, 'dist'), backendPublic, { overwrite: true })
  console.log('✅ Frontend built and copied to backend/public')
} catch (e) {
  console.error('❌ Failed to build/copy frontend:', e.message)
  // Don't fail install step hard; log and continue
}
