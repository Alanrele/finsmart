-- Membresía Platinum + trial único de 7 días.
-- IF NOT EXISTS: idempotente a propósito — en desarrollo local las columnas
-- también se garantizan al arrancar el servidor (connectDb), y este archivo
-- debe poder aplicarse después sin fallar.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "es_platinum" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_usado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "trial_iniciado_en" TIMESTAMP(3);
