-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "scheduledStart" TIMESTAMP(3),
ADD COLUMN     "scheduledEnd" TIMESTAMP(3),
ADD COLUMN     "accessPasswordHash" TEXT,
ADD COLUMN     "allowMultipleAttempts" BOOLEAN NOT NULL DEFAULT false;
