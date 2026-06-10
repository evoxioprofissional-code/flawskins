# FlawSkins

O classificado P2P definitivo para skins de CS2. O vendedor cadastra a skin em
segundos, o anúncio entra no feed público e o comprador fecha negócio **direto
no WhatsApp** — sem checkout, carrinho ou gateway de pagamento.

Stack: **Next.js 16 (App Router) · React · TypeScript · Tailwind CSS v4 ·
shadcn/ui · React Hook Form · Zod · Supabase (Postgres + Storage)**.

> Observação de stack: o `create-next-app` mais recente já vem com **Tailwind
> v4**, que configura tema via CSS (`@theme`/`@custom-variant`) em
> `src/app/globals.css` em vez de `tailwind.config.ts`. O dark mode (classe
> `dark`) e a cor custom `whatsapp` (`#25D366`) estão definidos lá.

---

## 1. Pré-requisitos

- Node.js 18.18+ (recomendado 20+)
- Uma conta/projeto no [Supabase](https://supabase.com)

## 2. Variáveis de ambiente

Copie o template e preencha com as chaves do seu projeto Supabase
(Painel → Project Settings → **API**):

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_ou_publishable_key
```

> `.env.local` **não é commitado** (já está no `.gitignore`).

## 3. Banco de dados (rodar o schema no Supabase)

O schema **não** é aplicado por CLI. Rode-o manualmente:

1. Abra o painel do Supabase → **SQL Editor** → **New query**.
2. Cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Clique em **Run**.

Isso cria os enums, a tabela `public.anuncios`, os índices, as policies de RLS
(leitura/inserção públicas no MVP) e o bucket público **`skins`** no Storage.

## 4. Rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

- `/` — feed de skins
- `/novo` — criar anúncio
- `/skin/[id]` — detalhe + botão "Comprar via WhatsApp"

Build de produção:

```bash
npm run build && npm run start
```

---

## 5. Segurança / melhorias para a v2

Este MVP foi pensado para **baixa fricção** (sem login). Antes de ir para
produção de verdade, priorize:

1. **Autenticação (Supabase Auth)** — vincular cada anúncio a um `auth.uid()` e
   exigir login para anunciar.
2. **Travar as policies de RLS** — hoje `INSERT` na tabela e `upload` no Storage
   são públicos (risco de spam/abuso). Restringir INSERT/UPDATE/DELETE por dono
   autenticado.
3. **Marcar como vendido** — habilitar UPDATE de `status` apenas para o dono do
   anúncio (já previsto no schema, sem policy de propósito).
4. **Moderação de imagens e conteúdo** — validação/limite de tamanho no servidor,
   varredura de conteúdo impróprio e denúncia.
5. **Rate limit de inserção** — limitar criação de anúncios por IP/usuário para
   conter flood, além de captcha no formulário.

O selo de "verificado" no bloco do vendedor é **apenas cosmético** no MVP
(ver `// TODO (v2)` em `src/components/skins/SellerBlock.tsx`).
