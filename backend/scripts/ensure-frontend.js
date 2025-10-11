/*
 Ensure frontend assets exist in backend/public before starting server
 If missing, attempt to build and copy from frontend directory
*/
const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')

const backendPublic = path.join(__dirname, '..', 'public')
const indexHtml = path.join(backendPublic, 'index.html')

// Check if index.html exists
if (fs.existsSync(indexHtml)) {
  console.log('✅ Frontend assets present in backend/public')
  process.exit(0)
}

console.log('⚠️  Frontend assets missing, attempting to build...')

const repoRoot = path.resolve(__dirname, '..', '..')
const frontendDir = path.join(repoRoot, 'frontend')

try {
  if (!fs.existsSync(frontendDir)) {
    console.error('❌ Frontend directory not found at:', frontendDir)
    console.log('⚠️  Server will start without SPA - API-only mode')
    process.exit(0)
  }

  // Install deps if node_modules missing
  if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
    console.log('📦 Installing frontend dependencies...')
    execSync('npm ci || npm install', { stdio: 'inherit', cwd: frontendDir })
  }

  // Build frontend
  console.log('🔨 Building frontend...')
  execSync('npm run build', { stdio: 'inherit', cwd: frontendDir })

  // Copy dist to backend/public
  console.log('📋 Copying frontend assets to backend/public...')
  fs.mkdirSync(backendPublic, { recursive: true })
  fs.cpSync(path.join(frontendDir, 'dist'), backendPublic, { recursive: true, force: true })

  console.log('✅ Frontend built and copied successfully')
} catch (e) {
  console.error('❌ Failed to build frontend:', e.message)
  console.log('⚠️  Server will start without SPA - API-only mode')
  // Don't fail startup - allow API-only mode
}
