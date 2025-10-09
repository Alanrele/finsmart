# Multi-stage build for FinSmart
FROM node:20-bullseye-slim as frontend-build

# Install minimal build deps (Debian-based) and clean apt cache
RUN apt-get update && apt-get install -y python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*

# Workaround Rollup native optional dependency issues in CI
ENV ROLLUP_SKIP_NODEJS_NATIVE=1
ENV npm_config_optional=true

# Build frontend
WORKDIR /app/frontend
# Copy only package.json to allow Linux-specific resolution of optional deps
COPY frontend/package.json ./

# Use npm install (not ci) to resolve platform-specific optional deps (rollup native)
RUN npm install

COPY frontend/ ./
RUN npm run build

# Backend stage
FROM node:20-alpine as backend

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY backend/package*.json ./

# Install only production dependencies for backend (fast and cacheable)
RUN npm ci --omit=dev --omit=optional

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

CMD ["npm", "start"]
