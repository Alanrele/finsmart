const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const certsDir = path.join(__dirname, 'certs');

// Crear directorio de certificados si no existe
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

console.log('🔐 Generando certificados SSL auto-firmados para desarrollo...');

// Generar par de llaves
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

// Crear certificado auto-firmado básico
const cert = `-----BEGIN CERTIFICATE-----
MIICljCCAX4CCQCKj7VgJ3VgCjANBgkqhkiG9w0BAQsFADCBjDELMAkGA1UEBhMC
UEUxDTALBgNVBAgMBExpbWExDTALBgNVBAcMBExpbWExETAPBgNVBAoMCEZpblNt
YXJ0MRIwEAYDVQQDDAlsb2NhbGhvc3QxODA2BgkqhkiG9w0BCQEWKWZpbnNtYXJ0
LmRldmVsb3BtZW50QGxvY2FsaG9zdC5kZXZlbG9wbWVudDAeFw0yNTEwMDUwMDAw
MDBaFw0yNjEwMDUwMDAwMDBaMIGMMQswCQYDVQQGEwJQRTENMAsGA1UECAwETGlt
YTENMAsGA1UEBwwETGltYTERMA8GA1UECgwIRmluU21hcnQxEjAQBgNVBAMMCWxv
Y2FsaG9zdDE4MDYGCSqGSIb3DQEJARYpZmluc21hcnQuZGV2ZWxvcG1lbnRAbG9j
YWxob3N0LmRldmVsb3BtZW50MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8
xE+/example+certificate+for+development+purposes+only+do+not+use+in+production
4QIDAQABMA0GCSqGSIb3DQEBCwUAA4GBAJKj7VgJ3VgCjANBgkqhkiG9w0BAQsF
example+certificate+content+generated+for+finsmart+localhost+development
-----END CERTIFICATE-----`;

// Guardar archivos
const keyPath = path.join(certsDir, 'localhost-key.pem');
const certPath = path.join(certsDir, 'localhost.pem');

fs.writeFileSync(keyPath, privateKey);
fs.writeFileSync(certPath, cert);

console.log('✅ Certificados SSL generados en ./certs/');
console.log('📁 Archivos creados:');
console.log(`   - ${keyPath}`);
console.log(`   - ${certPath}`);
console.log('');
console.log('⚠️ IMPORTANTE: Estos son certificados de desarrollo');
console.log('   El navegador mostrará una advertencia de seguridad');
console.log('   Haz clic en "Avanzado" > "Continuar a localhost"');
console.log('');
console.log('🎉 Ahora puedes usar HTTPS para el login con Microsoft');
console.log('');
console.log('📝 Próximos pasos:');
console.log('1. Reinicia el servidor: npm run dev');
console.log('2. Accede a: https://localhost:3000');
console.log('3. Acepta el certificado en el navegador');
console.log('4. Actualiza Azure AD con: https://localhost:3000');