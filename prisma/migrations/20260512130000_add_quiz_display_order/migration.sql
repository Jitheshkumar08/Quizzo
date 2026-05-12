ALTER TABLE "Quiz" ADD COLUMN "displayOrder" INTEGER;

WITH ordered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (ORDER BY "createdAt" DESC) - 1 AS "position"
  FROM "Quiz"
  WHERE "isPublished" = true
)
UPDATE "Quiz"
SET "displayOrder" = ordered."position"
FROM ordered
WHERE "Quiz"."id" = ordered."id";

CREATE INDEX "Quiz_isPublished_displayOrder_idx" ON "Quiz"("isPublished", "displayOrder");
