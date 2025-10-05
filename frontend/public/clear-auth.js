/**
 * Script para limpiar el localStorage y probar el flujo de autenticación
 */

console.log('🧹 Limpiando datos de autenticación...');

// Limpiar localStorage
localStorage.clear();
sessionStorage.clear();

// Limpiar cookies específicas
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

console.log('✅ Datos limpiados. Refrescando página...');

// Recargar la página
setTimeout(() => {
  window.location.reload();
}, 1000);
