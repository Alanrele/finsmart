const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const certsDir = path.join(__dirname, 'certs');

// Crear directorio de certificados si no existe
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

console.log('🔐 Generando certificados SSL para desarrollo...');

try {
  // Verificar si mkcert está instalado
  try {
    execSync('mkcert -version', { stdio: 'pipe' });
    console.log('✅ mkcert encontrado, generando certificados...');
    
    // Generar certificados con mkcert
    execSync('mkcert -install', { stdio: 'inherit' });
    execSync(`mkcert -key-file ${path.join(certsDir, 'localhost-key.pem')} -cert-file ${path.join(certsDir, 'localhost.pem')} localhost 127.0.0.1 ::1`, { stdio: 'inherit' });
    
    console.log('✅ Certificados SSL generados exitosamente con mkcert');
    
  } catch (error) {
    console.log('⚠️ mkcert no está instalado, creando certificados auto-firmados...');
    
    // Crear certificados auto-firmados usando OpenSSL
    const keyPath = path.join(certsDir, 'localhost-key.pem');
    const certPath = path.join(certsDir, 'localhost.pem');
    
    // Generar clave privada
    execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });
    
    // Generar certificado auto-firmado
    execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=PE/ST=Lima/L=Lima/O=FinSmart/CN=localhost"`, { stdio: 'inherit' });
    
    console.log('✅ Certificados SSL auto-firmados generados');
  }
  
  console.log('🎉 HTTPS configurado correctamente');
  console.log('');
  console.log('📝 Próximos pasos:');
  console.log('1. Reinicia el servidor de desarrollo: npm run dev');
  console.log('2. Accede a: https://localhost:3000');
  console.log('3. Acepta el certificado auto-firmado en el navegador');
  console.log('4. Actualiza la configuración de Azure AD con la nueva URL HTTPS');
  
} catch (error) {
  console.error('❌ Error generando certificados:', error.message);
  console.log('');
  console.log('🔧 Alternativas:');
  console.log('1. Instalar mkcert: https://github.com/FiloSottile/mkcert');
  console.log('2. Usar ngrok para tunelizar HTTP a HTTPS');
  console.log('3. Configurar certificados manualmente');
}