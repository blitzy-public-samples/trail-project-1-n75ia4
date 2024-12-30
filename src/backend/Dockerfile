# syntax=docker/dockerfile:1.4

# ===== Build Stage =====
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ 

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* ./

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Copy source code and configuration files
COPY tsconfig.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN pnpm prisma:generate

# Build TypeScript application
RUN pnpm build

# Prune development dependencies
RUN pnpm prune --prod

# ===== Production Stage =====
FROM node:20-alpine AS production

# Install production dependencies
RUN apk add --no-cache tini

# Set working directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=2048" \
    TZ=UTC

# Copy production dependencies and lock files
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

# Security hardening
RUN chmod -R 550 /app && \
    chown -R nodejs:nodejs /app

# Create and configure required directories
RUN mkdir -p /app/logs /app/tmp && \
    chown -R nodejs:nodejs /app/logs /app/tmp && \
    chmod 750 /app/logs /app/tmp

# Switch to non-root user
USER nodejs

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Expose application port
EXPOSE ${PORT}

# Set up volumes
VOLUME ["/app/logs", "/app/tmp"]

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application with clustering enabled
CMD ["node", "--require", "./dist/cluster.js", "./dist/app.js"]

# Build-time metadata
LABEL maintainer="Task Management System Team" \
      version="1.0.0" \
      description="Task Management System Backend Service" \
      org.opencontainers.image.source="https://github.com/org/task-management-system" \
      org.opencontainers.image.licenses="MIT"

# Container optimization labels
LABEL com.docker.compose.project="task-management" \
      com.docker.compose.service="backend" \
      com.docker.compose.environment="production"

# Security labels
LABEL org.label-schema.schema-version="1.0" \
      org.label-schema.docker.cmd="docker run -d -p 3000:3000 task-management-backend" \
      org.label-schema.docker.cmd.debug="docker run -it --rm task-management-backend sh" \
      org.label-schema.docker.params="PORT=3000"