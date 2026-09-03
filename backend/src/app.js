// Monta o Express app (middlewares globais, arquivos estáticos, rotas e o
// error handler). Não chama `.listen()` aqui — isso fica em server.js — para
// que o app possa ser importado sozinho em testes de integração no futuro
// (ex.: com supertest) sem precisar abrir uma porta de verdade.

require('express-async-errors'); // permite `async (req, res) => { throw ... }` sem try/catch manual

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const { UPLOAD_ROOT } = require('./middlewares/upload');

const app = express();

app.use(helmet({
  // crossOriginResourcePolicy desabilitado para que o front-end (em outra
  // origem) consiga carregar as imagens/vídeos servidos em /uploads
  crossOriginResourcePolicy: false,
}));
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '2mb' })); // uploads não passam por aqui (multipart vai direto pro multer)
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// arquivos de mídia enviados (fotos e vídeos das denúncias, avatares)
app.use('/uploads', express.static(UPLOAD_ROOT));

// não depende do banco — usado por orquestradores (docker, k8s) para saber se o processo subiu
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api', routes);

app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
app.use(errorHandler);

module.exports = app;
