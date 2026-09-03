const prisma = require('../config/prisma');

// GET /api/notifications — as notificações do usuário autenticado, mais recentes primeiro
async function listMine(req, res) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, read: false } });

  res.json({ notifications, unreadCount });
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res) {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
  res.json({ ok: true });
}

// PATCH /api/notifications/:id/read
async function markOneRead(req, res) {
  const { id } = req.params;
  await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { read: true } });
  res.json({ ok: true });
}

module.exports = { listMine, markAllRead, markOneRead };
