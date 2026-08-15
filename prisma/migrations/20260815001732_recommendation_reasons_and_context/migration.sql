-- AlterTable
ALTER TABLE "recommendations" ADD COLUMN     "context" JSONB;

-- CreateTable
CREATE TABLE "recommendation_reasons" (
    "id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "reason_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "recommendation_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_reasons_recommendation_id_idx" ON "recommendation_reasons"("recommendation_id");

-- AddForeignKey
ALTER TABLE "recommendation_reasons" ADD CONSTRAINT "recommendation_reasons_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

