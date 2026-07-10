-- Llave fuerte de deduplicación: número de operación del BCP, único por
-- usuario. Índice PARCIAL (solo cuando hay número): los movimientos de PDF
-- sin número de operación no chocan entre sí. Respalda en BD el dedup de
-- nivel 1 que el código aplica antes de insertar.
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_userId_operationNumber_unique"
    ON "transactions" ("userId", "operationNumber")
    WHERE "operationNumber" IS NOT NULL;
