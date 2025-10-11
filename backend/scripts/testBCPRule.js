// Test de regla especial para notificaciones@notificacionesbcp.com.pe

const emailParserService = require('../src/services/emailParserService');

console.log('🧪 TESTING REGLA ESPECIAL BCP NOTIFICACIONES\n');

// Test 1: Email de notificaciones@notificacionesbcp.com.pe (DEBE procesarse SÍ O SÍ)
const test1 = {
    subject: 'Cualquier asunto, incluso promocional',
    content: 'Contenido sin keywords transaccionales',
    from: 'notificaciones@notificacionesbcp.com.pe'
};

console.log('Test 1: Email de notificaciones@notificacionesbcp.com.pe');
console.log('Subject:', test1.subject);
console.log('From:', test1.from);
const result1 = emailParserService.isTransactionalEmail(test1.subject, test1.content, { from: test1.from });
console.log('Resultado:', result1 ? '✅ PROCESADO' : '❌ RECHAZADO');
console.log('Esperado: ✅ PROCESADO\n');

// Test 2: Email de otro remitente con keywords transaccionales (DEBE procesarse)
const test2 = {
    subject: 'Realizaste un consumo',
    content: 'Monto: S/ 23.60 Fecha y hora: 03/10/2025 Número de operación: 224095',
    from: 'otro@email.com'
};

console.log('Test 2: Email de otro remitente con keywords');
console.log('Subject:', test2.subject);
console.log('From:', test2.from);
const result2 = emailParserService.isTransactionalEmail(test2.subject, test2.content, { from: test2.from });
console.log('Resultado:', result2 ? '✅ PROCESADO' : '❌ RECHAZADO');
console.log('Esperado: ✅ PROCESADO\n');

// Test 3: Email promocional de otro remitente (NO debe procesarse)
const test3 = {
    subject: '15% off en tu seguro',
    content: 'Descuentos increíbles',
    from: 'marketing@banco.com'
};

console.log('Test 3: Email promocional de otro remitente');
console.log('Subject:', test3.subject);
console.log('From:', test3.from);
const result3 = emailParserService.isTransactionalEmail(test3.subject, test3.content, { from: test3.from });
console.log('Resultado:', result3 ? '✅ PROCESADO' : '❌ RECHAZADO');
console.log('Esperado: ❌ RECHAZADO\n');

// Test 4: Email de notificaciones BCP con mayúsculas (DEBE procesarse)
const test4 = {
    subject: 'Estado de cuenta',
    content: 'Resumen mensual',
    from: 'NOTIFICACIONES@NOTIFICACIONESBCP.COM.PE'
};

console.log('Test 4: Email de notificaciones BCP (MAYÚSCULAS)');
console.log('Subject:', test4.subject);
console.log('From:', test4.from);
const result4 = emailParserService.isTransactionalEmail(test4.subject, test4.content, { from: test4.from });
console.log('Resultado:', result4 ? '✅ PROCESADO' : '❌ RECHAZADO');
console.log('Esperado: ✅ PROCESADO\n');

// Test 5: Extracción de montos y monedas
console.log('Test 5: Extracción de montos y monedas');

const testAmounts = [
    { text: 'Monto: S/ 23.60', expected: { amount: 23.60, currency: 'PEN' } },
    { text: 'Consumo: $ 45.99', expected: { amount: 45.99, currency: 'USD' } },
    { text: 'Transferencia US$ 1,234.56', expected: { amount: 1234.56, currency: 'USD' } },
    { text: 'Pago S/. 1.500,00', expected: { amount: 1500.00, currency: 'PEN' } },
    { text: 'Importe USD 99.99', expected: { amount: 99.99, currency: 'USD' } }
];

testAmounts.forEach((test, i) => {
    const result = emailParserService.extractAmountAndCurrency(test.text);
    const match = result?.amount === test.expected.amount && result?.currency === test.expected.currency;
    console.log(`  ${i + 1}. "${test.text}"`);
    console.log(`     Resultado: ${result?.currency} ${result?.amount}`);
    console.log(`     Esperado: ${test.expected.currency} ${test.expected.amount}`);
    console.log(`     ${match ? '✅ CORRECTO' : '❌ INCORRECTO'}\n`);
});

console.log('\n📊 RESUMEN DE TESTS\n');
const total = 4 + testAmounts.length;
const passed = (result1 ? 1 : 0) + (result2 ? 1 : 0) + (!result3 ? 1 : 0) + (result4 ? 1 : 0);
console.log(`Tests de regla BCP: ${passed}/4 pasados`);
console.log(`Tests de extracción: Revisar manualmente arriba`);
console.log(`\n${passed === 4 ? '✅ TODOS LOS TESTS PASADOS' : '⚠️ ALGUNOS TESTS FALLARON'}`);
