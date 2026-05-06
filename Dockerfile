# syntax=docker/dockerfile:1.7
# Heimdall — production image
# Multi-stage build using Next.js standalone output (small runtime image).

ARG NODE_VERSION=22

# ---------- 1. Dependencies ----------
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app

# OpenSSL is needed by some prebuilt native modules at install time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
# npm ci can skip platform-specific optionalDependencies when the lockfile
# was generated on a different OS/arch (e.g. macOS arm64 → linux x64).
# Force-install the linux/x64 native binaries Tailwind v4 + Turbopack need.
RUN npm ci --include=optional \
 && npm install --no-save --no-package-lock \
      lightningcss-linux-x64-gnu \
      @tailwindcss/oxide-linux-x64-gnu \
      @rolldown/binding-linux-x64-gnu \
      @unrs/resolver-binding-linux-x64-gnu \
      @img/sharp-linux-x64 \
      @img/sharp-libvips-linux-x64

# ---------- 2. Build ----------
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

ARG NEXT_PUBLIC_THORNODE_API
ARG NEXT_PUBLIC_MIDGARD_API
ARG NEXT_PUBLIC_COINGECKO_API
ARG NEXT_PUBLIC_THORCHAIN_NETWORK
ARG NEXT_PUBLIC_THORCHAIN_RPC
ARG NEXT_PUBLIC_MIDGARD_FALLBACK
ARG NEXT_PUBLIC_TRACK_API
ARG VERSION=latest

ENV NEXT_PUBLIC_THORNODE_API=${NEXT_PUBLIC_THORNODE_API} \
    NEXT_PUBLIC_MIDGARD_API=${NEXT_PUBLIC_MIDGARD_API} \
    NEXT_PUBLIC_COINGECKO_API=${NEXT_PUBLIC_COINGECKO_API} \
    NEXT_PUBLIC_THORCHAIN_NETWORK=${NEXT_PUBLIC_THORCHAIN_NETWORK} \
    NEXT_PUBLIC_THORCHAIN_RPC=${NEXT_PUBLIC_THORCHAIN_RPC} \
    NEXT_PUBLIC_MIDGARD_FALLBACK=${NEXT_PUBLIC_MIDGARD_FALLBACK} \
    NEXT_PUBLIC_TRACK_API=${NEXT_PUBLIC_TRACK_API} \
    VERSION=${VERSION} \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ---------- 3. Runtime ----------
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user (the slim image already provides 'node' uid 1000).
RUN mkdir -p /app/.next && chown -R node:node /app

# Standalone output bundles only the files needed to run.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

# Health probe used by compose / Ansible.
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+process.env.PORT+'/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
