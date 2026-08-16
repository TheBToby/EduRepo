# EduRepo Frontend – Multi-Stage Dockerfile (Next.js 14)
# --------------------------------------------------------------------------
# Stages:
#   deps    – Installation aller Abhängigkeiten
#   dev     – Hot-Reload-Image (Ziel von docker-compose.dev.yml, next dev)
#   build   – next build (standalone output)
#   prod    – schlankes Laufzeit-Image (Default-Target): node server.js
#
# NEXT_PUBLIC_*-Variablen werden beim BUILD eingebrannt (Next.js) und daher
# als Build-Args übergeben (docker-compose.yml: build.args).
# --------------------------------------------------------------------------
# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- Base
FROM node:20-bookworm-slim AS base
WORKDIR /app

# ---------------------------------------------------------------- deps
FROM base AS deps
COPY package*.json ./
RUN npm install

# ---------------------------------------------------------------- dev
# Hot-Reload (docker-compose.dev.yml): Source via Volume-Mount überlagert
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------- build
FROM deps AS build
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_PUBLIC_BASE_URL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_PUBLIC_BASE_URL=$NEXT_PUBLIC_PUBLIC_BASE_URL
COPY . .
RUN npm run build

# ---------------------------------------------------------------- prod
FROM node:20-bookworm-slim AS prod
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone-Server (enthält minimales node_modules) + statische Assets
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]