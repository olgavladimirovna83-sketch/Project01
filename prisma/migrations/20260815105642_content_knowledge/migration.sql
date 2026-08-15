-- CreateTable
CREATE TABLE "content_knowledge" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_section" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_knowledge_category_idx" ON "content_knowledge"("category");

