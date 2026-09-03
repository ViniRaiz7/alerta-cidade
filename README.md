<<<<<<< HEAD
# AlertaCidade

Sistema de denúncias urbanas colaborativas: cidadãos registram problemas
(buraco, iluminação, semáforo, lixo, segurança) com foto ou vídeo e
localização; moderadores validam ou removem conteúdo; administradores
atualizam status e respondem oficialmente; um super admin gerencia contas
de equipe. Curtidas, comentários em thread e notificações permitem
acompanhar cada denúncia até a resolução.

## Estrutura do projeto

```
.
├── frontend/          # interface web (HTML/CSS/JS puros, sem build)
├── backend/           # API REST (Node.js + Express + PostgreSQL/Prisma)
└── docker-compose.yml # sobe banco + API + front estático com um comando
```

Cada pasta tem seu próprio README com detalhes (estrutura interna, como
rodar, decisões técnicas): [`frontend/README.md`](./frontend/README.md) e
[`backend/README.md`](./backend/README.md).

## Estado atual do projeto

**Front-end**: funcional e completo para as regras de negócio pedidas —
autenticação, os 4 papéis, denúncias com foto/vídeo (upload ou câmera),
comentários em thread, notificações, rascunho de formulário, painel do
super admin. Hoje ele roda **sozinho**, simulando o backend com o
`LocalStorage` do navegador.

**Backend**: a API está com a base pronta — banco de dados modelado
(Prisma/PostgreSQL), autenticação por JWT, upload de mídia com validação de
tamanho e duração de vídeo, e um endpoint para cada ação que o front-end já
faz (criar/curtir/comentar/responder/etc.), com as mesmas regras de
permissão por papel.

**O que ainda falta**: ligar as duas pontas. Hoje o front-end conversa com
`LocalStorage`, não com esta API — trocar isso é o próximo passo natural:
substituir cada função de `frontend/js/data.js` por uma chamada `fetch` ao
backend, guardar o token JWT (em vez do "usuário logado" salvo direto no
LocalStorage) e tratar estados de carregamento/erro na interface. A
arquitetura de ambos os lados já foi pensada para isso (mesmo modelo de
dados, mesmos papéis, mesmas regras), então essa etapa é sobretudo
mecânica, mas é grande o suficiente para valer seu próprio ciclo de
implementação e testes.

## Como rodar tudo com Docker

```bash
docker compose up --build
```

Isso sobe:
- **PostgreSQL** em `localhost:5432`
- **API** em `http://localhost:3333`
- **Front-end** estático em `http://localhost:8080`

Para popular o banco com contas de teste:

```bash
docker compose exec backend npm run seed
```

## Como rodar cada parte separadamente (sem Docker)

Útil enquanto o front-end ainda não depende da API para nada — você pode
mexer em um sem precisar subir o outro.

**Front-end** (não precisa de instalação):
```bash
npx serve frontend
```

**Backend** (precisa de um PostgreSQL rodando — veja `backend/README.md`):
```bash
cd backend
cp .env.example .env   # ajuste DATABASE_URL
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

## Padrões seguidos

- **Separação por responsabilidade em ambas as pontas**: no front, dados
  (`data.js`) / interface (`ui.js`) / câmera (`camera.js`) não se misturam;
  no back, `controllers` → `services` → `routes` → `middlewares` seguem a
  separação convencional de uma API Express.
- **Banco relacional com ORM tipado** (Prisma + PostgreSQL) em vez de
  SQLite ou acesso a banco "cru", como pedido — migrações versionadas em
  `backend/prisma/`.
- **Autenticação por JWT com papéis** (`CIDADAO`, `MODERADOR`, `ADMIN`,
  `SUPERADMIN`), autorização por rota, senhas sempre com hash (bcrypt),
  nunca devolvidas pela API.
- **Validação de entrada centralizada** (Zod no backend) em vez de checagem
  solta espalhada pelos controllers.
- **Containerização** com `Dockerfile` (backend) e `docker-compose.yml`
  (projeto completo), para reproduzir o ambiente de forma idêntica em
  qualquer máquina.
=======
# alerta-cidade
>>>>>>> db7fdae9a90f6d86d5adf10caea0b1693b0db4a1
