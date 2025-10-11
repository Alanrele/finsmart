require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');
const fs = require('fs');
const path = require('path');

// Leer transacciones limpias
const transactionsPath = path.join(__dirname, '../data/bcp_transactions_clean.json');
const bcpTransactions = JSON.parse(fs.readFileSync(transactionsPath, 'utf-8'));

console.log(`📦 Cargando ${bcpTransactions.length} transacciones BCP...\n`);

// Mapeo de categorías mejorado basado en comercios reales
function categorizeMerchant(merchant) {
    if (!merchant) return 'other';
    
    const m = merchant.toLowerCase();
    
    // Delivery & Restaurantes
    if (m.includes('pedidosya') || m.includes('rappi') || m.includes('uber eats') || 
        m.includes('didi food') || m.includes('dlc*') || m.includes('restaurante') || 
        m.includes('dona marce') || m.includes('izi*')) {
        return 'food';
    }
    
    // Supermercados
    if (m.includes('metro') || m.includes('plaza vea') || m.includes('tottus') || 
        m.includes('wong') || m.includes('vivanda') || m.includes('agora shop')) {
        return 'food';
    }
    
    // Transporte
    if (m.includes('uber') || m.includes('cabify') || m.includes('beat') || 
        m.includes('taxi') || m.includes('bus') || m.includes('movil bus') ||
        m.includes('primax') || m.includes('repsol') || m.includes('eess')) {
        return 'transport';
    }
    
    // Servicios digitales
    if (m.includes('netflix') || m.includes('spotify') || m.includes('amazon prime') ||
        m.includes('disney') || m.includes('hbo') || m.includes('apple.com/bill') ||
        m.includes('google') || m.includes('microsoft') || m.includes('openai')) {
        return 'entertainment';
    }
    
    // Telecomunicaciones
    if (m.includes('claro') || m.includes('movistar') || m.includes('entel') || 
        m.includes('bitel')) {
        return 'utilities';
    }
    
    // Gaming
    if (m.includes('steam') || m.includes('playstation') || m.includes('xbox') || 
        m.includes('nintendo') || m.includes('twitch')) {
        return 'entertainment';
    }
    
    // Educación
    if (m.includes('utp') || m.includes('universidad') || m.includes('instituto')) {
        return 'education';
    }
    
    // Pagos digitales
    if (m.includes('yape') || m.includes('plin') || m.includes('tunki')) {
        return 'transfer';
    }
    
    // Compras online
    if (m.includes('aliexpress') || m.includes('amazon') || m.includes('mercado libre') ||
        m.includes('linio') || m.includes('joom')) {
        return 'shopping';
    }
    
    return 'other';
}

function mapOperationType(operationType) {
    if (!operationType) return 'expense';
    
    const op = operationType.toLowerCase();
    
    if (op.includes('consumo') || op.includes('pago')) {
        return 'expense';
    }
    if (op.includes('transferencia') || op.includes('envío') || op.includes('envio')) {
        return 'transfer';
    }
    if (op.includes('depósito') || op.includes('deposito') || op.includes('abono')) {
        return 'income';
    }
    if (op.includes('retiro')) {
        return 'expense';
    }
    if (op.includes('devolución') || op.includes('devolucion')) {
        return 'income';
    }
    
    return 'expense';
}

async function importTransactions() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar o crear usuario de prueba
        let user = await User.findOne({ email: process.env.TEST_USER_EMAIL || 'test@example.com' });
        
        if (!user) {
            console.log('⚠️  No se encontró usuario de prueba. Especifica TEST_USER_EMAIL en .env');
            console.log('   O crea un usuario primero en la aplicación.\n');
            process.exit(1);
        }

        console.log(`👤 Importando para usuario: ${user.email}\n`);

        // Estadísticas
        let imported = 0;
        let skipped = 0;
        let errors = 0;

        for (const bcpTx of bcpTransactions) {
            try {
                // Verificar si ya existe por operationNumber
                if (bcpTx.operationNumber) {
                    const existing = await Transaction.findOne({
                        userId: user._id,
                        'metadata.operationNumber': bcpTx.operationNumber
                    });

                    if (existing) {
                        skipped++;
                        continue;
                    }
                }

                // Mapear tipo y categoría
                const type = mapOperationType(bcpTx.operationType);
                const category = categorizeMerchant(bcpTx.merchant);

                // Generar descripción
                let description = 'Transacción bancaria';
                if (bcpTx.merchant) {
                    description = `Pago a ${bcpTx.merchant}`;
                } else if (bcpTx.operationType) {
                    description = bcpTx.operationType;
                }

                // Crear transacción
                const transaction = new Transaction({
                    userId: user._id,
                    amount: Math.abs(bcpTx.amount),
                    type,
                    category,
                    description,
                    date: bcpTx.receivedDate ? new Date(bcpTx.receivedDate) : new Date(),
                    currency: bcpTx.currency || 'PEN',
                    channel: 'online',
                    merchant: bcpTx.merchant || undefined,
                    operationNumber: bcpTx.operationNumber || undefined,
                    cardNumber: bcpTx.cardLast4 ? `****${bcpTx.cardLast4}` : undefined,
                    isAI: true,
                    metadata: {
                        imported: true,
                        importDate: new Date(),
                        operationNumber: bcpTx.operationNumber,
                        originAccount: bcpTx.originAccount,
                        cardLast4: bcpTx.cardLast4,
                        bankDest: bcpTx.bankDest,
                        operationType: bcpTx.operationType,
                        emailSubject: bcpTx.subject,
                        receivedDate: bcpTx.receivedDate ? new Date(bcpTx.receivedDate) : undefined
                    }
                });

                await transaction.save();
                imported++;

                if (imported % 100 === 0) {
                    console.log(`   Procesadas: ${imported} transacciones...`);
                }

            } catch (err) {
                errors++;
                console.error(`❌ Error al importar transacción: ${err.message}`);
            }
        }

        console.log('\n✨ IMPORTACIÓN COMPLETADA\n');
        console.log(`✅ Importadas: ${imported}`);
        console.log(`⏭️  Omitidas (duplicadas): ${skipped}`);
        console.log(`❌ Errores: ${errors}`);
        console.log(`\n📊 Total en BD: ${await Transaction.countDocuments({ userId: user._id })}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Desconectado de MongoDB');
    }
}

importTransactions();
