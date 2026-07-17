FROM oven/bun:alpine AS base
WORKDIR /app

# ── install deps (cache layer) ──
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# ── copy source & build ──
COPY . .
RUN bun build ./src/index.ts --outdir=dist --target=bun

# ── runtime ──
FROM oven/bun:alpine AS runtime
WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "run", "./dist/index.js"]
