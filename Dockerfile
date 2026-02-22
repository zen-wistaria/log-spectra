####### Stage 0: Base images #######
FROM oven/bun:slim AS base
WORKDIR /app

####### Stage 2: Install Node.js dependencies #######
FROM base AS deps

COPY package.json bun.lock package-lock.json* ./

# Install dependencies
RUN bun install --frozen-lockfile

####### Stage 3: Build Node.js App & Generate Prisma Client (Rust Engine) #######
FROM base AS builder

# Copy dependencies & source code
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate prisma client
ENV DATABASE_URL="this dummy for prisma generate"
RUN bunx prisma generate

# Copy source code
COPY . .

# Build the application
RUN bun run build

# Remove env files after build
RUN rm -rf .env* .next/standalone/.env*

####### Stage 4: This step is for get minimal size for prisma (decrease image size by 1GB, tested by me)
FROM base AS prisma

RUN bun add prisma@7.4.1 dotenv-expand@12.0.3 @prisma/adapter-better-sqlite3 --omit=dev

RUN bun pm cache rm

####### Stage 5: Final image #######
FROM base AS runner

ARG TITLE
ARG VERSION
ARG DESCRIPTION
ARG LICENSES
ARG SOURCE
ARG URL
ARG AUTHORS
ARG BUILD_DATE
ARG BUILD_SOURCE
ARG VCS_REF

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

RUN apt-get update && apt-get install -y tzdata \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Jakarta

WORKDIR /app

# Env for final image
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy node_modules prisma from Stage 4
COPY --from=prisma /app/node_modules ./node_modules
COPY --from=builder /app/prisma.config.ts /app/

# Optional: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
RUN chown -R nextjs:nodejs ./
USER nextjs

EXPOSE 3000
CMD ["bun", "server.js"]