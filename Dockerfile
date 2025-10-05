# Multi-stage build for FinSmart
FROM node:20-alpine as frontend-build

# Install essential build dependencies
RUN apk add --no-cache python3 make g++

# Build frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./

# Clear npm cache and install with fresh modules
RUN npm cache clean --force
RUN npm install --no-package-lock --no-optional
RUN rm -rf node_modules package-lock.json || true
RUN npm install

COPY frontend/ ./
RUN npm run build

# Backend stage  
FROM node:20-alpine as backend

# Install runtime dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY backend/package*.json ./

# Install only production dependencies for backend
RUN npm install --omit=dev --omit=optional

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
