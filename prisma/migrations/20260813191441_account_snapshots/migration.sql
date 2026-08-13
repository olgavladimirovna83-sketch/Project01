-- CreateTable
CREATE TABLE "account_snapshots" (
    "id" TEXT NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "value" INTEGER,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_snapshots_external_account_id_idx" ON "account_snapshots"("external_account_id");

-- CreateIndex
CREATE INDEX "account_snapshots_captured_at_idx" ON "account_snapshots"("captured_at");

-- AddForeignKey
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_external_account_id_fkey" FOREIGN KEY ("external_account_id") REFERENCES "external_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

