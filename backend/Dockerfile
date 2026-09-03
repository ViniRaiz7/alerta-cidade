# Imagem de produção da API do AlertaCidade.
FROM node:20-alpine

WORKDIR /app

# instala dependências primeiro (aproveita o cache de camadas do Docker
# quando só o código muda, sem mexer em package.json)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN mkdir -p uploads/avatars uploads/denuncias

EXPOSE 3333

# aplica migrações pendentes e só então sobe o servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
