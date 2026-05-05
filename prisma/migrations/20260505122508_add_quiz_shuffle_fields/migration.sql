-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "QuizSession" ADD COLUMN     "currentAnswers" JSONB;
