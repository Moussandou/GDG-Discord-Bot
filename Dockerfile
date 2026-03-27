FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --production

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# better-sqlite3 needs these at runtime
RUN apk add --no-cache libstdc++

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
