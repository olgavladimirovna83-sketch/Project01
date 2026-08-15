-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('completed', 'failed', 'timeout', 'provider_unavailable', 'validation_failed');

-- CreateTable
CREATE TABLE "ai_runs" (
    "id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "status" "AiRunStatus" NOT NULL,
    "output" JSONB,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_runs_recommendation_id_idx" ON "ai_runs"("recommendation_id");

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

