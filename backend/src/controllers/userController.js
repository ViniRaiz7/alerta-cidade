const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const sanitizeUser = require('../utils/sanitizeUser');
const { publicUrlFor } = require('../middlewares/upload');

const SALT_ROUNDS = 10;

// GET /api/users — apenas SUPERADMIN. Suporta ?role= e ?search= (nome ou id).
async function listUsers(req, res) {
  const { role, search } = req.validated.query;

  const where = {
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json({ users: users.map(sanitizeUser) });
}

// POST /api/users — apenas SUPERADMIN. Cria ADMIN, MODERADOR ou SUPERADMIN.
// (Contas CIDADAO só se criam via /api/auth/register.)
async function createUser(req, res) {
  const { name, email, password, role } = req.validated.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Já existe uma conta com esse e-mail.');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({ data: { name, email, password: hash, role } });

  res.status(201).json({ user: sanitizeUser(user) });
}

// PATCH /api/users/:id/password — apenas SUPERADMIN.
// A senha atual nunca é exibida em lugar nenhum — só é possível redefinir.
async function resetPassword(req, res) {
  const { id } = req.validated.params;
  const { password } = req.validated.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('Usuário não encontrado.');

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  await prisma.user.update({ where: { id }, data: { password: hash } });

  res.json({ ok: true });
}

// PATCH /api/users/me/photo — qualquer usuário autenticado, para a própria foto.
// Aceita tanto upload de arquivo (multipart, campo "photo") quanto uma foto
// tirada pela câmera no front-end e enviada já como arquivo (o front converte
// o snapshot do <canvas>/MediaRecorder em Blob antes de enviar).
async function updateMyPhoto(req, res) {
  if (!req.file) throw ApiError.badRequest('Envie um arquivo de imagem no campo "photo".');

  const photoUrl = publicUrlFor(req.file);
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { photoUrl } });

  res.json({ user: sanitizeUser(user) });
}

module.exports = { listUsers, createUser, resetPassword, updateMyPhoto };
