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
        'constancia de pago',
        'pago de servicio',
        'pago de tarjeta',
        'retiro',
        'depósito',
        'numero de operacion',
        'número de operación',
        'fecha y hora',
        'movimiento realizado',
        'cargo efectuado',
        'abono recibido',
        'devolución',
        'devuelto'
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
        'póliza', 'poliza', 'endoso', 'buzón', 'buzon',
        'póliza de seguro', 'poliza de seguro', 'endoso de póliza', 'endoso de poliza',
        'este correo no requiere acción', 'este correo no requiere accion',
        'si decides realizar el cambio', 'debes enviarnos la póliza', 'debes enviarnos la poliza'
    ];

    const fullText = (subject + ' ' + (content || '')).toLowerCase();

    // Rechazar explícitamente frases negativas comunes
    const negativePhrases = [
        'no es una transaccion',
        'no es una transacción',
        'no es una operacion',
        'no es una operación',
        'no corresponde a una transaccion',
        'no corresponde a una transacción',
        // Bloques de avisos corporativos que causaban falsos positivos
        'si decides realizar el cambio',
        'debes enviarnos la póliza',
        'debes enviarnos la poliza'
    ];
    for (const phrase of negativePhrases) {
        if (fullText.includes(phrase)) return false;
    }

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
        'consumo tarjeta de débito',
        'transferencia realizada',
        'constancia de transferencia',
        'constancia de pago',
        'pago de tarjeta',
        'devolución'
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
    //    pero rechazar si también hay indicadores corporativos
    const corporateBlockers = [/p[óo]liza/, /endoso/, /si decides realizar el cambio/, /debes enviarnos la p[óo]liza/];
    if (corporateBlockers.some(rx => rx.test(fullText))) {
        return false;
    }

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
    // Busca TODAS las apariciones de montos con moneda y elige la mejor por contexto
    // Soporta formatos: "S/ 1,234.56", "S/. 1.234,56", "PEN 123,45", "US$ 1,234.56", "$ 123.45"
    if (!text) return null;

    const patterns = [
        { regex: /(S\/?\.?|PEN)\s*([0-9][\d\.,]*\d)/gi, currency: 'PEN' },
        { regex: /(US\$)\s*([0-9][\d\.,]*\d)/gi, currency: 'USD' },
        { regex: /(^|\s)\$\s*([0-9][\d\.,]*\d)/gi, currency: 'USD' }
    ];

    const normalizeNumber = (raw) => {
        if (!raw) return NaN;
        let s = String(raw).replace(/\s+/g, '').trim();

        // Decidir separador decimal por el último símbolo entre coma y punto
        const lastComma = s.lastIndexOf(',');
        const lastDot = s.lastIndexOf('.');
        if (lastComma !== -1 && lastDot !== -1) {
            const decimalIsComma = lastComma > lastDot;
            if (decimalIsComma) {
                s = s.replace(/\./g, '');
                s = s.replace(/,/g, '.');
            } else {
                s = s.replace(/,/g, '');
            }
        } else if (lastComma !== -1) {
            s = s.replace(/\./g, '');
            s = s.replace(/,/g, '.');
        } else {
            s = s.replace(/,/g, '');
        }

        const num = parseFloat(s);
        if (!isFinite(num)) return NaN;
        return Math.round(num * 100) / 100;
    };

    const candidates = [];
    for (const p of patterns) {
        let match;
        while ((match = p.regex.exec(text)) !== null) {
            const idx = match.index || 0;
            const amountStr = match[2];
            const amount = normalizeNumber(amountStr);
            if (isNaN(amount)) continue;

            // Contexto alrededor del match para puntuar
            const start = Math.max(0, idx - 60);
            const end = Math.min(text.length, idx + (match[0]?.length || 0) + 40);
            const ctx = text.substring(start, end).toLowerCase();
            // Ventanas locales inmediatas para etiquetas cercanas
            const preLocal = text.substring(Math.max(0, idx - 24), idx).toLowerCase();
            const postLocal = text.substring(idx, Math.min(text.length, idx + 24)).toLowerCase();

            let score = 0;
            // Señales positivas
            if (/monto|importe|consumo|pagado|pago|transferencia|devoluci[óo]n/.test(preLocal + postLocal)) score += 4; // cercano al monto
            else if (/monto|importe|consumo|pagado|pago|transferencia|devoluci[óo]n/.test(ctx)) score += 2; // un poco más lejos
            if (/:\s*(s\/?|us\$|\$)/i.test(preLocal + postLocal)) score += 1; // etiqueta inmediata "monto: S/"

            // Señales negativas: saldos, límites, disponible
            const negLabel = /saldo|disponible|l[íi]mite|estado de cuenta|l[íi]nea de cr[ée]dito/;
            if (negLabel.test(preLocal) || /^\s*(saldo|disponible)/.test(postLocal)) score -= 8; // etiqueta local
            else if (negLabel.test(ctx)) score -= 3; // mencionar lejos penaliza menos

            // Contexto corporativo (seguros/pólizas) que no debe contar como monto de transacción
            if (/p[óo]liza|endoso|seguro|cotizaci[óo]n|prima|n[°º]\s*de\s*p[óo]liza/.test(ctx)) score -= 8;

            // Penaliza cantidades anormalmente grandes (posible concatenación errónea)
            if (amount > 50_000_000) score -= 10;

            candidates.push({ amount, currency: p.currency, score, idx });
        }
    }

    if (candidates.length === 0) return null;

    // Ordenar por mayor score y, en empate, por mayor cercanía al inicio del contenido (asume primer monto relevante)
    candidates.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
    const best = candidates[0];

    // Filtro final adicional: descartar montos provenientes de "saldo" si dominaron el contexto
    if (best.score <= -1) {
        // Buscar siguiente candidato no negativo
        const alt = candidates.find(c => c.score >= 0);
        if (alt) return { amount: alt.amount, currency: alt.currency };
    }

    return { amount: best.amount, currency: best.currency };
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
            } else if ((/monto|importe/.test(lowerLabel)) && !/saldo|disponible/.test(lowerLabel)) {
                // Extraer monto preferentemente de la fila "Monto" o "Importe"
                const extracted = extractAmountAndCurrency(value);
                if (extracted) {
                    amountInfo = extracted;
                    currency = extracted.currency;
                } else {
                    // Si no trae moneda, intentar normalizar solo el número y usar moneda detectada en texto
                    const numMatch = value.match(/[0-9][\d\.,]*\d/);
                    if (numMatch) {
                        const tmp = numMatch[0];
                        // Reutilizamos la normalización interna de extractAmountAndCurrency
                        const n = (function normalizeForTable(raw){
                            let s = String(raw).replace(/\s+/g,'').trim();
                            const lastComma = s.lastIndexOf(',');
                            const lastDot = s.lastIndexOf('.');
                            if (lastComma !== -1 && lastDot !== -1) {
                                const decimalIsComma = lastComma > lastDot;
                                if (decimalIsComma) { s = s.replace(/\./g,''); s = s.replace(/,/g,'.'); }
                                else { s = s.replace(/,/g,''); }
                            } else if (lastComma !== -1) { s = s.replace(/\./g,''); s = s.replace(/,/g,'.'); }
                            else { s = s.replace(/,/g,''); }
                            const num = parseFloat(s);
                            return isFinite(num) ? Math.round(num*100)/100 : NaN;
                        })(tmp);
                        if (!isNaN(n)) {
                            amountInfo = { amount: n, currency: currency || null };
                        }
                    }
                }
            }
            // --- Nuevos campos ---
            else if (lowerLabel.includes('pagado a')) {
                const match = value.match(/(\d{4})$/);
                cardLast4 = match ? match[1] : null;
                // Extract merchant name before the masked digits if present
                const cleaned = value.replace(/\s*(\*{4,}|[*•]{4,})?\s*\d{4}\s*$/, '').trim();
                if (cleaned) merchant = cleaned;
            } else if (lowerLabel.includes('tipo de pago')) {
                paymentType = value;
            } else if (
                lowerLabel.includes('número de tarjeta de débito') ||
                lowerLabel.includes('numero de tarjeta de debito') ||
                lowerLabel.includes('número de tarjeta') ||
                lowerLabel.includes('numero de tarjeta')
            ) {
                const match = value.match(/(\d{4})$/);
                cardLast4 = match ? match[1] : null;
            } else if (lowerLabel.includes('empresa') || lowerLabel.includes('comercio') || lowerLabel.includes('nombre del comercio')) {
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

    // Fallbacks when HTML table doesn't include explicit fields
    // 1) Try to detect last 4 digits from mask patterns in free text
    if (!cardLast4) {
        const maskMatch = fullText.match(/(?:\*{4,}|[*•]{4,})\s*([0-9]{4})/);
        if (maskMatch) {
            cardLast4 = maskMatch[1];
        }
    }

    // 2) Infer operation type from narrative text if missing
    if (!operationType) {
        const txt = fullText.toLowerCase();
        if (/(devoluci[óo]n|devuelto)/i.test(txt)) {
            operationType = 'Devolución';
        } else if (/realizaste\s+un\s+consumo|consumo\s+tarjeta/i.test(txt)) {
            operationType = 'Consumo Tarjeta de Débito';
        } else if (/pago\s+de\s+tarjeta/i.test(txt)) {
            operationType = 'Pago de tarjeta';
        }
    }

    // 3) Infer currency from "Moneda Soles" if amount was parsed without currency
    if (!currency && /moneda\s+sol(es)?/i.test(fullText)) {
        currency = 'PEN';
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
        // Devoluciones / reembolsos
        else if (opType.includes('devoluci') || opType.includes('devuelto') || opType.includes('reembolso')) {
            type = 'deposit';
            category = 'income';
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

    // Guardrail adicional por si llegara un monto inflado
    const MAX_REASONABLE_AMOUNT = 10_000_000; // 10 millones
    const safeAmount = Math.min(Math.abs(parsedData.amount || 0), MAX_REASONABLE_AMOUNT);

    return {
        userId,
        amount: safeAmount,
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
