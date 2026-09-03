const fs = require('fs');
const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { publicUrlFor } = require('../middlewares/upload');
const { getVideoDurationSeconds } = require('../utils/videoDuration');
const { notifyUnlessSelf } = require('../services/notificationService');

const STATUS_LABELS = {
  ABERTO: 'Aberto',
  EM_ANALISE: 'Em análise',
  EM_ANDAMENTO: 'Em andamento',
  RESOLVIDO: 'Resolvido',
  REJEITADO: 'Rejeitado',
};

const denunciaListSelect = {
  id: true, title: true, description: true, category: true, location: true,
  status: true, validated: true, removed: true, confirmedResolved: true,
  createdAt: true, updatedAt: true, authorId: true,
  author: { select: { id: true, name: true, photoUrl: true } },
  media: true,
  officialResponse: true,
  _count: { select: { comments: true, likes: true } },
};

function serializeDenuncia(d, likedByMe) {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    location: d.location,
    status: d.status,
    validated: d.validated,
    removed: d.removed,
    confirmedResolved: d.confirmedResolved,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    author: d.author,
    media: d.media || null,
    officialResponse: d.officialResponse || null,
    commentsCount: d._count ? d._count.comments : 0,
    likesCount: d._count ? d._count.likes : 0,
    likedByMe: !!likedByMe,
  };
}

// GET /api/denuncias
async function list(req, res) {
  const { category, status, search, sort, page = 1, pageSize = 20 } = req.validated.query;

  const where = {
    removed: false,
    ...(category ? { category } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === 'old' ? { createdAt: 'asc' } :
    sort === 'likes' ? { likes: { _count: 'desc' } } :
    { createdAt: 'desc' };

  const [total, rows] = await Promise.all([
    prisma.denuncia.count({ where }),
    prisma.denuncia.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: denunciaListSelect,
    }),
  ]);

  let likedIds = new Set();
  if (req.user) {
    const myLikes = await prisma.like.findMany({
      where: { userId: req.user.id, denunciaId: { in: rows.map((r) => r.id) } },
      select: { denunciaId: true },
    });
    likedIds = new Set(myLikes.map((l) => l.denunciaId));
  }

  res.json({
    page, pageSize, total,
    denuncias: rows.map((d) => serializeDenuncia(d, likedIds.has(d.id))),
  });
}

// GET /api/denuncias/:id — inclui comentários (lista plana; o cliente monta a árvore pelo parentId)
async function getById(req, res) {
  const { id } = req.validated.params;

  const d = await prisma.denuncia.findUnique({ where: { id }, select: denunciaListSelect });
  if (!d || d.removed) throw ApiError.notFound('Denúncia não encontrada.');

  const comments = await prisma.comment.findMany({
    where: { denunciaId: id },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true, photoUrl: true } } },
  });

  let likedByMe = false;
  if (req.user) {
    likedByMe = !!(await prisma.like.findUnique({
      where: { userId_denunciaId: { userId: req.user.id, denunciaId: id } },
    }));
  }

  res.json({ denuncia: serializeDenuncia(d, likedByMe), comments });
}

// POST /api/denuncias — multipart/form-data, campo de arquivo opcional "media"
async function create(req, res) {
  const { title, description, category, location } = req.validated.body;

  const denuncia = await prisma.denuncia.create({
    data: { title, description, category, location, authorId: req.user.id },
  });

  if (req.file) {
    await attachMediaOrFail(denuncia.id, req.file);
  }

  const full = await prisma.denuncia.findUnique({ where: { id: denuncia.id }, select: denunciaListSelect });
  res.status(201).json({ denuncia: serializeDenuncia(full, false) });
}

// Valida o arquivo recebido (tamanho por tipo + duração de vídeo) e só então
// cria o registro de Media. Se algo não passar, apaga o arquivo do disco
// antes de lançar o erro — não deixamos lixo órfão em /uploads.
async function attachMediaOrFail(denunciaId, file) {
  const isVideo = file.mimetype.startsWith('video/');

  if (!isVideo) {
    const maxBytes = env.maxImageSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      fs.unlink(file.path, () => {});
      throw ApiError.badRequest(`Imagem excede o limite de ${env.maxImageSizeMb}MB.`);
    }
    await prisma.media.create({ data: { type: 'PHOTO', url: publicUrlFor(file), denunciaId } });
    return;
  }

  const durationSeconds = await getVideoDurationSeconds(file.path);
  // durationSeconds === null significa "não foi possível verificar" (ffprobe
  // ausente no servidor) — nesse caso confiamos no limite já aplicado no
  // front-end em vez de rejeitar o upload. Ver src/utils/videoDuration.js.
  if (durationSeconds !== null && durationSeconds > env.maxVideoDurationSeconds) {
    fs.unlink(file.path, () => {});
    throw ApiError.badRequest(`Vídeo excede o limite de ${env.maxVideoDurationSeconds / 60} minutos.`);
  }

  await prisma.media.create({
    data: { type: 'VIDEO', url: publicUrlFor(file), durationSeconds, denunciaId },
  });
}

// POST /api/denuncias/:id/like — alterna curtir/descurtir
async function toggleLike(req, res) {
  const { id } = req.validated.params;

  const denuncia = await prisma.denuncia.findUnique({ where: { id } });
  if (!denuncia || denuncia.removed) throw ApiError.notFound('Denúncia não encontrada.');

  const existing = await prisma.like.findUnique({
    where: { userId_denunciaId: { userId: req.user.id, denunciaId: id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId: req.user.id, denunciaId: id } });
  }

  const likesCount = await prisma.like.count({ where: { denunciaId: id } });
  res.json({ liked: !existing, likesCount });
}

// POST /api/denuncias/:id/validate — MODERADOR ou SUPERADMIN
async function moderateValidate(req, res) {
  const { id } = req.validated.params;
  const denuncia = await prisma.denuncia.update({ where: { id }, data: { validated: true } });
  await notifyUnlessSelf(denuncia.authorId, req.user.id, `Sua denúncia "${denuncia.title}" foi validada pela moderação.`, id);
  res.json({ denuncia });
}

// POST /api/denuncias/:id/remove — MODERADOR ou SUPERADMIN (remoção lógica)
async function moderateRemove(req, res) {
  const { id } = req.validated.params;
  const denuncia = await prisma.denuncia.update({ where: { id }, data: { removed: true } });
  await notifyUnlessSelf(denuncia.authorId, req.user.id, `Sua denúncia "${denuncia.title}" foi removida pela moderação.`, id);
  res.json({ denuncia });
}

// PATCH /api/denuncias/:id/status — ADMIN ou SUPERADMIN
async function setStatus(req, res) {
  const { id } = req.validated.params;
  const { status } = req.validated.body;

  const denuncia = await prisma.denuncia.update({ where: { id }, data: { status } });
  await notifyUnlessSelf(
    denuncia.authorId, req.user.id,
    `Sua denúncia "${denuncia.title}" mudou para o status "${STATUS_LABELS[status]}".`, id
  );
  res.json({ denuncia });
}

// POST /api/denuncias/:id/respond — ADMIN ou SUPERADMIN (upsert: uma resposta oficial "atual" por denúncia)
async function respond(req, res) {
  const { id } = req.validated.params;
  const { text } = req.validated.body;

  const denuncia = await prisma.denuncia.findUnique({ where: { id } });
  if (!denuncia) throw ApiError.notFound('Denúncia não encontrada.');

  const officialResponse = await prisma.officialResponse.upsert({
    where: { denunciaId: id },
    update: { text, authorId: req.user.id },
    create: { text, authorId: req.user.id, denunciaId: id },
  });

  await notifyUnlessSelf(denuncia.authorId, req.user.id, `Você recebeu uma resposta oficial na denúncia "${denuncia.title}".`, id);
  res.json({ officialResponse });
}

// POST /api/denuncias/:id/confirm-resolved — apenas o autor, e apenas se o status já é RESOLVIDO
async function confirmResolved(req, res) {
  const { id } = req.validated.params;

  const denuncia = await prisma.denuncia.findUnique({ where: { id } });
  if (!denuncia) throw ApiError.notFound('Denúncia não encontrada.');
  if (denuncia.authorId !== req.user.id) throw ApiError.forbidden('Apenas o autor da denúncia pode confirmar a resolução.');
  if (denuncia.status !== 'RESOLVIDO') throw ApiError.badRequest('A denúncia ainda não foi marcada como resolvida pela administração.');

  const updated = await prisma.denuncia.update({ where: { id }, data: { confirmedResolved: true } });
  res.json({ denuncia: updated });
}

module.exports = {
  list, getById, create, toggleLike,
  moderateValidate, moderateRemove, setStatus, respond, confirmResolved,
};
