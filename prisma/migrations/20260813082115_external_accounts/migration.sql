-- CreateEnum
CREATE TYPE "ExternalAccountStatus" AS ENUM ('connected', 'expired', 'disconnected');

-- CreateTable
CREATE TABLE "external_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "external_user_id" TEXT NOT NULL,
    "status" "ExternalAccountStatus" NOT NULL DEFAULT 'connected',
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMP(3),
    "access_token" TEXT NOT NULL,
    "token_expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_accounts_user_id_idx" ON "external_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_accounts_platform_external_user_id_key" ON "external_accounts"("platform", "external_user_id");

-- AddForeignKey
ALTER TABLE "external_accounts" ADD CONSTRAINT "external_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
