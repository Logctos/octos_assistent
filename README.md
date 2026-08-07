# Octos

Assistente pessoal: chat com IA (texto e voz, com function calling para lançar despesas, criar eventos na agenda e resumir notícias de IA), gestão de despesas/projetos e integração com Google Agenda.

> **Status**: chat funcional (streaming, comando por voz, resposta falada, function calling), autenticação por email/senha, CRUD de despesas/projetos e conexão com Google Agenda prontos. Notificações push não fazem parte do escopo atual — veja "Próximos passos".

## Arquitetura

Octos é uma **SPA (Single Page Application)** — só frontend, sem servidor próprio. Tudo roda no navegador e fala direto com serviços de terceiros:

```
┌─────────────────────────────────────────────┐
│  App (Vite + React + React Router)           │
│  - Interface Octos (login + chat)            │
│  - Chat com OpenAI direto do navegador       │
│  - Gestão de despesas/projetos               │
│  - Integração com Google Agenda              │
└────────────────┬──────────────────────────────┘
                  │
        ┌─────────┼─────────────┐
        ↓         ↓             ↓
┌───────────┐ ┌─────────┐ ┌──────────────┐
│  Supabase │ │ OpenAI  │ │ Google       │
│  - Auth   │ │  API    │ │ Calendar API │
│  - DB/RLS │ │ (chave  │ │ (via token   │
│  - Edge   │ │  do     │ │  OAuth do    │
│  Function │ │  usuário)│ │  Supabase)  │
│  (notícias)│ └─────────┘ └──────────────┘
└───────────┘
```

Não há backend próprio: CRUD de despesas/projetos e a conexão com o Google Agenda usam o client do Supabase direto do navegador, protegidos por Row Level Security (RLS) — cada linha só é visível/editável pelo `user_id` dono. A única exceção é a busca de notícias de IA (`get_ai_news`), que passa por uma Supabase Edge Function só para evitar bloqueio de CORS no feed RSS de origem.

## Chave da OpenAI

Como não existe servidor para guardar uma chave compartilhada em segredo, **cada usuário usa a própria chave da OpenAI**, colada na interface (ícone ⚙︎ no chat) e salva só no `localStorage` do navegador — nunca enviada a lugar nenhum além da API da OpenAI diretamente.

## Estrutura de pastas

```
src/
├── main.tsx, App.tsx, index.css, fonts.ts   # bootstrap, rotas, fontes self-hosted
├── routes/
│   ├── marketing.tsx, login.tsx             # páginas públicas
│   ├── auth-callback.tsx                    # callback do OAuth do Google (Supabase identity linking)
│   ├── chat.tsx                             # monta dados do dashboard e renderiza <ChatPanel>
│   ├── despesas.tsx, projetos.tsx           # páginas autenticadas
├── features/
│   ├── chat/run-chat.ts                     # loop de streaming + tool calling com a OpenAI, direto do browser
│   ├── despesas/api.ts, expense-form.tsx    # CRUD de despesas (Supabase direto)
│   └── projetos/api.ts, project-form.tsx    # CRUD de projetos (Supabase direto)
├── components/
│   ├── chat-panel.tsx                       # chat (texto, voz, config de chave/voz)
│   ├── app-header.tsx                       # navegação + usuário/logout
│   ├── protected-layout.tsx                 # gate de autenticação (substitui o proxy.ts do Next)
│   └── redirect-if-authed.tsx               # redireciona usuário logado pra fora de /login e /
├── lib/
│   ├── supabase.ts                          # client Supabase (browser, sessão em localStorage)
│   ├── auth-context.tsx                     # AuthProvider/useAuth (reativo via onAuthStateChange)
│   ├── google-calendar.ts                   # chamadas à Calendar API do Google
│   ├── tech-news.ts                         # chama a Edge Function tech-news
│   └── hooks/use-speech-recognition.ts, use-speech-synthesis.ts
└── types/index.ts                           # tipos de domínio (ChatMessage, Expense, Project)
supabase/schema.sql                          # schema de despesas/projetos + RLS (rodar manualmente)
vercel.json                                  # rewrite de SPA (todas as rotas → index.html)
```

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar projeto no Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Em **Project Settings > API**, copie a `Project URL` e a `publishable key` → `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Em **Authentication > Users > Add user**, crie o seu usuário (email + senha) com **"Auto Confirm User"** marcado — não há fluxo de cadastro público nem confirmação por email neste app; esse é o único jeito de entrar.
4. Em **SQL Editor > New query**, cole o conteúdo de [supabase/schema.sql](supabase/schema.sql) e rode uma vez — cria as tabelas `expenses`/`projects` com RLS já configurado.
5. Em **Authentication > Sign In / Providers > Google**, habilite o provider e configure o Client ID/Secret do Google (necessário só se for usar a conexão com o Google Agenda).
6. Deploy da Edge Function de notícias (usa a Supabase CLI):
   ```bash
   supabase functions deploy tech-news --project-ref <seu-project-ref>
   ```
   O código já está publicado no projeto usado neste repositório; rode esse passo apenas se estiver configurando um projeto Supabase novo.

### 3. Obter chave da OpenAI

Não é uma variável de ambiente — cada usuário cola a própria chave na interface do app (ícone ⚙︎ no chat, gerada em https://platform.openai.com/api-keys). Fica salva só no navegador.

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `.env.local` com os valores do passo 2.

### 5. Rodar localmente

```bash
npm run dev
```

Abra http://localhost:5173 — você será redirecionado para `/login`. Entre com o usuário criado no passo 2.3.

### 6. Deploy na Vercel

1. Importe o repositório na Vercel — é detectado como um projeto Vite estático (`npm run build`, saída em `dist/`).
2. Configure as mesmas variáveis de `.env.local` em **Settings > Environment Variables**.
3. `vercel.json` já reescreve todas as rotas para `index.html`, necessário para o roteamento client-side (React Router) funcionar em refresh/link direto.

## Voz

O botão 🎙️ (comando por voz) e o toggle 🔊 (resposta falada) usam a Web Speech API do navegador — funcionam bem em Chrome/Edge; em navegadores sem suporte (ex.: Firefox), eles somem sozinhos e o chat continua funcionando normalmente por texto. Em celular, a API de voz só toca áudio depois de um primeiro toque na tela (política de autoplay do navegador) — isso já é tratado automaticamente.

## Despesas e projetos

Formulários simples em `/despesas` e `/projetos`: criar, excluir, e (só para projetos) mudar status (ativo/pausado/concluído). Cada linha pertence a um `user_id`, protegida por RLS — mesmo com a `publishable key` exposta no client, ninguém vê ou edita dados de outro usuário. Edição de campos existentes ainda não existe (só criar/excluir por enquanto). A IA também consegue lançar despesas e criar eventos na agenda direto pela conversa (function calling).

## Próximos passos (ainda não implementados)

- Notificações push (avaliado e adiado — exigiria voltar a ter algum componente de servidor, como uma Supabase Edge Function agendada).
- Edição de despesas/projetos já criados.
- "Esqueci minha senha" (por enquanto, reset é manual pelo painel do Supabase).
