-- CreateEnum
CREATE TYPE "PatternDirection" AS ENUM ('positive', 'negative');

-- CreateEnum
CREATE TYPE "PatternStatus" AS ENUM ('hypothesis', 'emerging', 'confirmed', 'strong', 'declining', 'inactive');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('fact', 'pattern', 'preference', 'decision', 'lesson', 'hypothesis');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('generated', 'shown', 'accepted', 'rejected', 'modified', 'postponed', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "UserDecisionType" AS ENUM ('accepted', 'rejected', 'modified', 'deferred', 'alternative_selected');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "timezone" TEXT,
    "locale" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goal_type" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "external_account_id" TEXT,
    "external_content_id" TEXT,
    "content_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'published',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_features" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "feature_type" TEXT NOT NULL,
    "feature_value" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source" TEXT,
    "analysis_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_metrics" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "value" INTEGER,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patterns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pattern_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "direction" "PatternDirection" NOT NULL,
    "strength" DOUBLE PRECISION,
    "confidence" DOUBLE PRECISION,
    "status" "PatternStatus" NOT NULL DEFAULT 'hypothesis',
    "first_detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_confirmed_at" TIMESTAMP(3),
    "last_updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "memory_type" "MemoryType" NOT NULL,
    "content" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "primary_candidate" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'generated',
    "decision_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_decisions" (
    "id" TEXT NOT NULL,
    "recommendation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "decision_type" "UserDecisionType" NOT NULL,
    "selected_candidate" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "hypothesis_id" TEXT,
    "goal_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "result" TEXT,
    "conclusion" TEXT,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- CreateIndex
CREATE INDEX "content_user_id_idx" ON "content"("user_id");

-- CreateIndex
CREATE INDEX "content_published_at_idx" ON "content"("published_at");

-- CreateIndex
CREATE UNIQUE INDEX "content_external_account_id_external_content_id_key" ON "content"("external_account_id", "external_content_id");

-- CreateIndex
CREATE INDEX "content_features_content_id_idx" ON "content_features"("content_id");

-- CreateIndex
CREATE INDEX "performance_metrics_content_id_idx" ON "performance_metrics"("content_id");

-- CreateIndex
CREATE INDEX "performance_metrics_measured_at_idx" ON "performance_metrics"("measured_at");

-- CreateIndex
CREATE INDEX "patterns_user_id_idx" ON "patterns"("user_id");

-- CreateIndex
CREATE INDEX "memory_user_id_idx" ON "memory"("user_id");

-- CreateIndex
CREATE INDEX "recommendations_user_id_idx" ON "recommendations"("user_id");

-- CreateIndex
CREATE INDEX "recommendations_goal_id_idx" ON "recommendations"("goal_id");

-- CreateIndex
CREATE INDEX "user_decisions_recommendation_id_idx" ON "user_decisions"("recommendation_id");

-- CreateIndex
CREATE INDEX "user_decisions_user_id_idx" ON "user_decisions"("user_id");

-- CreateIndex
CREATE INDEX "experiments_goal_id_idx" ON "experiments"("goal_id");

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content" ADD CONSTRAINT "content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_features" ADD CONSTRAINT "content_features_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_metrics" ADD CONSTRAINT "performance_metrics_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memory" ADD CONSTRAINT "memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_decisions" ADD CONSTRAINT "user_decisions_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_decisions" ADD CONSTRAINT "user_decisions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
