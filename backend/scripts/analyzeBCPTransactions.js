const fs = require('fs');
const path = require('path');

// Leer transacciones BCP reales
const transactions = require('../data/bcp_transactions.json');

console.log('📊 ANÁLISIS DE TRANSACCIONES BCP REALES\n');
console.log(`Total de transacciones: ${transactions.length}`);

// 1. ANÁLISIS DE DUPLICADOS
const duplicates = {};
const uniqueByOperation = new Map();

transactions.forEach((tx, index) => {
  const opNum = tx.operationNumber;
  if (opNum) {
    if (uniqueByOperation.has(opNum)) {
      if (!duplicates[opNum]) {
        duplicates[opNum] = [uniqueByOperation.get(opNum)];
      }
      duplicates[opNum].push(index);
    } else {
      uniqueByOperation.set(opNum, index);
    }
  }
});

console.log(`\n🔍 Duplicados encontrados: ${Object.keys(duplicates).length}`);
if (Object.keys(duplicates).length > 0) {
  console.log('\nEjemplos de duplicados:');
  Object.entries(duplicates).slice(0, 5).forEach(([opNum, indices]) => {
    console.log(`  ${opNum}: ${indices.length} ocurrencias`);
  });
}

// 2. ANÁLISIS DE COMERCIOS (MERCHANTS)
const merchantCount = {};
transactions.forEach(tx => {
  if (tx.merchant) {
    merchantCount[tx.merchant] = (merchantCount[tx.merchant] || 0) + 1;
  }
});

const topMerchants = Object.entries(merchantCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

console.log('\n🏪 Top 20 Comercios más frecuentes:');
topMerchants.forEach(([merchant, count], i) => {
  console.log(`  ${i + 1}. ${merchant}: ${count} transacciones`);
});

// 3. ANÁLISIS DE TIPOS DE OPERACIÓN
const operationTypes = {};
transactions.forEach(tx => {
  const type = tx.operationType || 'Sin tipo';
  operationTypes[type] = (operationTypes[type] || 0) + 1;
});

console.log('\n📝 Tipos de operación encontrados:');
Object.entries(operationTypes)
  .sort((a, b) => b[1] - a[1])
  .forEach(([type, count]) => {
    console.log(`  ${type}: ${count} transacciones`);
  });

// 4. ANÁLISIS DE PATRONES EN SUBJECTS
const subjectPatterns = {};
transactions.forEach(tx => {
  if (tx.subject) {
    const normalized = tx.subject
      .toLowerCase()
      .replace(/\d+/g, '')
      .trim();
    subjectPatterns[normalized] = (subjectPatterns[normalized] || 0) + 1;
  }
});

console.log('\n📧 Patrones de asuntos (subjects):');
Object.entries(subjectPatterns)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([pattern, count]) => {
    console.log(`  [${count}x] ${pattern.substring(0, 80)}...`);
  });

// 5. ANÁLISIS DE MONTOS
const amounts = transactions.map(tx => tx.amount).filter(a => a != null);
const avgAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
const maxAmount = Math.max(...amounts);
const minAmount = Math.min(...amounts);

console.log('\n💰 Estadísticas de montos:');
console.log(`  Promedio: S/ ${avgAmount.toFixed(2)}`);
console.log(`  Máximo: S/ ${maxAmount.toFixed(2)}`);
console.log(`  Mínimo: S/ ${minAmount.toFixed(2)}`);

// 6. ANÁLISIS DE MONEDAS
const currencies = {};
transactions.forEach(tx => {
  const curr = tx.currency || 'No especificado';
  currencies[curr] = (currencies[curr] || 0) + 1;
});

console.log('\n💵 Distribución de monedas:');
Object.entries(currencies).forEach(([curr, count]) => {
  console.log(`  ${curr}: ${count} transacciones`);
});

// 7. ORDENAR POR FECHA (MÁS RECIENTE PRIMERO) Y ELIMINAR DUPLICADOS
console.log('\n🔄 Procesando: Ordenar por fecha y eliminar duplicados...');

// Crear mapa de transacciones únicas (última ocurrencia por operationNumber)
const uniqueTransactions = new Map();

transactions.forEach(tx => {
  const opNum = tx.operationNumber;
  if (opNum) {
    // Si ya existe, comparar fechas y quedarse con la más reciente
    if (uniqueTransactions.has(opNum)) {
      const existing = uniqueTransactions.get(opNum);
      const existingDate = new Date(existing.receivedDate);
      const currentDate = new Date(tx.receivedDate);
      
      if (currentDate > existingDate) {
        uniqueTransactions.set(opNum, tx);
      }
    } else {
      uniqueTransactions.set(opNum, tx);
    }
  } else {
    // Si no tiene operationNumber, usar timestamp único
    uniqueTransactions.set(`${tx.receivedDate}_${Math.random()}`, tx);
  }
});

// Convertir a array y ordenar por fecha descendente
const cleanedTransactions = Array.from(uniqueTransactions.values())
  .sort((a, b) => new Date(b.receivedDate) - new Date(a.receivedDate));

console.log(`\n✅ Transacciones únicas: ${cleanedTransactions.length}`);
console.log(`   Duplicados eliminados: ${transactions.length - cleanedTransactions.length}`);

// 8. GUARDAR ARCHIVO LIMPIO
const outputPath = path.join(__dirname, '../data/bcp_transactions_clean.json');
fs.writeFileSync(outputPath, JSON.stringify(cleanedTransactions, null, 2));
console.log(`\n💾 Archivo limpio guardado en: ${outputPath}`);

// 9. EXTRAER PATRONES PARA CATEGORIZACIÓN
console.log('\n🏷️  PATRONES PARA CATEGORIZACIÓN AUTOMÁTICA:\n');

const categories = {
  'Supermercados': ['METRO', 'PLAZA VEA', 'TOTTUS', 'WONG', 'VIVANDA'],
  'Restaurantes': ['RESTAURANT', 'BEMBOS', 'KFC', 'PIZZA', 'MCDONALD', 'BURGER'],
  'Gasolina': ['PRIMAX', 'REPSOL', 'PETROPER', 'EESS', 'GRIFO'],
  'Transporte': ['UBER', 'CABIFY', 'BEAT', 'TAXI', 'PEAJE'],
  'Servicios': ['NETFLIX', 'SPOTIFY', 'AMAZON', 'GOOGLE', 'MICROSOFT', 'OPENAI'],
  'Compras Online': ['ALIEXPRESS', 'AMAZON', 'MERCADO LIBRE', 'LINIO', 'JOOM'],
  'Entretenimiento': ['CINEPLANET', 'CINEMARK', 'TWITCH', 'STEAM', 'PLAYSTATION'],
  'Telecomunicaciones': ['CLARO', 'MOVISTAR', 'ENTEL', 'BITEL'],
  'Transferencias': ['TRANSFERENCIA', 'CONSTANCIA DE TRANSFERENCIA'],
  'Yape': ['YAPE'],
  'Educación': ['UNIVERSIDAD', 'INSTITUTO', 'COLEGIO', 'ACADEMIA'],
  'Salud': ['FARMACIA', 'BOTICA', 'INKAFARMA', 'MIFARMA', 'CLINICA', 'HOSPITAL'],
  'Otros': []
};

// Clasificar merchants por categoría
const merchantsByCategory = {};
topMerchants.forEach(([merchant]) => {
  const upperMerchant = merchant.toUpperCase();
  let found = false;
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => upperMerchant.includes(kw))) {
      if (!merchantsByCategory[category]) {
        merchantsByCategory[category] = [];
      }
      merchantsByCategory[category].push(merchant);
      found = true;
      break;
    }
  }
  
  if (!found) {
    if (!merchantsByCategory['Otros']) {
      merchantsByCategory['Otros'] = [];
    }
    merchantsByCategory['Otros'].push(merchant);
  }
});

Object.entries(merchantsByCategory)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([category, merchants]) => {
    console.log(`\n${category} (${merchants.length}):`);
    merchants.slice(0, 5).forEach(m => {
      console.log(`  - ${m}`);
    });
    if (merchants.length > 5) {
      console.log(`  ... y ${merchants.length - 5} más`);
    }
  });

console.log('\n✨ Análisis completado!\n');
