# Multi-stage build for FinSmart — Railway-optimized
FROM node:20-bullseye-slim AS frontend-build

# Minimal build deps, cleaned after install
RUN apt-get update && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Skip Rollup native builds in CI
ENV ROLLUP_SKIP_NODEJS_NATIVE=1
ENV npm_config_optional=true

WORKDIR /app/frontend

# Cache layer: install dependencies first
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ---- Backend stage ----
FROM node:20-alpine AS backend

# Runtime deps for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Cache layer: install production deps
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev --omit=optional

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./src/public

# Verify frontend build
RUN test -f ./src/public/index.html || (echo "ERROR: Frontend build failed - index.html missing" && exit 1)

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose Railway's expected port (falls back to 5000)
EXPOSE 5000

# Health check ensures Railway detects a healthy container
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||5000)+'/health', r => {process.exit(r.statusCode===200?0:1)})"

CMD ["node", "src/adapters/http/server.js"]
