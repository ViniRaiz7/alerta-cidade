# AlertaCidade — Front-end

Interface web do sistema de denúncias urbanas colaborativas. HTML/CSS/JS
puros (sem build, sem framework) — abra `index.html` num navegador ou sirva
a pasta com qualquer servidor estático.

> Hoje este front-end funciona de forma independente, usando o
> `LocalStorage` do navegador para simular um backend (contas, denúncias,
> notificações). A API real já está sendo construída em `../backend` — ver
> o README da raiz do projeto para o estágio atual da integração entre os
> dois.

## Estrutura de pastas

```
frontend/
├── index.html          # esqueleto da página; importa os arquivos abaixo
├── css/
│   └── style.css        # design system: cores, tipografia, componentes, responsivo
└── js/
    ├── camera.js          # captura de câmera (getUserMedia/MediaRecorder) — não conhece o resto do app
    ├── data.js              # "banco de dados": LocalStorage, autenticação, regras de negócio
    └── ui.js                 # renderização das telas e todos os eventos de clique/input/submit
```

A ordem de carregamento em `index.html` importa: `camera.js` e `data.js` não
dependem um do outro, mas `ui.js` depende dos dois.

## Como rodar

Não precisa de instalação nem build. Duas opções:

- Abrir `index.html` diretamente no navegador; ou
- Servir a pasta com qualquer servidor estático (recomendado, porque a
  câmera — `getUserMedia` — exige um contexto seguro, e `file://` nem sempre
  conta como tal dependendo do navegador):

  ```bash
  npx serve frontend
  # ou
  python3 -m http.server 8080 --directory frontend
  ```

## Contas de teste

Criadas automaticamente na primeira execução (ver `ensureSeedData()` em
`js/data.js`):

| Papel | E-mail | Senha |
|---|---|---|
| Super Admin | super@urbano.com | super123 |
| Admin | admin@urbano.com | admin123 |
| Moderador | moderadora@urbano.com | mod123 |
| Cidadã | ana@mail.com | 123456 |
| Cidadão | pedro@mail.com | 123456 |

## Funcionalidades

- **Autenticação** (LocalStorage): cadastro sempre cria conta CIDADAO; login valida e-mail/senha.
- **4 papéis**: cidadão, moderador, admin, super admin — navegação e ações mudam conforme o papel.
- **Denúncias**: título, descrição, categoria, localização, **foto ou vídeo** (upload de arquivo ou captura direta pela câmera do dispositivo), status, curtidas, comentários.
- **Vídeo com limite de 3 minutos**: tanto gravando pela câmera (para automaticamente ao atingir o limite) quanto enviando um arquivo já existente (a duração é checada antes de aceitar).
- **Comentários em thread**: é possível responder a um comentário específico, com indentação visual e remoção em cascata pela moderação.
- **Notificações**: sino no topo com contador de não lidas; dispara quando alguém comenta/responde na sua denúncia, muda o status, valida, remove ou responde oficialmente.
- **Rascunho de denúncia**: os campos do formulário de "Nova denúncia" são salvos automaticamente por até 30 minutos, mesmo se você sair da tela ou fechar o navegador.
- **Foto de perfil**: qualquer usuário pode trocar a própria foto, escolhendo entre a galeria ou a câmera.
- **Painel do super admin**: lista de usuários com filtro por papel e busca, criação de admin/moderador/super admin, redefinição de senha (a senha atual nunca é exibida).
- **Responsivo**: navegação por barra superior no desktop, barra inferior fixa no mobile.

## Decisões técnicas relevantes

- **Sem framework, sem build**: o app inteiro é renderizado via
  `innerHTML` a partir do estado em `ui.js` (padrão "render function" bem
  simples) com delegação de eventos em `document` — não há dependências
  além do próprio navegador.
- **`#modal-root` fica fora de `#app`** (ver `index.html`): um modal de
  câmera aberto tem um `<video>` com um `MediaStream` ativo; se ele fosse
  filho de `#app`, qualquer `render()` disparado por outro motivo (ex.: um
  toast expirando) destruiria o elemento no meio de uma captura.
- **Mídia é armazenada como base64 no LocalStorage** nesta fase (sem
  backend real). Isso é adequado para fotos, mas vídeos podem esbarrar no
  limite de armazenamento do navegador (tipicamente 5–10MB por origem) —
  é uma limitação conhecida desta fase "só front-end", resolvida
  naturalmente quando a integração com a API (`../backend`, que já salva
  mídia em disco/arquivo) estiver pronta.
