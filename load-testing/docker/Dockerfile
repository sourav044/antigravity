# Stage 1: Build TypeScript Code
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src/

# Install playwright types specifically if not installed, though npm ci should handle it
# Build TypeScript to dist
RUN npm run build

# Stage 2: Runner (Lightest possible image for Playwright)
FROM node:20-bookworm-slim

WORKDIR /app

# Install dependencies required by Playwright Chromium on Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Install ONLY the Playwright chromium browser (and skip redundant OS dependencies since we just apk added them)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=false
RUN npx playwright install chromium

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Copy test source files so Playwright can find them
COPY src ./src

# Copy other necessary runtime files
COPY data ./data
COPY .env ./
COPY playwright.config.ts ./

# Default environment variables
ENV NODE_ENV=production
ENV HEADLESS_TEST=true

# Keep container running or run a specific command
CMD ["dumb-init", "npx", "playwright", "test"]
