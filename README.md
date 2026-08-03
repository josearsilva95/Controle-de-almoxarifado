# Controle de Movimentação

Sistema de controle de separação de pedidos (PVs) do almoxarifado. Admin cadastra as PVs (número, cliente, urgência); funcionários iniciam, pausam e finalizam a separação. Frontend estático (React + Vite) hospedado no GitHub Pages; dados, autenticação e tempo real via Supabase.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Database → Replication**, confirme que `pedidos` e `pedido_sessoes` estão habilitadas para Realtime (o script já tenta habilitar via `alter publication`).
4. Em **Authentication → Users → Add user**, crie uma conta para cada admin/funcionário com o **e-mail real** da pessoa e uma senha à sua escolha. Marque **"Auto Confirm User"** para não depender de confirmação por e-mail.
5. Em **Table Editor → profiles**, insira uma linha para cada usuário criado no passo anterior, com o mesmo `id` (uuid do usuário em Authentication → Users), `username` (apelido interno, só exibido na UI), `nome_completo` e `role` (`admin` ou `funcionario`).
6. Em **Settings → API**, copie a `Project URL` e a `anon public key` (ou a nova `publishable key`).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com a URL e anon key do seu projeto Supabase
npm run dev
```

## Deploy no GitHub Pages

1. Crie o repositório no GitHub e faça push do código.
2. Em **Settings → Pages**, defina Source = "GitHub Actions".
3. Em **Settings → Secrets and variables → Actions**, adicione os secrets `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Todo push em `main` dispara [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que builda e publica automaticamente.

Criação de novas contas de usuário é feita manualmente pelo Supabase Studio (passos 5–6 acima) — nunca pelo app publicado, para não expor a chave de serviço do Supabase no frontend.
