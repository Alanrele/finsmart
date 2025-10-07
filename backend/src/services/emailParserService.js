const cheerio = require('cheerio');

/**
 * Detecta si un email es transaccional (contiene información de transacciones) o promocional
 */
function isTransactionalEmail(subject, content) {
    // Palabras clave que indican emails transaccionales
    const transactionalKeywords = [
        'realizaste un consumo',
        'realizaste consumo',
        'consumo realizado',
        'transferencia realizada',
        'transferencia recibida',
        'constancia de transferencia',
        'pago de servicio',
        'retiro',
        'depósito',
        'número de operación',
        'numero de operacion',
        'fecha y hora',
        'movimiento realizado',
        'cargo efectuado',
        'abono recibido'
    ];

    // Palabras clave que indican emails promocionales (evitar)
    const promotionalKeywords = [
        'descuento',
        'promoción',
        'oferta',
        'beneficio',
        'gustito',
        'préstamo preaprobado',
        'préstamo tarjetero',
        'tarjeta invita',
        'travel sale',
        'shopping',
        'seguro de viaje',
        'date un gustito',
        'calificas a',
        'descubre beneficios',
        'momento de hacer realidad',
        'clóset con tommy',
        'cafetera de regalo',
        'dólar está a la baja',
        'clara y todo lo que puede',
        'ya revisaste si tienes',
        '15% off',
        'off en tu seguro',
        'super precio',
        'regalamos una cuota',
        'proteger tu auto',
        'ya conoces a clara',
        'inicio de mes',
        'tarjeta de crédito',
        'felicitaciones',
        'llave a un mundo',
        'celebra la magia',
        'renueva tu clóset',
        'tommy hilfiger',
        'calvin klein',
        'magia de la primavera',
        'qore',
        'europa',
        'euros al exterior',
        'millas en el shopping',
        'latam pass',
        'depa propio',
        'activa tu préstamo',
        'mejora tu mes',
        'dinero de vuelta',
        'familia protegida',
        'así sí vale la pena',
        'calificas a una tarjeta',
        'entra y descubre',
        'tu préstamo tarjetero',
        'ya está aprobado',
        'activa',
        'mejora',
        'impulso a tu mes',
        'dale un impulso',
        'revive los clásicos',
        'sinatra en navidad',
        'dto.',
        'descuentos con tarjetas',
        'mundo de promociones',
        'está aquí',
        'renovar',
        'estado de cuenta de tu tarjeta american express'
    ];

    const fullText = (subject + ' ' + content).toLowerCase();

    // Detectar patrones promocionales específicos
    const promotionalPatterns = [
        /\d+%\s*off/i,                    // "15% OFF"
        /💰.*gustito/i,                   // "💰¡Date un gustito"
        /🎁.*regalo/i,                    // "🎁 regalo"
        /🔑.*llave.*mundo/i,              // "🔑 La llave a un mundo"
        /🚀.*activa/i,                    // "🚀 Activa tu"
        /🚨.*renueva/i,                   // "🚨 ¡Alan, renueva"
        /💳.*invita/i,                    // "💳 Alan, tu tarjeta te invita"
        /🎉.*felicitaciones/i,            // "🎉 ¡Felicitaciones!"
        /👀.*inicio.*mes/i,               // "👀 Es inicio de mes"
        /¿.*conoces.*clara/i,             // "¿Ya conoces a Clara"
        /¿.*calificas.*tarjeta/i,         // "¿Calificas a una Tarjeta"
        /celebra.*magia.*primavera/i,     // "Celebra la magia de la primavera"
        /momento.*hacer.*realidad.*depa/i, // "momento de hacer realidad el sueño del depa"
        /✨.*descubre.*beneficios/i,      // "✨ ¡Alan, descubre beneficios"
        /⌛.*recibos.*vencer/i             // "⌛ Tienes recibos que están por vencer"
    ];

    // PRIMERO: Verificar palabras transaccionales fuertes (tienen prioridad)
    const strongTransactionalKeywords = [
        'realizaste un consumo',
        'realizaste consumo',
        'consumo realizado',
        'transferencia realizada',
        'constancia de transferencia'
    ];

    for (const keyword of strongTransactionalKeywords) {
        if (fullText.includes(keyword.toLowerCase())) {
            return true; // Es claramente transaccional
        }
    }

    // SEGUNDO: Verificar patrones promocionales
    for (const pattern of promotionalPatterns) {
        if (pattern.test(fullText)) {
            return false;
        }
    }

    // TERCERO: Si contiene palabras promocionales, probablemente no es transaccional
    for (const keyword of promotionalKeywords) {
        if (fullText.includes(keyword.toLowerCase())) {
            return false;
        }
    }

    // CUARTO: Si contiene otras palabras transaccionales, probablemente es transaccional
    for (const keyword of transactionalKeywords) {
        if (fullText.includes(keyword.toLowerCase())) {
            return true;
        }
    }

    // Si tiene patrones de montos, podría ser transaccional
    const hasAmount = /S\/\s*[\d,]+\.?\d*|US\$\s*[\d,]+\.?\d*|\$\s*[\d,]+\.?\d*/.test(fullText);
    
    return hasAmount;
}

function extractAmountAndCurrency(text) {
    const patterns = [
        { regex: /S\/\s*([\d,]+\.?\d*)/i, currency: 'PEN' },
        { regex: /US\$\s*([\d,]+\.?\d*)/i, currency: 'USD' },
        { regex: /\$\s*([\d,]+\.?\d*)/i, currency: 'USD' }
    ];

    for (const p of patterns) {
        const match = text.match(p.regex);
        if (match) {
            const amountStr = match[1].replace(/,/g, '');
            const amount = parseFloat(amountStr);
            if (!isNaN(amount)) {
                return { amount, currency: p.currency };
            }
        }
    }
    return null;
}

function parseSpanishDate(dateStr) {
    if (!dateStr) return null;
    const months = {
        enero: '01', febrero: '02', marzo: '03', abril: '04',
        mayo: '05', junio: '06', julio: '07', agosto: '08',
        setiembre: '09', septiembre: '09', octubre: '10',
        noviembre: '11', diciembre: '12'
    };

    const dateMatch = dateStr.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!dateMatch) return null;

    const [, day, monthName, year, hour, minute, period] = dateMatch;
    const month = months[monthName.toLowerCase()] || '01';
    let h = parseInt(hour, 10);
    const isPM = period.toUpperCase() === 'PM';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    const hour24 = h.toString().padStart(2, '0');
    const dayPadded = day.padStart(2, '0');
    return `${year}-${month}-${dayPadded} ${hour24}:${minute}`;
}

function parseEmailContent(fullText) {
    let amountInfo = extractAmountAndCurrency(fullText);
    let date = null;
    let originAccount = null;
    let cardLast4 = null;
    let bankDest = null;
    let operationNumber = null;
    let channel = null;
    let beneficiary = null;
    let merchant = null;
    let operationType = null;
    let sendingType = null;
    let paymentType = null;
    let currency = amountInfo?.currency || null;

    if (fullText.includes('<html') || fullText.includes('<body')) {
        const $ = cheerio.load(fullText);

        $('table tr').each((i, row) => {
            const $row = $(row);
            const $cells = $row.find('td');
            if ($cells.length < 2) return;

            const label = $cells.first().text().trim().replace(/\s+/g, ' ');
            let value = $cells.last().text().trim().replace(/\s+/g, ' ');
            value = value.replace(/\*\*\*\*\s*/g, '').split('\n')[0].trim();

            const lowerLabel = label.toLowerCase();

            if (lowerLabel.includes('fecha y hora')) {
                date = parseSpanishDate(value);
            } else if (lowerLabel.includes('banco destino')) {
                bankDest = value;
            } else if (lowerLabel.includes('número de operación') || lowerLabel.includes('numero de operacion')) {
                operationNumber = value;
            } else if (lowerLabel.includes('canal')) {
                channel = value;
            } else if (lowerLabel.includes('desde') && value.match(/\d{4}$/)) {
                const match = value.match(/(\d{4})$/);
                originAccount = match ? match[1] : null;
            } else if (lowerLabel.includes('enviado a') || lowerLabel.includes('beneficiario')) {
                // Eliminar últimos 4 dígitos si están al final del nombre
                beneficiary = value.replace(/\s*\d{4}$/, '').trim();
            } else if (lowerLabel.includes('operación realizada') || lowerLabel.includes('operacion realizada')) {
                operationType = value;
            } else if (lowerLabel.includes('tipo de envío') || lowerLabel.includes('tipo de envio')) {
                sendingType = value;
            }
            // --- Nuevos campos ---
            else if (lowerLabel.includes('pagado a')) {
                const match = value.match(/(\d{4})$/);
                cardLast4 = match ? match[1] : null;
            } else if (lowerLabel.includes('tipo de pago')) {
                paymentType = value;
            } else if (lowerLabel.includes('número de tarjeta de débito') || lowerLabel.includes('numero de tarjeta de debito')) {
                const match = value.match(/(\d{4})$/);
                cardLast4 = match ? match[1] : null;
            } else if (lowerLabel.includes('empresa') || lowerLabel.includes('comercio')) {
                merchant = value;
            }
        });

        // Buscar monto en negritas si no se encontró
        if (!amountInfo) {
            $('b').each((i, el) => {
                const text = $(el).text();
                const match = extractAmountAndCurrency(text);
                if (match) {
                    amountInfo = match;
                    currency = match.currency;
                }
            });
        }
    }

    return {
        amount: amountInfo?.amount || null,
        currency: currency || null,
        date: date || null,
        originAccount: originAccount || null,
        cardLast4: cardLast4 || null,
        bankDest: bankDest || null,
        operationNumber: operationNumber || null,
        channel: channel || null,
        beneficiary: beneficiary || null,
        merchant: merchant || null,
        operationType: operationType || null,
        sendingType: sendingType || null,
        paymentType: paymentType || null
    };
}

/**
 * Clasifica el tipo de transacción basado en la información extraída
 */
function classifyTransactionType(parsedData) {
    const { operationType, sendingType, paymentType, merchant, beneficiary, amount } = parsedData;

    // Determinar si es ingreso o gasto
    let type = 'payment'; // Default type that exists in enum
    let category = 'other'; // Default category in lowercase

    if (operationType) {
        const opType = operationType.toLowerCase();

        // Ingresos
        if (opType.includes('depósito') || opType.includes('deposito') ||
            opType.includes('transferencia recibida') || opType.includes('abono')) {
            type = 'deposit';
            category = 'income'; // 'income' is valid in enum
        }
        // Transferencias enviadas
        else if (opType.includes('transferencia') || opType.includes('envío')) {
            type = 'transfer';
            category = 'transfer';
        }
        // Pagos
        else if (opType.includes('pago')) {
            type = 'payment';
            if (merchant) {
                category = 'shopping';
            } else {
                category = 'other';
            }
        }
        // Retiros
        else if (opType.includes('retiro')) {
            type = 'withdrawal';
            category = 'other';
        }
        // Compras/consumos
        else if (opType.includes('consumo') || opType.includes('compra')) {
            type = 'debit';
            category = 'shopping';
        }
    }

    // Categorización más específica basada en el beneficiario o comercio
    if (merchant || beneficiary) {
        const entity = (merchant || beneficiary).toLowerCase();

        if (entity.includes('supermercado') || entity.includes('market') || entity.includes('tienda')) {
            category = 'food';
        } else if (entity.includes('gasolina') || entity.includes('grifo') || entity.includes('combustible')) {
            category = 'transport';
        } else if (entity.includes('restaurante') || entity.includes('restaurant') || entity.includes('comida')) {
            category = 'food';
        } else if (entity.includes('farmacia') || entity.includes('clinic') || entity.includes('hospital')) {
            category = 'healthcare';
        } else if (entity.includes('luz') || entity.includes('agua') || entity.includes('gas') || entity.includes('telefon')) {
            category = 'utilities';
        } else if (entity.includes('cine') || entity.includes('entretenimiento') || entity.includes('netflix')) {
            category = 'entertainment';
        }
    }

    return { type, category };
}

/**
 * Convierte la información parseada en una transacción para la base de datos
 */
function createTransactionFromEmail(parsedData, userId, emailData) {
    const { type, category } = classifyTransactionType(parsedData);

    // Generar descripción
    let description = 'Transacción bancaria';
    if (parsedData.merchant) {
        description = `Pago a ${parsedData.merchant}`;
    } else if (parsedData.beneficiary) {
        description = `Transferencia a ${parsedData.beneficiary}`;
    } else if (parsedData.operationType) {
        description = parsedData.operationType;
    }

    return {
        userId,
        amount: Math.abs(parsedData.amount || 0),
        type,
        category,
        description,
        date: parsedData.date ? new Date(parsedData.date) : new Date(),
        currency: parsedData.currency || 'PEN',
        channel: 'other', // Changed from 'Email Import' to valid enum value
        isAI: true, // Marcamos como procesado por IA
        metadata: {
            emailId: emailData.id,
            emailSubject: emailData.subject,
            operationNumber: parsedData.operationNumber,
            originAccount: parsedData.originAccount,
            cardLast4: parsedData.cardLast4,
            bankDest: parsedData.bankDest,
            sendingType: parsedData.sendingType,
            paymentType: parsedData.paymentType,
            processedAt: new Date()
        }
    };
}

module.exports = {
    parseEmailContent,
    extractAmountAndCurrency,
    parseSpanishDate,
    classifyTransactionType,
    createTransactionFromEmail,
    isTransactionalEmail
};
