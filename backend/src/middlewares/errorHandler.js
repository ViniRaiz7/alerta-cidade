// Middleware de erro central. Fica registrado por último em app.js (depois
// de todas as rotas), então qualquer `throw` dentro de um controller —
// síncrono ou assíncrono, graças ao express-async-errors — cai aqui.

const ApiError = require('../utils/ApiError');
const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Erros conhecidos do Prisma (ex.: violação de constraint única) viram 409/400
  // em vez de vazar como 500 com uma mensagem interna do banco.
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Já existe um registro com esses dados (violação de unicidade).' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro não encontrado.' });
  }

  console.error('[erro não tratado]', err);
  return res.status(500).json({
    error: 'Erro interno do servidor.',
    // stack só é exposto fora de produção — nunca vaza detalhe de implementação para o cliente final
    stack: env.isProduction ? undefined : err.stack,
  });
}

module.exports = errorHandler;
