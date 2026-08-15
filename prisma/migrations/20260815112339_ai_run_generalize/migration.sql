-- AlterTable
ALTER TABLE "ai_runs" ADD COLUMN     "input_context" JSONB,
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "recommendation_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ai_runs_user_id_idx" ON "ai_runs"("user_id");

-- AddForeignKey
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

