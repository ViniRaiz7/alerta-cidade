// Instância única do PrismaClient, compartilhada por toda a aplicação.
// Evita abrir uma conexão nova por request (o que esgotaria o pool do
// Postgres rapidamente) e evita múltiplas instâncias em hot-reload no
// desenvolvimento com nodemon.

const { PrismaClient } = require('@prisma/client');
const env = require('./env');

const prisma = new PrismaClient({
  log: env.isProduction ? ['error', 'warn'] : ['warn', 'error'],
});

module.exports = prisma;
