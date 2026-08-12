# EduRepo Frontend – Dockerfile (Next.js, Dev mit Hot-Reload)
FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# Dev-Server; docker-compose überschreibt command mit "npm run dev"
CMD ["npm", "run", "dev"]