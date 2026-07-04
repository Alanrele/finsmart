#!/usr/bin/env node
/**
 * FinSmart - Service Status Checker
 * Verifica el estado de todos los servicios
 */

const http = require('http');
const https = require('https');

const services = [
  {
    name: 'Frontend (Vite HTTPS)',
    url: 'https://localhost:3001',
    type: 'http'
  },
  {
    name: 'Backend API',
    url: 'http://localhost:5001/api/health',
    type: 'http'
  },
  {
    name: 'MongoDB Atlas',
    url: process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@<cluster>.mongodb.net/finsmart',
    type: 'mongodb'
  }
];

function checkHttpService(service) {
  return new Promise((resolve) => {
    const client = service.url.startsWith('https') ? https : http;

    const req = client.get(service.url, (res) => {
      resolve({
        ...service,
        status: res.statusCode < 400 ? 'OK' : 'ERROR',
        statusCode: res.statusCode,
        message: `HTTP ${res.statusCode}`
      });
    });

    req.on('error', (error) => {
      resolve({
        ...service,
        status: 'ERROR',
        message: error.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        ...service,
        status: 'TIMEOUT',
        message: 'Request timeout'
      });
    });
  });
}

async function checkServices() {
  console.log('🔍 Verificando estado de servicios FinSmart...\n');

  const results = [];

  for (const service of services) {
    if (service.type === 'http') {
      const result = await checkHttpService(service);
      results.push(result);
    } else if (service.type === 'mongodb') {
      results.push({
        ...service,
        status: 'CONFIGURED',
        message: 'Connection string configured'
      });
    }
  }

  // Mostrar resultados
  console.log('📊 Estado de Servicios:');
  console.log('═'.repeat(50));

  results.forEach(result => {
    const icon = result.status === 'OK' ? '✅' :
                 result.status === 'CONFIGURED' ? '⚙️' : '❌';

    console.log(`${icon} ${result.name.padEnd(20)} ${result.status.padEnd(10)} ${result.message || ''}`);
  });

  console.log('\n🌐 URLs:');
  console.log('─'.repeat(30));
  console.log('Frontend: https://localhost:3001');
  console.log('Backend:  http://localhost:5001');
  console.log('API Docs: http://localhost:5001/api/docs');

  console.log('\n📝 Configuración Pendiente:');
  console.log('─'.repeat(40));
  console.log('• Azure AD URIs de redirección (ver DOC/historial/AZURE_AD_SETUP.md)');
  console.log('• Variables de entorno de producción');

  console.log('\n🚀 Para iniciar los servicios:');
  console.log('─'.repeat(35));
  console.log('Frontend: cd frontend && npm run dev');
  console.log('Backend:  cd backend && npm run dev');
}

if (require.main === module) {
  checkServices().catch(console.error);
}

module.exports = { checkServices };
