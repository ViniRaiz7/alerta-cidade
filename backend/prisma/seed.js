// Popula o banco com contas de teste (uma de cada papel) e algumas
// denúncias de exemplo — só para facilitar testar a API localmente.
// Rodar com: npm run seed
// É seguro rodar mais de uma vez: verifica se já existe antes de criar.

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const already = await prisma.user.findFirst();
  if (already) {
    console.log('Já existem usuários no banco — seed ignorado.');
    return;
  }

  const hash = (pwd) => bcrypt.hash(pwd, 10);

  const superadmin = await prisma.user.create({
    data: { name: 'Super Admin', email: 'super@urbano.com', password: await hash('super123'), role: 'SUPERADMIN' },
  });
  const admin = await prisma.user.create({
    data: { name: 'Carlos Mendes', email: 'admin@urbano.com', password: await hash('admin123'), role: 'ADMIN' },
  });
  await prisma.user.create({
    data: { name: 'Fernanda Lima', email: 'moderadora@urbano.com', password: await hash('mod123'), role: 'MODERADOR' },
  });
  const ana = await prisma.user.create({
    data: { name: 'Ana Souza', email: 'ana@mail.com', password: await hash('123456'), role: 'CIDADAO' },
  });
  const pedro = await prisma.user.create({
    data: { name: 'Pedro Rocha', email: 'pedro@mail.com', password: await hash('123456'), role: 'CIDADAO' },
  });

  const d1 = await prisma.denuncia.create({
    data: {
      title: 'Buraco grande na Av. das Palmeiras',
      description: 'Buraco profundo próximo ao ponto de ônibus, já causou dano em dois carros essa semana.',
      category: 'BURACO',
      location: 'Av. das Palmeiras, 450 — Centro',
      status: 'EM_ANDAMENTO',
      validated: true,
      authorId: ana.id,
    },
  });
  await prisma.officialResponse.create({
    data: { text: 'Equipe de manutenção acionada, previsão de reparo em 3 dias úteis.', authorId: admin.id, denunciaId: d1.id },
  });
  await prisma.like.create({ data: { userId: pedro.id, denunciaId: d1.id } });
  await prisma.comment.create({ data: { text: 'Também passei por aí, é bem perigoso à noite.', authorId: pedro.id, denunciaId: d1.id } });

  await prisma.denuncia.create({
    data: {
      title: 'Poste de luz apagado há 2 semanas',
      description: 'A rua fica totalmente escura à noite, moradores relatam insegurança.',
      category: 'ILUMINACAO',
      location: 'Rua das Acácias, esquina com Rua Bela Vista',
      status: 'ABERTO',
      authorId: pedro.id,
    },
  });

  const d3 = await prisma.denuncia.create({
    data: {
      title: 'Lixo acumulado em terreno baldio',
      description: 'Moradores estão descartando entulho irregularmente, atraindo insetos e roedores.',
      category: 'LIXO',
      location: 'Rua Tiradentes, 120',
      status: 'RESOLVIDO',
      validated: true,
      confirmedResolved: true,
      authorId: ana.id,
    },
  });
  await prisma.officialResponse.create({
    data: { text: 'Terreno limpo pela equipe de zeladoria urbana em mutirão.', authorId: admin.id, denunciaId: d3.id },
  });

  console.log('Seed concluído. Contas criadas:');
  console.log('  super@urbano.com      / super123    (SUPERADMIN)');
  console.log('  admin@urbano.com      / admin123    (ADMIN)');
  console.log('  moderadora@urbano.com / mod123      (MODERADOR)');
  console.log('  ana@mail.com          / 123456      (CIDADAO)');
  console.log('  pedro@mail.com        / 123456      (CIDADAO)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
