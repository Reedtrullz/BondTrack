# Stage 1: Build
FROM node:22-alpine AS base

# Set environment variables FIRST (before build)
ARG NEXT_PUBLIC_THORNODE_API
ARG NEXT_PUBLIC_MIDGARD_API
ARG NEXT_PUBLIC_COINGECKO_API
ARG NEXT_PUBLIC_THORCHAIN_NETWORK

ENV NEXT_PUBLIC_THORNODE_API=${NEXT_PUBLIC_THORNODE_API}
ENV NEXT_PUBLIC_MIDGARD_API=${NEXT_PUBLIC_MIDGARD_API}
ENV NEXT_PUBLIC_COINGECKO_API=${NEXT_PUBLIC_COINGECKO_API}
ENV NEXT_PUBLIC_THORCHAIN_NETWORK=${NEXT_PUBLIC_THORCHAIN_NETWORK}

WORKDIR /app

# Copy package files and install dependencies
COPY --chown=node:node package*.json ./
RUN npm ci

# Copy source code
COPY --chown=node:node . .

# Build the app (creates .next/standalone)
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

# Copy standalone build output from Stage 1
COPY --from=base --chown=node:node /app/.next/standalone ./
COPY --from=base --chown=node:node /app/.next/static ./.next/static
COPY --from=base --chown=node:node /app/public ./public

# Switch to non-root user for security
USER node

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

# Run the standalone server
CMD ["node", "server.js"]
