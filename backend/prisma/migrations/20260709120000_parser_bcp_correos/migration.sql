-- Parser BCP de correos: trazabilidad del comercio, bandeja de revisión y
-- llave fuerte de deduplicación por número de operación.
-- IF NOT EXISTS: idempotente — connectDb() garantiza lo mismo en dev local.

-- Empresa tal como llegó en el correo (comercio_raw)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "merchant_raw" TEXT;

-- Bandeja de correos no procesables
CREATE TABLE IF NOT EXISTS "email_reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "subject" TEXT,
    "receivedAt" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "snippet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "email_reviews_userId_messageId_key"
    ON "email_reviews" ("userId", "messageId");

DO $$ BEGIN
    ALTER TABLE "email_reviews"
        ADD CONSTRAINT "email_reviews_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

