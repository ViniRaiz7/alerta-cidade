/* =========================================================
   AlertaCidade — Camada de dados
   Responsável por: modelos, LocalStorage, autenticação,
   regras de negócio das denúncias, notificações e rascunhos.
   Não manipula o DOM — isso fica a cargo de ui.js.
   ========================================================= */

const DB = {
  USERS: 'ac_users',
  DENUNCIAS: 'ac_denuncias',
  SESSION: 'ac_session',
  NOTIFICATIONS: 'ac_notifications',
};

const CATEGORIES = {
  buraco:     { label: 'Buraco na via',     icon: '🕳️' },
  iluminacao: { label: 'Iluminação',        icon: '💡' },
  semaforo:   { label: 'Semáforo',          icon: '🚦' },
  lixo:       { label: 'Lixo / Entulho',    icon: '🗑️' },
  seguranca:  { label: 'Segurança',         icon: '🛡️' },
};

const STATUSES = {
  aberto:       { label: 'Aberto',        cls: 'st-aberto' },
  em_analise:   { label: 'Em análise',    cls: 'st-analise' },
  em_andamento: { label: 'Em andamento',  cls: 'st-andamento' },
  resolvido:    { label: 'Resolvido',     cls: 'st-resolvido' },
  rejeitado:    { label: 'Rejeitado',     cls: 'st-rejeitado' },
};

const ROLE_LABELS = {
  cidadao: 'Cidadão',
  moderador: 'Moderador',
  admin: 'Administrador',
  superadmin: 'Super Admin',
};

const DRAFT_TTL_MS = 30 * 60 * 1000; // 30 minutos

/* ---------------- helpers genéricos ---------------- */

function uid(prefix) {
  return (prefix ? prefix + '_' : '') + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

function nowISO() { return new Date().toISOString(); }

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------------- acesso a dados ---------------- */

function getUsers() { return readJSON(DB.USERS, []); }
function saveUsers(users) { writeJSON(DB.USERS, users); }

function getDenuncias() { return readJSON(DB.DENUNCIAS, []); }
function saveDenuncias(list) { writeJSON(DB.DENUNCIAS, list); }

function getSession() { return readJSON(DB.SESSION, null); }
function setSession(userId) { writeJSON(DB.SESSION, { userId }); }
function clearSession() { localStorage.removeItem(DB.SESSION); }

function currentUser() {
  const s = getSession();
  if (!s) return null;
  const users = getUsers();
  return users.find(u => u.id === s.userId) || null;
}

function findUserByEmail(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
}

function findUserById(id) {
  return getUsers().find(u => u.id === id) || null;
}

/* ---------------- seed de dados (contas e denúncias de exemplo) ----------------
   Criadas automaticamente na primeira execução (quando o LocalStorage
   ainda não tem nenhum usuário), apenas para permitir testar os quatro
   papéis do sistema sem precisar cadastrar tudo manualmente.
   As credenciais NÃO são exibidas na interface — ver README do projeto.
------------------------------------------------------------------------------- */

function ensureSeedData() {
  if (getUsers().length > 0) return;

  const users = [
    { id: uid('u'), name: 'Super Admin',     email: 'super@urbano.com',      password: 'super123', role: 'superadmin', photo: null, createdAt: nowISO() },
    { id: uid('u'), name: 'Carlos Mendes',   email: 'admin@urbano.com',      password: 'admin123', role: 'admin',      photo: null, createdAt: nowISO() },
    { id: uid('u'), name: 'Fernanda Lima',   email: 'moderadora@urbano.com', password: 'mod123',   role: 'moderador',  photo: null, createdAt: nowISO() },
    { id: uid('u'), name: 'Ana Souza',       email: 'ana@mail.com',          password: '123456',   role: 'cidadao',    photo: null, createdAt: nowISO() },
    { id: uid('u'), name: 'Pedro Rocha',     email: 'pedro@mail.com',        password: '123456',   role: 'cidadao',    photo: null, createdAt: nowISO() },
  ];
  saveUsers(users);

  const ana = users.find(u => u.email === 'ana@mail.com');
  const pedro = users.find(u => u.email === 'pedro@mail.com');
  const admin = users.find(u => u.role === 'admin');

  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

  const denuncias = [
    {
      id: uid('d'),
      title: 'Buraco grande na Av. das Palmeiras',
      description: 'Buraco profundo próximo ao ponto de ônibus, já causou dano em dois carros essa semana.',
      category: 'buraco',
      location: 'Av. das Palmeiras, 450 — Centro',
      media: null,
      authorId: ana.id, authorName: ana.name,
      createdAt: daysAgo(6),
      status: 'em_andamento',
      validated: true,
      removido: false,
      confirmedResolved: false,
      officialResponse: { text: 'Equipe de manutenção acionada, previsão de reparo em 3 dias úteis.', authorName: admin.name, date: daysAgo(2) },
      likes: [pedro.id],
      comments: [
        { id: uid('c'), parentId: null, authorId: pedro.id, authorName: pedro.name, text: 'Também passei por aí, é bem perigoso à noite.', createdAt: daysAgo(5) },
      ],
    },
    {
      id: uid('d'),
      title: 'Poste de luz apagado há 2 semanas',
      description: 'A rua fica totalmente escura à noite, moradores relatam insegurança.',
      category: 'iluminacao',
      location: 'Rua das Acácias, esquina com Rua Bela Vista',
      media: null,
      authorId: pedro.id, authorName: pedro.name,
      createdAt: daysAgo(4),
      status: 'aberto',
      validated: false,
      removido: false,
      confirmedResolved: false,
      officialResponse: null,
      likes: [ana.id],
      comments: [],
    },
    {
      id: uid('d'),
      title: 'Lixo acumulado em terreno baldio',
      description: 'Moradores estão descartando entulho irregularmente, atraindo insetos e roedores.',
      category: 'lixo',
      location: 'Rua Tiradentes, 120',
      media: null,
      authorId: ana.id, authorName: ana.name,
      createdAt: daysAgo(15),
      status: 'resolvido',
      validated: true,
      removido: false,
      confirmedResolved: true,
      officialResponse: { text: 'Terreno limpo pela equipe de zeladoria urbana em mutirão.', authorName: admin.name, date: daysAgo(9) },
      likes: [pedro.id, admin.id],
      comments: [
        { id: uid('c'), parentId: null, authorId: ana.id, authorName: ana.name, text: 'Confirmo, já foi limpo. Muito obrigada!', createdAt: daysAgo(8) },
      ],
    },
  ];
  saveDenuncias(denuncias);
}

/* ---------------- notificações ---------------- */

function getNotifications() { return readJSON(DB.NOTIFICATIONS, []); }

function addNotification(userId, message, denunciaId) {
  if (!userId) return;
  const list = getNotifications();
  list.unshift({ id: uid('n'), userId, message, denunciaId, read: false, createdAt: nowISO() });
  writeJSON(DB.NOTIFICATIONS, list.slice(0, 300)); // limite de segurança
}

function getUserNotifications(userId) {
  return getNotifications()
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function unreadCountFor(userId) {
  return getUserNotifications(userId).filter(n => !n.read).length;
}

function markAllRead(userId) {
  const list = getNotifications();
  list.forEach(n => { if (n.userId === userId) n.read = true; });
  writeJSON(DB.NOTIFICATIONS, list);
}

function markOneRead(id) {
  const list = getNotifications();
  const n = list.find(x => x.id === id);
  if (n) { n.read = true; writeJSON(DB.NOTIFICATIONS, list); }
}

/* ---------------- rascunho de nova denúncia ---------------- */

function draftKey(userId) { return 'ac_draft_' + userId; }

function getDraft(userId) {
  const raw = readJSON(draftKey(userId), null);
  if (!raw) return null;
  if (Date.now() - raw.savedAt > DRAFT_TTL_MS) { clearDraft(userId); return null; }
  return raw;
}

function saveDraft(userId, draft) {
  writeJSON(draftKey(userId), { ...draft, savedAt: Date.now() });
}

function clearDraft(userId) {
  localStorage.removeItem(draftKey(userId));
}

/* ---------------- ações de autenticação ---------------- */

function registerCitizen({ name, email, password }) {
  name = name.trim(); email = email.trim();
  if (!name || !email || !password) return { ok: false, msg: 'Preencha todos os campos.' };
  if (password.length < 4) return { ok: false, msg: 'A senha deve ter ao menos 4 caracteres.' };
  if (findUserByEmail(email)) return { ok: false, msg: 'Já existe uma conta com esse e-mail.' };

  const user = { id: uid('u'), name, email, password, role: 'cidadao', photo: null, createdAt: nowISO() };
  const users = getUsers();
  users.push(user);
  saveUsers(users);
  setSession(user.id);
  return { ok: true, user };
}

function login({ email, password }) {
  const user = findUserByEmail((email || '').trim());
  if (!user || user.password !== password) return { ok: false, msg: 'E-mail ou senha inválidos.' };
  setSession(user.id);
  return { ok: true, user };
}

function logout() { clearSession(); }

function createUserByAdmin({ name, email, password, role }) {
  name = (name || '').trim(); email = (email || '').trim();
  if (!name || !email || !password || !role) return { ok: false, msg: 'Preencha todos os campos.' };
  if (findUserByEmail(email)) return { ok: false, msg: 'Já existe uma conta com esse e-mail.' };
  if (!['admin', 'moderador', 'superadmin'].includes(role)) return { ok: false, msg: 'Função inválida.' };

  const user = { id: uid('u'), name, email, password, role, photo: null, createdAt: nowISO() };
  const users = getUsers();
  users.push(user);
  saveUsers(users);
  return { ok: true, user };
}

function resetUserPassword(userId, newPassword) {
  const users = getUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return { ok: false, msg: 'Usuário não encontrado.' };
  if (!newPassword || newPassword.length < 4) return { ok: false, msg: 'Senha deve ter ao menos 4 caracteres.' };
  u.password = newPassword;
  saveUsers(users);
  return { ok: true };
}

function updateUserPhoto(userId, photoDataUrl) {
  const users = getUsers();
  const u = users.find(x => x.id === userId);
  if (!u) return { ok: false };
  u.photo = photoDataUrl;
  saveUsers(users);
  return { ok: true, user: u };
}

/* ---------------- ações de denúncias ---------------- */

function createDenuncia({ title, description, category, location, media }) {
  const user = currentUser();
  if (!user) return { ok: false, msg: 'Sessão expirada.' };
  if (!title.trim() || !description.trim() || !category || !location.trim()) {
    return { ok: false, msg: 'Preencha todos os campos obrigatórios.' };
  }
  const list = getDenuncias();
  const d = {
    id: uid('d'),
    title: title.trim(),
    description: description.trim(),
    category,
    location: location.trim(),
    media: media || null,
    authorId: user.id,
    authorName: user.name,
    createdAt: nowISO(),
    status: 'aberto',
    validated: false,
    removido: false,
    confirmedResolved: false,
    officialResponse: null,
    likes: [],
    comments: [],
  };
  list.unshift(d);
  saveDenuncias(list);
  return { ok: true, denuncia: d };
}

function getDenunciaById(id) {
  return getDenuncias().find(d => d.id === id) || null;
}

function updateDenuncia(id, patch) {
  const list = getDenuncias();
  const idx = list.findIndex(d => d.id === id);
  if (idx === -1) return { ok: false };
  list[idx] = { ...list[idx], ...patch };
  saveDenuncias(list);
  return { ok: true, denuncia: list[idx] };
}

function toggleLike(id) {
  const user = currentUser();
  if (!user) return;
  const list = getDenuncias();
  const d = list.find(x => x.id === id);
  if (!d) return;
  const i = d.likes.indexOf(user.id);
  if (i === -1) d.likes.push(user.id); else d.likes.splice(i, 1);
  saveDenuncias(list);
}

/* comentários — com suporte a respostas aninhadas via parentId */

function addComment(id, text, parentId) {
  const user = currentUser();
  if (!user || !text.trim()) return;
  const list = getDenuncias();
  const d = list.find(x => x.id === id);
  if (!d) return;

  const comment = {
    id: uid('c'),
    parentId: parentId || null,
    authorId: user.id,
    authorName: user.name,
    text: text.trim(),
    createdAt: nowISO(),
  };
  d.comments.push(comment);
  saveDenuncias(list);

  if (d.authorId !== user.id) {
    addNotification(d.authorId, `${user.name} comentou na sua denúncia "${d.title}".`, id);
  }
  if (parentId) {
    const parent = d.comments.find(c => c.id === parentId);
    if (parent && parent.authorId !== user.id && parent.authorId !== d.authorId) {
      addNotification(parent.authorId, `${user.name} respondeu ao seu comentário em "${d.title}".`, id);
    }
  }
}

function removeComment(denunciaId, commentId) {
  const list = getDenuncias();
  const d = list.find(x => x.id === denunciaId);
  if (!d) return;

  // remove o comentário e, em cascata, todas as respostas dele
  const idsToRemove = new Set([commentId]);
  let changed = true;
  while (changed) {
    changed = false;
    d.comments.forEach(c => {
      if (c.parentId && idsToRemove.has(c.parentId) && !idsToRemove.has(c.id)) {
        idsToRemove.add(c.id);
        changed = true;
      }
    });
  }
  d.comments = d.comments.filter(c => !idsToRemove.has(c.id));
  saveDenuncias(list);
}

function moderateValidate(id) {
  const d = getDenunciaById(id);
  const res = updateDenuncia(id, { validated: true });
  if (d) addNotification(d.authorId, `Sua denúncia "${d.title}" foi validada pela moderação.`, id);
  return res;
}

function moderateRemove(id) {
  const d = getDenunciaById(id);
  const res = updateDenuncia(id, { removido: true });
  if (d) addNotification(d.authorId, `Sua denúncia "${d.title}" foi removida pela moderação.`, id);
  return res;
}

function adminSetStatus(id, status) {
  const d = getDenunciaById(id);
  const res = updateDenuncia(id, { status });
  if (d) addNotification(d.authorId, `Sua denúncia "${d.title}" mudou para o status "${STATUSES[status].label}".`, id);
  return res;
}

function adminRespond(id, text) {
  const user = currentUser();
  if (!text.trim()) return { ok: false };
  const d = getDenunciaById(id);
  const res = updateDenuncia(id, { officialResponse: { text: text.trim(), authorName: user.name, date: nowISO() } });
  if (d) addNotification(d.authorId, `Você recebeu uma resposta oficial na denúncia "${d.title}".`, id);
  return res;
}

function citizenConfirmResolved(id) {
  return updateDenuncia(id, { confirmedResolved: true });
}
