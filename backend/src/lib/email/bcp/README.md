# BCP Email Parser V2

Este directorio agrupa la lógica inicial del Parser V2 para correos del BCP.

## Detección de plantillas

* `detectTemplate.js` define las reglas por plantilla. Cada entrada requiere:
  * Expresiones regulares para el **subject**.
  * Anclas mínimas (≥2) que deben aparecer en el cuerpo normalizado.
  * Prioridad opcional para resolver empates.

## Campos extraídos

Los parsers deben producir objetos que cumplan con `NormalizedTransactionSchema`:

* `source`: siempre `"BCP"`.
* `template`: nombre de la plantilla (`card_purchase`, `online_purchase`, etc.).
* `occurredAt`: ISO string con zona `America/Lima`.
* `amount`: `{ currency: "PEN" | "USD", value: string }`.
* `exchangeRate`: `{ used: boolean, rate?: string }`.
* Campos opcionales: `balanceAfter`, `channel`, `merchant`, `location`, `cardLast4`, `accountRef`, `operationId`, `notes`.
* `confidence`: número `[0,1]` que refleja cuánta evidencia se encontró.

## Agregar nuevas plantillas

1. Añade una entrada en `detectTemplate.ts` con sus reglas.
2. Implementa un parser en `parsers/` que devuelva un objeto completo validado por Zod.
3. Actualiza el orquestador `parseBcpEmailV2.js` para mapear la plantilla al nuevo parser.
4. Crea fixtures y tests en `tests/email/bcp/` (idealmente con snapshots).

