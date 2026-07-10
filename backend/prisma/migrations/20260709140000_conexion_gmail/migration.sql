-- Conexión Gmail (OAuth de Google): reemplaza la sincronización por Outlook.
-- Tokens propios para no chocar con los campos de Microsoft existentes.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_email" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_access_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_refresh_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_token_expiry" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gmail_last_sync" TIMESTAMP(3);
