# EduRepo Backend – Dockerfile (Dev-optimiert, Hot-Reload via Volume-Mount)
FROM node:20-bookworm-slim

# Werkzeuge für native Module (argon2, prisma engine etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencies zuerst (besserer Layer-Cache)
COPY package*.json ./
RUN npm install

# Prisma muss generiert werden, nachdem schema existiert – geschieht via postinstall / Migration
COPY prisma ./prisma
RUN npx prisma generate || true

COPY . .

EXPOSE 4000

# Default-Command (dev) wird in docker-compose überschrieben (migrate + seed + start:dev)
CMD ["npm", "run", "start:dev"]