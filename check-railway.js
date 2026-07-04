#!/usr/bin/env node
/**
 * Pre-deployment check for Railway
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando preparación para Railway...\n');

const checks = [
  {
    name: 'Git repository',
    check: () => fs.existsSync('.git'),
    fix: 'Run: git init'
  },
  {
    name: 'Dockerfile',
    check: () => fs.existsSync('Dockerfile'),
    fix: 'Create Dockerfile in root'
  },
  {
    name: 'Root package.json',
    check: () => fs.existsSync('package.json'),
    fix: 'Create package.json with build scripts'
  },
  {
    name: 'Backend package.json',
    check: () => fs.existsSync('backend/package.json'),
    fix: 'Install backend dependencies'
  },
  {
    name: 'Frontend package.json',
    check: () => fs.existsSync('frontend/package.json'),
    fix: 'Install frontend dependencies'
  },
  {
    name: 'Production env files',
    check: () => fs.existsSync('backend/.env.production') && fs.existsSync('frontend/.env.production'),
    fix: 'Create .env.production files'
  },
  {
    name: '.gitignore',
    check: () => fs.existsSync('.gitignore'),
    fix: 'Create .gitignore file'
  },
  {
    name: 'Git commits',
    check: () => {
      try {
        require('child_process').execSync('git log --oneline', { stdio: 'pipe' });
        return true;
      } catch {
        return false;
      }
    },
    fix: 'Run: git add . && git commit -m "Initial commit"'
  }
];

let allPassed = true;

checks.forEach((check, index) => {
  const passed = check.check();
  const icon = passed ? '✅' : '❌';

  console.log(`${icon} ${check.name}`);

  if (!passed) {
    console.log(`   Fix: ${check.fix}`);
    allPassed = false;
  }
});

console.log('\n📊 Resumen:');
console.log('═'.repeat(50));

if (allPassed) {
  console.log('🎉 ¡Todo listo para Railway!');
  console.log('');
  console.log('🚀 Próximos pasos:');
  console.log('1. Subir a GitHub: git remote add origin <url>');
  console.log('2. Push: git push -u origin main');
  console.log('3. Railway: railway.app → New Project → GitHub repo');
  console.log('4. Configurar variables de entorno en Railway');
  console.log('5. Actualizar Azure AD con la URL de Railway');
  console.log('');
  console.log('📖 Ver: DOC/historial/RAILWAY_DEPLOYMENT.md para instrucciones detalladas');
} else {
  console.log('⚠️ Hay algunos problemas que resolver antes del despliegue');
  console.log('📝 Sigue las instrucciones de "Fix" arriba');
}

console.log('');
console.log('🌐 Variables de entorno requeridas en Railway:');
console.log('- MONGODB_URI');
console.log('- JWT_SECRET');
console.log('- OPENAI_API_KEY');
console.log('- AZURE_OCR_KEY');
console.log('- AZURE_OCR_ENDPOINT');
console.log('- AZURE_CLIENT_ID');
console.log('- AZURE_TENANT_ID');
console.log('- NODE_ENV=production');
