####### Stage 0: Base images #######
FROM oven/bun:slim AS base
WORKDIR /app

####### Stage 2: Install Node.js dependencies #######
FROM base AS deps
COPY package.json bun.lock package-lock.json* ./
RUN bun install --frozen-lockfile

####### Stage 3: Build Node.js App & Generate Prisma Client (Rust Engine) #######
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY prisma.config.ts ./

ENV DATABASE_URL="this dummy for prisma generate"
RUN bunx prisma generate

COPY . .
RUN bun run build
RUN rm -rf .env* .next/standalone/.env*

####### Stage 4: Minimal size for prisma #######
FROM base AS prisma
RUN bun add prisma@7.4.2 dotenv-expand@12.0.3 @prisma/adapter-pg@7.4.2 --omit=dev
RUN bun pm cache rm

####### Stage 5: Final image #######
FROM base AS runner

ARG TITLE ARG VERSION ARG DESCRIPTION ARG LICENSES ARG SOURCE ARG URL ARG AUTHORS ARG BUILD_DATE ARG BUILD_SOURCE ARG VCS_REF

LABEL org.opencontainers.image.title="${TITLE}" \
      org.opencontainers.image.description="${DESCRIPTION}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.url="${URL}" \
      org.opencontainers.image.source="${SOURCE}" \
      org.opencontainers.image.licenses="${LICENSES}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.build_source="${BUILD_SOURCE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.authors="${AUTHORS}"

ENV TZ=Asia/Jakarta
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# 1. Makesure the user and group exist before copying files to avoid permission issues
RUN groupadd --gid 1001 logspectra && \
    useradd --uid 1001 --gid logspectra --create-home logspectra

# 2. Copy files from the builder stage to the runner stage with the correct ownership
COPY --chown=logspectra:logspectra --from=builder /app/public ./public
COPY --chown=logspectra:logspectra --from=builder /app/prisma ./prisma
COPY --chown=logspectra:logspectra --from=builder /app/scripts ./scripts
COPY --chown=logspectra:logspectra --from=builder /app/.next/standalone ./
COPY --chown=logspectra:logspectra --from=builder /app/.next/static ./.next/static
COPY --chown=logspectra:logspectra --from=builder /app/data ./data
COPY --chown=logspectra:logspectra --from=builder /app/fastapi ./fastapi
COPY --chown=logspectra:logspectra --from=builder /app/prisma.config.ts /app/
COPY --chown=logspectra:logspectra --from=prisma /app/node_modules ./node_modules

# 3. Install Python dependencies and create a virtual environment for FastAPI
RUN apt-get update && apt-get install -y --no-install-recommends \
    tzdata \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && python3 -m venv /app/fastapi/.venv \
    && /app/fastapi/.venv/bin/pip install --no-cache-dir --upgrade pip \
    && if [ -f /app/fastapi/requirements.txt ]; then \
        /app/fastapi/.venv/bin/pip install --no-cache-dir -r /app/fastapi/requirements.txt; \
    fi \
    && apt-get purge -y --auto-remove build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /root/.cache/pip \
    && chown -R logspectra:logspectra /app/fastapi/.venv

USER logspectra
EXPOSE 3000
CMD ["bash", "scripts/run.sh"]