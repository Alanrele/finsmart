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
        'numero de operacion',
        'número de operación',
        'fecha y hora',
        'movimiento realizado',
        'cargo efectuado',
        'abono recibido'
    ];

    // Palabras clave que indican emails promocionales (evitar)
    const promotionalKeywords = [
        'descuento', 'promoción', 'oferta', 'beneficio', 'gustito',
        'préstamo preaprobado', 'préstamo tarjetero', 'tarjeta invita',
        'travel sale', 'shopping', 'seguro de viaje', 'date un gustito',
        'calificas a', 'descubre beneficios', 'momento de hacer realidad',
        'clóset con tommy', 'cafetera de regalo', 'dólar está a la baja',
        'clara y todo lo que puede', 'ya revisaste si tienes', '15% off',
        'off en tu seguro', 'super precio', 'regalamos una cuota',
        'proteger tu auto', 'ya conoces a clara', 'inicio de mes',
        'tarjeta de crédito', 'felicitaciones', 'llave a un mundo',
        'celebra la magia', 'renueva tu clóset', 'tommy hilfiger',
        'calvin klein', 'magia de la primavera', 'qore', 'europa',
        'euros al exterior', 'millas en el shopping', 'latam pass',
        'depa propio', 'activa tu préstamo', 'mejora tu mes', 'dinero de vuelta',
        'familia protegida', 'así sí vale la pena', 'calificas a una tarjeta',
        'entra y descubre', 'tu préstamo tarjetero', 'ya está aprobado',
        'activa', 'mejora', 'impulso a tu mes', 'dale un impulso',
        'revive los clásicos', 'sinatra en navidad', 'dto.',
        'descuentos con tarjetas', 'mundo de promociones', 'está aquí',
        'renovar', 'estado de cuenta de tu tarjeta american express',
        'estado de cuenta', 'newsletter', 'suscríbete', 'suscribete',
        'publicidad', 'promo', 'club', 'puntos', 'programa de beneficios',
        // Correos corporativos informativos típicos (no transaccionales)
        'póliza', 'poliza', 'endoso', 'buzón', 'buzon'
    ];

    const fullText = (subject + ' ' + (content || '')).toLowerCase();

    // Detectar patrones promocionales específicos
    const promotionalPatterns = [
        /\d+%\s*off/i,                    // "15% OFF"
        /💰.*gustito/i,
        /🎁.*regalo/i,
        /🔑.*llave.*mundo/i,
        /🚀.*activa/i,
        /🚨.*renueva/i,
        /💳.*invita/i,
        /🎉.*felicitaciones/i,
        /👀.*inicio.*mes/i,
        /¿.*conoces.*clara/i,
        /¿.*calificas.*tarjeta/i,
        /celebra.*magia.*primavera/i,
        /momento.*hacer.*realidad.*depa/i,
        /✨.*descubre.*beneficios/i,
        /⌛.*recibos.*vencer/i
    ];

    // Señales fuertes de transacción
    const strongTransactionalKeywords = [
        'realizaste un consumo',
        'realizaste consumo',
        'consumo realizado',
        'transferencia realizada',
        'constancia de transferencia'
    ];

    // Patrones de evidencia adicional
    const hasAmount = /S\/\s*[\d\.\,]+|US\$\s*[\d\.\,]+|\$\s*[\d\.\,]+/.test(fullText);
    const hasOperationNumber = /(n[úu]mero\s+de\s+operaci[oó]n|operaci[oó]n\s*(n[°º]|num\.?|#)\s*[:\-]?\s*\d+)/i.test(fullText);
    const hasDate = /(fecha\s+y\s+hora|\d{1,2}\s+de\s+\w+\s+de\s+\d{4}\s*-\s*\d{1,2}:\d{2}\s*(am|pm))/i.test(fullText);

    // 1) Bloquear promociones primero
    for (const pattern of promotionalPatterns) {
        if (pattern.test(fullText)) return false;
    }
    for (const keyword of promotionalKeywords) {
        if (fullText.includes(keyword.toLowerCase())) return false;
    }

    // 2) Aceptar solo si hay señales transaccionales + evidencia (monto u otro)
    if (strongTransactionalKeywords.some(k => fullText.includes(k))) {
        return hasAmount || hasOperationNumber || hasDate;
    }
    if (transactionalKeywords.some(k => fullText.includes(k))) {
        return (hasAmount && (hasOperationNumber || hasDate)) || hasOperationNumber;
    }

    // 3) Si no hay palabras transaccionales, aunque haya monto, NO aceptar
    return false;
}

function extractAmountAndCurrency(text) {
    // Soporta formatos peruanos: "S/ 1,234.56", "S/ 1.234,56", "S/. 123,45", "PEN 123,45"
    // y USD: "US$ 1,234.56", "$ 123.45"
    const patterns = [
        { regex: /(S\/?\.?|PEN)\s*([\d\.\,]+\d)/i, currency: 'PEN' },
        { regex: /(US\$)\s*([\d\.\,]+\d)/i, currency: 'USD' },
        { regex: /(^|\s)\$\s*([\d\.\,]+\d)/i, currency: 'USD' }
    ];

    // Normaliza un número en string detectando correctamente separadores de miles/decimales
    const normalizeNumber = (raw) => {
        if (!raw) return NaN;
        let s = raw.trim();

        // Si contiene tanto coma como punto, decidir el decimal como el separador más a la derecha
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        if (lastComma !== -1 && lastDot !== -1) {
            // Si la coma está a la derecha del punto: coma = decimal (formato europeo)
            const decimalIsComma = lastComma > lastDot;
            if (decimalIsComma) {
                s = s.replace(/\./g, ''); // quitar separadores miles
                s = s.replace(/,/g, '.');  // decimal -> punto
            } else {
                // punto es decimal (formato US)
                s = s.replace(/,/g, '');
            }
        } else if (lastComma !== -1 && lastDot === -1) {
            // Solo coma: asume formato europeo -> decimal
            s = s.replace(/\./g, ''); // seguridad
            s = s.replace(/,/g, '.');
        } else {
            // Solo punto o ninguno: remover comas de miles si hubiese
            s = s.replace(/,/g, '');
        }

        const num = parseFloat(s);
        if (isNaN(num)) return NaN;
        // Redondea a 2 decimales para estabilidad
        return Math.round(num * 100) / 100;
    };

    for (const p of patterns) {
        const match = text.match(p.regex);
        if (match) {
            const amountStr = match[2];
            const amount = normalizeNumber(amountStr);
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
function mapChannel(value) {
    if (!value) return 'other';
    const v = String(value).toLowerCase();
    if (v.includes('atm') || v.includes('cajero')) return 'atm';
    if (v.includes('pos') || v.includes('terminal') || v.includes('comercio')) return 'pos';
    if (v.includes('móvil') || v.includes('movil') || v.includes('app')) return 'mobile';
    if (v.includes('web') || v.includes('online') || v.includes('internet')) return 'online';
    if (v.includes('agencia') || v.includes('sucursal') || v.includes('branch')) return 'branch';
    return 'other';
}

function isValidParsedTransaction(parsedData, emailMeta = {}) {
    if (!parsedData) return false;
    // Must have positive amount and a currency
    if (!parsedData.amount || parsedData.amount <= 0) return false;
    if (!parsedData.currency) return false;
    // Must contain at least one identifier to give context
    const hasIdentifier = !!(parsedData.operationNumber || parsedData.merchant || parsedData.beneficiary || parsedData.operationType);
    if (!hasIdentifier) return false;
    // Subject/received date are expected from email meta but not strictly required here
    return true;
}

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
        date: parsedData.date ? new Date(parsedData.date) : (emailData?.receivedDateTime ? new Date(emailData.receivedDateTime) : new Date()),
        currency: parsedData.currency || 'PEN',
        channel: mapChannel(parsedData.channel),
        merchant: parsedData.merchant || parsedData.beneficiary || undefined,
        operationNumber: parsedData.operationNumber || undefined,
        cardNumber: parsedData.cardLast4 ? `****${parsedData.cardLast4}` : undefined,
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
            receivedDate: emailData.receivedDateTime ? new Date(emailData.receivedDateTime) : undefined,
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
    isTransactionalEmail,
    isValidParsedTransaction
};
