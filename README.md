# Fidelidade White-Label

Cartão fidelidade digital para restaurantes/bares. O cliente escaneia um QR Code
por dia; a cada N carimbos ganha uma recompensa (ex.: "a cada 10 refeições, uma é
por conta da casa"). Marca, cores e estratégia são configuráveis pelo próprio
estabelecimento — o mesmo código atende marcas diferentes.

**Stack:** Next.js 14 (App Router) · Supabase (Auth + Postgres) · Docker · Caddy (HTTPS).

---

## Como funciona

- **Cliente:** entra com Google ou e-mail/senha, vê seu cartão de carimbos e usa a
  câmera para ler o QR do balcão. Ao completar o cartão, recebe um código de resgate.
- **Estabelecimento (admin):** configura marca (cores, logo, fonte) e estratégia
  (nº de carimbos, recompensa, limite por dia, rotação do QR), exibe o QR do dia
  numa tela e acompanha métricas.
- **Anti-fraude:** o QR não é estático. Ele carrega um token que muda a cada
  X segundos (HMAC do segredo do tenant + janela de tempo). Só quem está presente
  lê o código atual. O backend valida o token antes de carimbar (via `service_role`),
  e a regra "N por dia" é aplicada de forma atômica no Postgres.

---

## 1. Supabase (cloud)

1. Crie um projeto em https://supabase.com.
2. Em **SQL Editor**, rode na ordem:
   - `supabase/migrations/0001_init.sql` (tabelas, RLS, função de carimbo, tenant de exemplo)
   - `supabase/migrations/0002_multitenant.sql` (domínios, super admin, provisionamento)
3. Em **Authentication > Providers**, habilite **Email** e **Google**
   (no Google, configure o OAuth Client e a URL de redirecionamento
   `https://SEU_DOMINIO/auth/callback`). Adicione o mesmo em
   **Authentication > URL Configuration > Redirect URLs**.
4. Em **Authentication > Providers**, habilite **Email** e **Google**. Em
   **Authentication > URL Configuration > Redirect URLs**, permita o callback em
   todos os domínios usados. Com subdomínios, use curinga:
   `https://*.fidelidade.suaempresa.com.br/auth/callback` (e adicione cada
   domínio próprio de cliente, ex.: `https://fidelidade.cliente.com.br/auth/callback`).

5. Em **Project Settings > API**, copie `Project URL`, a chave `anon` e a `service_role`.

### Definir o super admin (dono da plataforma)

O super admin cria estabelecimentos e nomeia os admins de cada um. Após você
fazer login uma vez, promova sua conta:

```sql
update public.profiles set is_super_admin = true
where id = (select id from auth.users where email = 'voce@exemplo.com');
```

Depois acesse `/platform` para criar estabelecimentos e nomear seus donos.

---

## 2. Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # segredo — nunca vai pro cliente
TENANT_SLUG=seu-donario
```

---

## 3. Rodar local (desenvolvimento)

```bash
npm install
npm run dev
# http://localhost:3000
```

> A câmera funciona em `localhost` mesmo sem HTTPS. Em produção, HTTPS é obrigatório.

---

## 4. Deploy multi-tenant na VPS

### DNS

Um único deploy atende vários estabelecimentos. Aponte para o IP da VPS:

- **Curinga** `*.fidelidade.suaempresa.com.br` → dá um subdomínio a cada tenant
  (`donario.fidelidade...`, `barx.fidelidade...`).
- **Raiz** `fidelidade.suaempresa.com.br` → o painel `/platform`.
- **Domínio próprio do cliente:** o cliente cria um registro A/CNAME apontando
  o domínio dele para a VPS, e você cadastra esse domínio no campo *Domínio
  próprio* ao criar o estabelecimento.

Defina `ROOT_DOMAIN` no `.env` com o domínio-raiz (ex.: `fidelidade.suaempresa.com.br`).

### Subir

```bash
docker compose up -d --build
```

O Caddy usa **on-demand TLS**: emite/renova certificado sozinho para qualquer
domínio válido (subdomínio ou domínio próprio), consultando `/api/tls-check`
antes de emitir — sem editar config a cada novo cliente. HTTPS é obrigatório
porque a câmera do leitor de QR (getUserMedia) só funciona em conexão segura.

Atualizar após mudanças:

```bash
git pull && docker compose up -d --build
```

> As variáveis `NEXT_PUBLIC_*` entram no build; se trocá-las, rode com `--build`.

---

## Como funciona o multi-tenant

- **Resolução por host:** cada requisição descobre o estabelecimento pelo domínio
  — primeiro por *domínio próprio* (`custom_domain`), depois por *subdomínio*
  (`slug` + `ROOT_DOMAIN`). A marca (cores/logo) é aplicada conforme o host.
- **Uma conta, vários cartões:** o mesmo usuário do Supabase Auth pode ter cartão
  em vários estabelecimentos (um cartão por programa). Ao abrir o cartão num
  domínio, `attach_customer` garante o cartão daquele estabelecimento.
- **Carimbo no lugar certo:** o QR carrega o `slug` do estabelecimento; o
  `/api/stamp` valida o token contra o segredo *daquele* tenant. Assim, escanear
  o QR do bar B credita no cartão do bar B, mesmo que você tenha se cadastrado no A.
- **Provisionamento:** o super admin cria tenants e nomeia admins em `/platform`
  (funções `create_tenant` e `grant_admin`, protegidas por `is_super_admin`).

---

## Estrutura

```
supabase/migrations/0001_init.sql        Schema + RLS + função de carimbo
supabase/migrations/0002_multitenant.sql Domínios, super admin, provisionamento
src/lib/tenant.ts                        Resolução do tenant pelo host
src/lib/token.ts                         Token rotativo (HMAC estilo TOTP)
src/lib/supabase/*                       Clients (browser, server, admin, middleware)
src/app/login                            Login/cadastro (vincula ao tenant do host)
src/app/(app)/cartao                     Cartão do cliente (por estabelecimento)
src/app/(app)/scan                       Leitor de QR do cliente
src/app/admin/*                          Painel do estabelecimento
src/app/platform/*                       Painel do super admin (cria tenants)
src/app/api/stamp                        Valida token do QR + registra carimbo
src/app/api/token                        Token atual do QR (só admin)
src/app/api/tls-check                    Valida domínio para o Caddy (on-demand TLS)
```

---

## Como usar no dia a dia

1. O dono acessa `/admin/qrcode` e deixa a tela (tablet/monitor) no balcão.
2. O cliente abre o app, toca em **Escanear QR e carimbar** e aponta a câmera.
3. Ao fechar o cartão, aparece um código de resgate; o caixa confere e marca como
   resgatado (a implementar na tela de admin, se quiser).

---

## O que já vem pronto vs. próximos passos

**Pronto:** white-label por tenant, auth Google/e-mail, cartão digital, QR rotativo
seguro, regra "N por dia", geração de recompensa, painel com métricas básicas,
configuração de marca e estratégia, Docker + HTTPS.

**Sugestões de evolução:** tela de resgate de recompensas no admin, upload de logo
para o Supabase Storage (hoje é por URL), multi-tenant por domínio/subdomínio,
notificações, e confirmação de e-mail/onboarding.
