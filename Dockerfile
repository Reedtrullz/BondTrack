# Stage 1: Build
FROM node:22-alpine AS base
WORKDIR /app
RUN chown -R node:node /app && chmod -R 775 /app
USER node

# Install dependencies
COPY --chown=node:node package.json ./
RUN npm ci

# Copy source and build
COPY --chown=node:node . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

# Copy standalone build output
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
