// Nunca devolvemos o hash da senha pela API. Toda vez que um controller for
// montar uma resposta contendo um usuário (perfil próprio, item de uma lista
// de usuários, autor de uma denúncia, etc.), passa por aqui antes.

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

module.exports = sanitizeUser;
