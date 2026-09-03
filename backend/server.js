const app = require('./src/app');
const env = require('./src/config/env');
const prisma = require('./src/config/prisma');

const server = app.listen(env.port, () => {
  console.log(`AlertaCidade API rodando em http://localhost:${env.port} (${env.nodeEnv})`);
});

// encerramento gracioso: fecha o servidor HTTP e a conexão com o banco antes de sair
async function shutdown(signal) {
  console.log(`\n${signal} recebido — encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
