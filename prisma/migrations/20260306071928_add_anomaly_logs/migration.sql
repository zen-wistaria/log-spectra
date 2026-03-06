-- CreateTable
CREATE TABLE "anomaly_logs" (
    "id" SERIAL NOT NULL,
    "server_id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "request_per_second" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unique_endpoint_ratio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "risk_category" TEXT NOT NULL DEFAULT 'LOW',
    "risk_reasons" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anomaly_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "anomaly_logs_server_id_ip_key" ON "anomaly_logs"("server_id", "ip");
