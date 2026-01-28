# ========================
# MULTI-STAGE OPTIMIZED DOCKERFILE
# Target: <250MB image, <400MB runtime memory
# ========================

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=dev

COPY . .

RUN npm run build

RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# ========================
# PRODUCTION STAGE - Ultra lightweight
# ========================
FROM node:22-alpine AS production

# Install minimal system dependencies
RUN apk add --no-cache dumb-init

# Environment variables for optimization
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S scraper -u 1001 -G nodejs

WORKDIR /app

COPY --from=builder --chown=scraper:nodejs /app/dist ./dist
COPY --from=builder --chown=scraper:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=scraper:nodejs /app/package.json ./
COPY --from=builder --chown=scraper:nodejs /app/migrations ./migrations
COPY --from=builder --chown=scraper:nodejs /app/src/core/database/data-source.ts ./src/core/database/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["node", "dist/src/main"]
