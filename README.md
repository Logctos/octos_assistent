# Octos

Assistente pessoal: chat com IA (texto e voz), gestão de despesas/projetos, histórico persistente e notificações push, rodando 24/7 via cron jobs.

> **Status**: chat funcional (streaming, comando por voz, resposta falada), autenticação por email/senha e CRUD de despesas/projetos prontos. Notificações push ainda não foram implementadas — veja "Próximos passos".

## Arquitetura

```
┌─────────────────────────────────────────────┐
│  App (Next.js + React, App Router)           │
│  - Interface Octos (login + chat)            │
│  - Chat com OpenAI (texto e voz)             │
│  - Gestão de despesas/projetos               │
│  - Histórico persistente                     │
└────────────────┬──────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  Backend (Vercel + Cron Jobs) 24/7           │
│  - Rotas de API (app/api/*)                  │
│  - Proxy de autenticação (proxy.ts)          │
│  - Cron jobs (vercel.json)                   │
└────────────────┬──────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  Supabase                                    │
│  - Autenticação (email/senha)                │
│  - Dados persistentes                        │
│  - Histórico de conversas                    │
│  - Despesas/projetos salvos                  │
│  - Tokens FCM para notificações              │
└────────────────┬──────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  OpenAI API                                  │
│  - IA conversacional                         │
│  - Análises e sugestões                      │
└────────────────┬──────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────┐
│  Firebase Cloud Messaging                    │
│  - Notificações push 24/7                    │
│  - Morning brief automático                  │
│  - Alertas de despesas                       │
└─────────────────────────────────────────────┘
```

## Estrutura de pastas

```
app/
├── layout.tsx, globals.css             # layout raiz
├── login/page.tsx                      # login (email/senha), sem navegação
└── (app)/                              # rotas autenticadas (mesmo layout com nav)
│   ├── layout.tsx                      # busca o usuário logado, renderiza <AppHeader>
│   ├── page.tsx                        # chat ("/")
│   ├── despesas/page.tsx, actions.ts, expense-form.tsx
│   └── projetos/page.tsx, actions.ts, project-form.tsx
└── api/
    ├── chat/route.ts                   # chat com IA (streaming)
    └── cron/morning-brief/route.ts     # stub: chamado pelo cron diário
components/
├── chat-panel.tsx                      # chat (texto, voz, config de chave/voz)
├── app-header.tsx                      # navegação + usuário/logout
├── logout-button.tsx
└── project-status-select.tsx
lib/
├── openai.ts                           # client OpenAI (lazy, valida env)
├── hooks/use-speech-recognition.ts     # voz → texto (Web Speech API)
├── hooks/use-speech-synthesis.ts       # texto → voz (Web Speech API)
├── supabase/client.ts                  # client Supabase (browser, sessão em cookies)
├── supabase/server.ts                  # client Supabase (server, por-request, respeita RLS)
├── supabase/admin.ts                   # client Supabase (server-only, secret key, bypassa RLS)
└── firebase/client.ts, admin.ts        # FCM: registro de token / envio de push
proxy.ts                                # protege rotas: redireciona pra /login sem sessão
supabase/schema.sql                     # schema de despesas/projetos + RLS (rodar manualmente)
types/index.ts                          # tipos de domínio (ChatMessage, Expense, Project)
vercel.json                             # config de cron jobs
```

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar projeto no Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Em **Project Settings > API**, copie a `Project URL` e a `publishable key` → `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Na mesma página, copie a `secret key` (nunca exponha no client) → `SUPABASE_SECRET_KEY`.
4. Em **Authentication > Users > Add user**, crie o seu usuário (email + senha) com **"Auto Confirm User"** marcado — não há fluxo de cadastro público nem confirmação por email neste app; esse é o único jeito de entrar.
5. Em **SQL Editor > New query**, cole o conteúdo de [supabase/schema.sql](supabase/schema.sql) e rode uma vez — cria as tabelas `expenses`/`projects` com RLS já configurado.

### 3. Criar projeto no Firebase

1. Crie um projeto em https://console.firebase.google.com.
2. Em **Project Settings > General > Your apps**, registre um app Web e copie o config → variáveis `NEXT_PUBLIC_FIREBASE_*`.
3. Habilite **Cloud Messaging** no projeto.
4. Em **Project Settings > Service accounts**, gere uma nova chave privada (JSON) → preencha `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY` (mantenha as quebras de linha do `private_key`, ou use `\n` escapado).

### 4. Obter chave da OpenAI

1. Crie uma chave em https://platform.openai.com/api-keys → `OPENAI_API_KEY`. Alternativa: cole a chave direto na interface do app (ícone ⚙︎ no chat) — fica salva só no seu navegador, sem precisar editar `.env.local`.

### 5. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `.env.local` com os valores obtidos acima. Gere também um valor aleatório para `CRON_SECRET` (usado para autenticar as chamadas do Vercel Cron às rotas `/api/cron/*`).

### 6. Rodar localmente

```bash
npm run dev
```

Abra http://localhost:3000 — você será redirecionado para `/login`. Entre com o usuário criado no passo 2.4.

### 7. Deploy na Vercel

1. Importe o repositório na Vercel.
2. Configure as mesmas variáveis de `.env.local` em **Settings > Environment Variables**.
3. O cron job definido em `vercel.json` (`/api/cron/morning-brief`, diário às 12:00 UTC) é ativado automaticamente no deploy — a Vercel envia o header `Authorization: Bearer $CRON_SECRET` nessas chamadas (essa rota fica de fora da checagem de login do `proxy.ts`).

## Voz

O botão 🎙️ (comando por voz) e o toggle 🔊 (resposta falada) usam a Web Speech API do navegador — funcionam bem em Chrome/Edge; em navegadores sem suporte (ex.: Firefox), eles somem sozinhos e o chat continua funcionando normalmente por texto.

## Despesas e projetos

Formulários simples em `/despesas` e `/projetos`: criar, excluir, e (só para projetos) mudar status (ativo/pausado/concluído). Cada linha pertence a um `user_id`, protegida por RLS — mesmo com a `publishable key` exposta no client, ninguém vê ou edita dados de outro usuário. Edição de campos existentes ainda não existe (só criar/excluir por enquanto).

## Próximos passos (ainda não implementados)

- Registro de token FCM no browser e envio real de notificações push.
- Lógica do morning brief (resumo diário via cron, usando `lib/supabase/admin.ts`).
- Edição de despesas/projetos já criados.
- "Esqueci minha senha" (por enquanto, reset é manual pelo painel do Supabase).
- IA registrando despesas/projetos direto pelo chat (function calling) — avaliado e adiado de propósito.
