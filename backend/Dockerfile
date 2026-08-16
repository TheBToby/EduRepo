# EduRepo Backend – Multi-Stage Dockerfile
# --------------------------------------------------------------------------
# Stages:
#   deps  – volle Installation (prod + dev) inkl. Prisma-Client-Generierung
#   dev   – Hot-Reload-Image (Ziel von docker-compose.dev.yml, Volume-Mounts)
#   build – Kompiliert NestJS nach dist/
#   prod  – schlankes Laufzeit-Image (Default-Target, produktionsbereit)
#
# Produktion (docker-compose.yml, Default):
#   - Enthält ALLES was zum Lauf nötig ist (Code, Schema, Client, Seed) –
#     KEINE Bind-Mounts des Quellcodes mehr nötig.
#   - Start via docker-entrypoint.sh: Migrationen → Seed → node dist/src/main.js
# --------------------------------------------------------------------------
# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- Base
FROM node:20-bookworm-slim AS base
# openssl/curl für Prisma-Engines, Build-Tools für native Module (argon2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---------------------------------------------------------------- deps
# Volle Abhängigkeiten (inkl. Dev-Tools für nest build/ts-node) + Prisma-Client
FROM base AS deps
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate

# ---------------------------------------------------------------- dev
# Hot-Reload (docker-compose.dev.yml): Source wird per Volume-Mount überlagert
FROM deps AS dev
COPY . .
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

# ---------------------------------------------------------------- build
FROM deps AS build
COPY . .
RUN npm run build

# ---------------------------------------------------------------- prod
FROM node:20-bookworm-slim AS prod
# Nur Laufzeit-Abhängigkeiten (keine Build-Tools) – schlankes Image
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
# Dev-Abhängigkeiten entfernen, danach Prisma-Client erneut generieren
# (npm prune kann node_modules/.prisma entfernen)
RUN npm prune --omit=dev \
  && npx prisma generate \
  && rm -rf /root/.npm /root/.cache
COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && chown -R node:node /app
USER node

EXPOSE 4000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]