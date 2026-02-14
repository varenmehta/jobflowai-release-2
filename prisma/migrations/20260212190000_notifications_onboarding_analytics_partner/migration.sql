-- Add enum for notifications
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
    CREATE TYPE "NotificationType" AS ENUM ('APP_STATUS', 'PARTNER', 'ACCOUNT', 'SYSTEM');
  END IF;
END $$;

-- Add source message id to email events for provider-level dedupe
ALTER TABLE "EmailEvent"
ADD COLUMN IF NOT EXISTS "sourceMessageId" TEXT;

-- Create notifications table
CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
  "title" TEXT NOT NULL,
  "body" TEXT,
  "href" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Remove duplicates before creating application uniqueness
DELETE FROM "Application" a
USING "Application" b
WHERE a."id" > b."id"
  AND a."userId" = b."userId"
  AND a."jobId" = b."jobId";

-- Remove duplicates before creating email event uniqueness (only where sourceMessageId exists)
DELETE FROM "EmailEvent" a
USING "EmailEvent" b
WHERE a."id" > b."id"
  AND a."sourceMessageId" IS NOT NULL
  AND b."sourceMessageId" IS NOT NULL
  AND a."userId" = b."userId"
  AND a."provider" = b."provider"
  AND a."sourceMessageId" = b."sourceMessageId";

-- Add new constraints/indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Application_userId_jobId_key'
  ) THEN
    ALTER TABLE "Application"
    ADD CONSTRAINT "Application_userId_jobId_key" UNIQUE ("userId", "jobId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EmailEvent_userId_provider_sourceMessageId_key'
  ) THEN
    ALTER TABLE "EmailEvent"
    ADD CONSTRAINT "EmailEvent_userId_provider_sourceMessageId_key"
    UNIQUE ("userId", "provider", "sourceMessageId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx"
ON "Notification" ("userId", "read", "createdAt");
