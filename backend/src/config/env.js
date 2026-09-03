// Carrega e valida as variáveis de ambiente uma única vez, no boot da API.
// Qualquer módulo que precise de configuração importa este arquivo em vez
// de ler `process.env` diretamente — assim há um único lugar para conferir
// o que é obrigatório e quais são os valores padrão.

require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name} (veja .env.example)`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3333,

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  corsOrigin: process.env.CORS_ORIGIN || '*',

  maxImageSizeMb: Number(process.env.MAX_IMAGE_SIZE_MB) || 8,
  maxVideoSizeMb: Number(process.env.MAX_VIDEO_SIZE_MB) || 120,
  maxVideoDurationSeconds: Number(process.env.MAX_VIDEO_DURATION_SECONDS) || 180,

  isProduction: process.env.NODE_ENV === 'production',
};

module.exports = env;
