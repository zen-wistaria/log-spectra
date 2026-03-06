/*
  Warnings:

  - You are about to drop the column `server_id` on the `anomaly_logs` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `api_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `server_id` on the `api_tokens` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[agent_id,ip]` on the table `anomaly_logs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `agent_id` to the `anomaly_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agent_id` to the `api_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "anomaly_logs_server_id_ip_key";

-- AlterTable
ALTER TABLE "anomaly_logs" DROP COLUMN "server_id",
ADD COLUMN     "agent_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "api_tokens" DROP COLUMN "label",
DROP COLUMN "server_id",
ADD COLUMN     "agent_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hostname" TEXT,
    "ip_address" TEXT,
    "os" TEXT,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "last_seen" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_logs_agent_id_ip_key" ON "anomaly_logs"("agent_id", "ip");

-- AddForeignKey
ALTER TABLE "anomaly_logs" ADD CONSTRAINT "anomaly_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
