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
2. Aplique o schema pela **connection string direta** (sem abrir o SQL Editor):

   ```bash
   cp .env.example .env   # preencha ao menos DATABASE_URL
   npm install
   npm run db:migrate
   ```

   O runner (`scripts/migrate.mjs`) roda `supabase/migrations/*.sql` na ordem e
   registra o que já aplicou em `public._migrations` (idempotente — pode rodar de novo).

   - Pegue a string em **Settings > Database > Connection string** e use a aba
     **Direct connection** ou **Session pooler**; troque `[YOUR-PASSWORD]` pela senha do banco.
   - Numa VPS **sem IPv6**, prefira a **Session pooler** (IPv4). Evite a
     **Transaction pooler** (6543) para migrations.
   - Alternativa com psql: `psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql`
     e depois `0002_multitenant.sql`. Ou cole os arquivos no SQL Editor manualmente.
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

## 4. Cobrança (Stripe) — mensalidade dos estabelecimentos

A landing page (`/`, no domínio-raiz) vende a assinatura mensal da
plataforma para novos estabelecimentos. O fluxo é self-service:

1. O visitante clica em **"Começar teste grátis"**, informa nome do
   negócio e e-mail em `/assinar`.
2. É redirecionado para o **Checkout do Stripe** (assinatura com 14 dias
   de teste grátis).
3. Ao confirmar o pagamento, o webhook `/api/webhooks/stripe` cria o
   tenant automaticamente (slug gerado do nome, marca padrão, programa
   "Cartão Fidelidade" com 10 carimbos) e envia um **convite por e-mail**
   para o dono definir a senha e virar admin daquele estabelecimento.
4. Atualizações de status (pagamento atrasado, cancelamento) chegam pelo
   mesmo webhook e atualizam `tenants.subscription_status`.

O admin gerencia a própria assinatura em **`/admin/billing`** (trocar
cartão, ver faturas, cancelar) via Portal de Cobrança do Stripe. O super
admin vê o status de cada estabelecimento em `/platform`.

### Configurar no Stripe

1. Crie um **Product** (ex.: "FidelizaEu — Assinatura mensal") com um
   **Price** recorrente mensal. Copie o ID do Price (`price_...`).
2. Em **Developers > API keys**, copie a **Secret key** (`sk_...`).
3. Em **Developers > Webhooks**, crie um endpoint apontando para
   `https://SEU_DOMINIO/api/webhooks/stripe`, escutando:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

   Copie o **Signing secret** (`whsec_...`).
4. Em **Settings > Billing > Customer portal**, ative o portal (permite
   o admin trocar cartão/cancelar sozinho).
5. Preencha no `.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_ID` e `NEXT_PUBLIC_APP_URL` (domínio-raiz da
   plataforma). Rode `--build` de novo (variáveis `NEXT_PUBLIC_*` entram
   no build).

### Sobre o valor da mensalidade

O código já vem com a landing page e o Checkout configurados para
**R$ 97/mês** (14 dias grátis). Esse número é só um ponto de partida —
ajuste o **Price** no Stripe e o texto em `LandingPage.tsx` /
`CheckoutForm.tsx` / `BillingPanel.tsx` para o valor que você escolher.

---

## 5. Deploy multi-tenant na VPS

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
- **Acesso ao `/platform`:** não depende de estar num domínio de um
  estabelecimento — basta estar logado e ser super admin. Use o domínio-raiz
  (`https://SEU_ROOT/platform`) ou o subdomínio reservado
  `PLATFORM_ADMIN_SLUG` (padrão `painel.SEU_ROOT`) como endereço fixo, sem
  misturar com o de nenhum cliente.

---

## Estrutura

```
supabase/migrations/0001_init.sql        Schema + RLS + função de carimbo
supabase/migrations/0002_multitenant.sql Domínios, super admin, provisionamento
supabase/migrations/0003_platform_admin.sql Editar/remover estabelecimentos
supabase/migrations/0004_billing.sql     Campos de assinatura (Stripe) no tenant
scripts/migrate.mjs                      Aplica as migrations via connection string
src/lib/tenant.ts                        Resolução do tenant pelo host
src/lib/token.ts                         Token rotativo (HMAC estilo TOTP)
src/lib/stripe.ts                        Cliente do SDK do Stripe
src/lib/supabase/*                       Clients (browser, server, admin, middleware)
src/components/LandingPage.tsx           Landing page da plataforma (domínio-raiz)
src/app/assinar                          Formulário que inicia o Checkout do Stripe
src/app/admin/billing                    Status da assinatura + Portal de Cobrança
src/app/login                            Login/cadastro (vincula ao tenant do host)
src/app/(app)/cartao                     Cartão do cliente (por estabelecimento)
src/app/(app)/scan                       Leitor de QR do cliente
src/app/admin/*                          Painel do estabelecimento
src/app/platform/*                       Painel do super admin (cria tenants)
src/app/api/stamp                        Valida token do QR + registra carimbo
src/app/api/token                        Token atual do QR (só admin)
src/app/api/tls-check                    Valida domínio para o Caddy (on-demand TLS)
src/app/api/billing/checkout             Cria a sessão de Checkout (nova assinatura)
src/app/api/billing/portal               Cria a sessão do Portal de Cobrança
src/app/api/webhooks/stripe              Provisiona o tenant e atualiza status da assinatura
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
configuração de marca e estratégia, Docker + HTTPS, landing page + assinatura
mensal via Stripe (Checkout, Portal de Cobrança, provisionamento automático do
tenant).

**Sugestões de evolução:** tela de resgate de recompensas no admin, upload de logo
para o Supabase Storage (hoje é por URL), notificações, confirmação de
e-mail/onboarding, bloqueio de acesso ao painel quando a assinatura está
vencida (hoje só mostra um aviso), planos com preços diferentes (ex.: mensal
vs. anual, ou por número de unidades).
