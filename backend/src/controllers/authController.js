const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const sanitizeUser = require('../utils/sanitizeUser');
const { signToken } = require('../middlewares/auth');

const SALT_ROUNDS = 10;

// POST /api/auth/register
// Cadastro público. Toda conta criada por esta rota é sempre CIDADAO —
// não existe parâmetro de "role" aqui de propósito: contas com outros
// papéis só são criadas pelo super admin (ver userController.createUser).
async function register(req, res) {
  const { name, email, password } = req.validated.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Já existe uma conta com esse e-mail.');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, password: hash, role: 'CIDADAO' },
  });

  const token = signToken(user);
  res.status(201).json({ token, user: sanitizeUser(user) });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.validated.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw ApiError.unauthorized('E-mail ou senha inválidos.');

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) throw ApiError.unauthorized('E-mail ou senha inválidos.');

  const token = signToken(user);
  res.json({ token, user: sanitizeUser(user) });
}

// GET /api/auth/me
async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, me };
