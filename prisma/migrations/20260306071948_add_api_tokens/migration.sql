-- CreateTable
CREATE TABLE "api_tokens" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "server_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_tokens_token_key" ON "api_tokens"("token");
