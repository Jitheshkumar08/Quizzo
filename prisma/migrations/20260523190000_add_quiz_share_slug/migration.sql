ALTER TABLE "Quiz" ADD COLUMN "shareSlug" TEXT;

WITH slug_candidates AS (
  SELECT
    "id",
    COALESCE(
      NULLIF(
        TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("title"), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'quiz'
    ) AS "baseSlug",
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(
        NULLIF(
          TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("title"), '[^a-z0-9]+', '-', 'g')),
          ''
        ),
        'quiz'
      )
      ORDER BY "createdAt", "id"
    ) AS "duplicateRank"
  FROM "Quiz"
  WHERE "shareSlug" IS NULL
)
UPDATE "Quiz"
SET "shareSlug" = CASE
  WHEN slug_candidates."duplicateRank" = 1 THEN slug_candidates."baseSlug"
  ELSE CONCAT(slug_candidates."baseSlug", '-', SUBSTRING(slug_candidates."id" FROM 1 FOR 8))
END
FROM slug_candidates
WHERE "Quiz"."id" = slug_candidates."id";

CREATE UNIQUE INDEX "Quiz_shareSlug_key" ON "Quiz"("shareSlug");
