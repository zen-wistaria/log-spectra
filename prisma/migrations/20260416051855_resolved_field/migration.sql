-- AlterTable
ALTER TABLE "anomaly_logs" ADD COLUMN     "resolved_at" TIMESTAMP(3),
ADD COLUMN     "resolved_mark" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolved_notes" TEXT;
