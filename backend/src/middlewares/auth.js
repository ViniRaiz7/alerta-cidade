// Middlewares de autenticação (JWT) e autorização (por papel).
// `authenticate` identifica QUEM está fazendo a requisição.
// `authorize(...roles)` decide SE esse papel pode prosseguir.
// Mantê-los separados permite compor rotas como:
//   router.post('/x', authenticate, authorize('ADMIN', 'SUPERADMIN'), controller)

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const prisma = require('../config/prisma');

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Token de autenticação ausente. Envie "Authorization: Bearer <token>".');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    throw ApiError.unauthorized('Token inválido ou expirado.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw ApiError.unauthorized('Usuário do token não existe mais.');

  // req.user nunca carrega o hash da senha adiante
  req.user = { id: user.id, name: user.name, email: user.email, role: user.role, photoUrl: user.photoUrl };
  next();
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden(`Esta ação exige um dos papéis: ${allowedRoles.join(', ')}.`);
    }
    next();
  };
}

async function optionalAuthenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(); // segue sem req.user — rota pública

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user) {
      req.user = { id: user.id, name: user.name, email: user.email, role: user.role, photoUrl: user.photoUrl };
    }
  } catch (err) {
    // token presente mas inválido/expirado: trata como visitante anônimo em vez de derrubar a requisição
  }
  next();
}

module.exports = { authenticate, authorize, signToken, optionalAuthenticate };
