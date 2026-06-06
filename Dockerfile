# Stage 1: Build
FROM node:22-slim AS builder

ARG NEXT_PUBLIC_THORNODE_API
ARG NEXT_PUBLIC_MIDGARD_API
ARG NEXT_PUBLIC_THORCHAIN_RPC
ARG NEXT_PUBLIC_TRACK_API
ARG NEXT_PUBLIC_MIDGARD_FALLBACK
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_COINGECKO_API
ARG NEXT_PUBLIC_THORCHAIN_NETWORK
ARG VERSION

ENV NEXT_PUBLIC_THORNODE_API=${NEXT_PUBLIC_THORNODE_API}
ENV NEXT_PUBLIC_MIDGARD_API=${NEXT_PUBLIC_MIDGARD_API}
ENV NEXT_PUBLIC_THORCHAIN_RPC=${NEXT_PUBLIC_THORCHAIN_RPC}
ENV NEXT_PUBLIC_TRACK_API=${NEXT_PUBLIC_TRACK_API}
ENV NEXT_PUBLIC_MIDGARD_FALLBACK=${NEXT_PUBLIC_MIDGARD_FALLBACK}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ENV NEXT_PUBLIC_COINGECKO_API=${NEXT_PUBLIC_COINGECKO_API}
ENV NEXT_PUBLIC_THORCHAIN_NETWORK=${NEXT_PUBLIC_THORCHAIN_NETWORK}
ENV VERSION=${VERSION}

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Install linux-x64 native prebuilts — the lockfile was generated on macOS-arm64
# so only darwin-arm64 variants are recorded. npm ci silently skips missing
# optional deps for other platforms, which then crash at import time.
RUN npm install --no-save --no-package-lock \
  lightningcss-linux-x64-gnu \
  @tailwindcss/oxide-linux-x64-gnu \
  @rolldown/binding-linux-x64-gnu \
  @unrs/resolver-binding-linux-x64-gnu \
  @img/sharp-linux-x64 \
  @img/sharp-libvips-linux-x64

COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:22-slim AS runner
ARG VERSION
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV VERSION=${VERSION}

RUN id -u node >/dev/null 2>&1 || useradd -m node

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN npm install --no-save --no-package-lock \
  lightningcss-linux-x64-gnu \
  @tailwindcss/oxide-linux-x64-gnu \
  @img/sharp-linux-x64 \
  @img/sharp-libvips-linux-x64 2>/dev/null || true

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "server.js"]
