# ============================================================
# FamiCash API - Imagen de producción (Railway)
# ============================================================

# ---------- Etapa 1: dependencias + Prisma Client ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# openssl: requerido por Prisma · python3/make/g++: por si bcrypt debe compilarse
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall ejecuta `prisma generate`
RUN npm ci --omit=dev

# ---------- Etapa 2: runtime ----------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY src ./src

# Railway inyecta PORT; 5000 es el valor por defecto local
EXPOSE 5000
CMD ["node", "src/server.js"]
