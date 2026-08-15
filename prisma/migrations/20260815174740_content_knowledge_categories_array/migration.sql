-- Task 9.7 / DECISIONS.md D-0033: category (String) -> categories (String[])
-- Data-preserving: existing single category value becomes a one-element
-- array, no data loss for the 23 existing records.

-- DropIndex
DROP INDEX "content_knowledge_category_idx";

-- AddColumn
ALTER TABLE "content_knowledge" ADD COLUMN "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Backfill: single category -> one-element array
UPDATE "content_knowledge" SET "categories" = ARRAY["category"];

-- DropColumn (now redundant, fully superseded by "categories")
ALTER TABLE "content_knowledge" DROP COLUMN "category";

-- DropDefault (no longer needed after backfill)
ALTER TABLE "content_knowledge" ALTER COLUMN "categories" DROP DEFAULT;
