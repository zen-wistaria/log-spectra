/*
  Warnings:

  - The `status` column on the `agents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `risk_reasons` column on the `anomaly_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "agents" DROP COLUMN "status",
ADD COLUMN     "status" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "anomaly_logs" DROP COLUMN "risk_reasons",
ADD COLUMN     "risk_reasons" JSONB NOT NULL DEFAULT '[]';
