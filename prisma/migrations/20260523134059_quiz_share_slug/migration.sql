-- DropIndex
DROP INDEX "Quiz_isPublished_isClosed_createdAt_idx";

-- AlterTable
ALTER TABLE "RemedialQuizSession" ALTER COLUMN "id" DROP DEFAULT;
