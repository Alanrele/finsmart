// Railway Backend Diagnostic Script
// Ejecuta esto en la consola del navegador (F12) para diagnosticar problemas

const diagnoseRailwayBackend = async () => {
  console.log('🔍 INICIANDO DIAGNÓSTICO DE RAILWAY BACKEND...\n');

  const baseUrl = 'https://finsmart-production.up.railway.app';
  const tests = [
    { name: 'Health Check', url: `${baseUrl}/health` },
    { name: 'API Health', url: `${baseUrl}/api/health` },
    { name: 'Root Path', url: `${baseUrl}/` },
    { name: 'Static Assets', url: `${baseUrl}/static/js/main.js` }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`🧪 Probando: ${test.name} - ${test.url}`);

      const startTime = Date.now();
      const response = await fetch(test.url, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Kipu-Diagnostic/1.0'
        }
      });
      const endTime = Date.now();

      const result = {
        test: test.name,
        url: test.url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
        responseTime: endTime - startTime
      };

      if (response.ok) {
        console.log(`✅ ${test.name}: ${response.status} ${response.statusText} (${result.responseTime}ms)`);
      } else {
        console.log(`❌ ${test.name}: ${response.status} ${response.statusText} (${result.responseTime}ms)`);
      }

      results.push(result);

    } catch (error) {
      console.log(`🚫 ${test.name}: ERROR - ${error.message}`);
      results.push({
        test: test.name,
        url: test.url,
        error: error.message,
        type: error.name
      });
    }
  }

  console.log('\n📊 RESUMEN DEL DIAGNÓSTICO:');
  console.log('==============================');

  const working = results.filter(r => r.ok);
  const failing = results.filter(r => !r.ok && !r.error);
  const errors = results.filter(r => r.error);

  console.log(`✅ Funcionando: ${working.length}/${tests.length}`);
  console.log(`❌ Fallando: ${failing.length}/${tests.length}`);
  console.log(`🚫 Errores: ${errors.length}/${tests.length}`);

  if (errors.length > 0) {
    console.log('\n🔍 ANÁLISIS DE ERRORES:');
    errors.forEach(error => {
      if (error.error.includes('CERT') || error.error.includes('SSL') || error.error.includes('TLS')) {
        console.log(`🔒 ${error.test}: Problema de certificado SSL/TLS`);
      } else if (error.error.includes('CORS')) {
        console.log(`🌐 ${error.test}: Problema de CORS`);
      } else if (error.error.includes('Network') || error.error.includes('Failed to fetch')) {
        console.log(`📡 ${error.test}: Problema de red o servidor no disponible`);
      } else {
        console.log(`❓ ${error.test}: ${error.error}`);
      }
    });
  }

  console.log('\n💡 RECOMENDACIONES:');

  if (errors.some(e => e.error.includes('CERT') || e.error.includes('SSL'))) {
    console.log('🔒 Problema SSL detectado:');
    console.log('   - Este es un problema temporal común en Railway');
    console.log('   - El certificado puede tardar hasta 10-15 minutos en propagarse');
    console.log('   - El modo demo debería activarse automáticamente');
    console.log('   - Intenta recargar la página en unos minutos');
  }

  if (working.length === 0) {
    console.log('🚫 Backend completamente inaccesible:');
    console.log('   - Verifica el estado del servicio en Railway');
    console.log('   - Revisa los logs del deployment');
    console.log('   - El modo offline debería estar activo');
  } else if (working.length < tests.length) {
    console.log('⚠️ Backend parcialmente funcional:');
    console.log('   - Algunos endpoints están funcionando');
    console.log('   - Puede ser un problema temporal de SSL');
  }

  console.log('\n📋 Datos completos guardados en: window.railwayDiagnostic');
  window.railwayDiagnostic = {
    timestamp: new Date().toISOString(),
    results: results,
    summary: { working: working.length, failing: failing.length, errors: errors.length },
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  return results;
};

// Ejecutar automáticamente
console.log('🚀 Ejecutando diagnóstico automático...');
diagnoseRailwayBackend().then(() => {
  console.log('\n✨ Diagnóstico completado. Revisa los resultados arriba.');
  console.log('💾 Para ejecutar nuevamente: diagnoseRailwayBackend()');
});

// Hacer la función disponible globalmente
window.diagnoseRailwayBackend = diagnoseRailwayBackend;
