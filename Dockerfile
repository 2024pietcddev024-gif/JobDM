# ==============================================================================
# Enterprise Multi-Stage Dockerfile for JobDM / InterviewIQ
# Stage 1: Build the optimized Vite React SPA
# Stage 2: Minimal Production Node.js Runtime (Express API + Static Server)
# ==============================================================================

# ── Stage 1: Frontend Build ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing Docker layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build assets
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ── Stage 2: Production Container ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Install production-only dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source code and migrations
COPY server/ ./server/
COPY .env.example ./.env.example

# Copy compiled frontend from Stage 1 into server static directory
COPY --from=builder /app/dist ./dist

# Non-root user for enterprise security best practices
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "server/server.js"]
