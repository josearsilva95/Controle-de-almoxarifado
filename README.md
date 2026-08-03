# Controle de Movimentação

Sistema de controle de separação de pedidos (PVs) do almoxarifado. Admin cadastra as PVs (número, cliente, urgência); funcionários iniciam, pausam e finalizam a separação. Frontend estático (React + Vite) hospedado no GitHub Pages; dados, autenticação e tempo real via Supabase.

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Database → Replication**, confirme que `pedidos` e `pedido_sessoes` estão habilitadas para Realtime (o script já tenta habilitar via `alter publication`).
4. Em **Authentication → Users → Add user**, crie a conta do **primeiro admin** com o e-mail real da pessoa e uma senha à sua escolha. Marque **"Auto Confirm User"**. Depois deste primeiro admin, os demais colaboradores podem ser criados direto pela tela **Colaboradores → Novo Colaborador** do próprio app (ver seção "Edge Function" abaixo) — não precisa repetir esse passo manual.
5. Em **Table Editor → profiles**, insira uma linha para esse primeiro admin, com o mesmo `id` (uuid do usuário em Authentication → Users), `username` (apelido interno, só exibido na UI), `nome_completo` e `role = 'admin'`.
6. Em **Settings → API**, copie a `Project URL` e a `anon public key` (ou a nova `publishable key`).

### Edge Function (criação de colaboradores pelo app)

A tela **Colaboradores → Novo Colaborador** cria contas direto pelo app, sem precisar do Supabase Studio. Isso exige publicar uma Edge Function que usa a chave secreta (`service_role`) do lado do servidor do Supabase — essa chave nunca vai para o navegador.

1. No painel do Supabase, vá em **Edge Functions** (menu lateral) → **Deploy a new function** → **Via Editor**.
2. Nomeie a função `criar-usuario`.
3. Cole o conteúdo de [`supabase/functions/criar-usuario/index.ts`](supabase/functions/criar-usuario/index.ts) no editor, substituindo o template.
4. Clique em **Deploy function**. As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já ficam disponíveis automaticamente para a função — não precisa configurar nada extra.
5. Pronto — a tela **Colaboradores → Novo Colaborador** do app já vai funcionar, chamando essa função (`supabase.functions.invoke('criar-usuario', ...)`), que verifica se quem chamou é admin antes de criar a conta.

Alternativa via CLI (`supabase functions deploy criar-usuario`), se preferir: requer instalar o [Supabase CLI](https://supabase.com/docs/guides/cli), rodar `supabase login`, `supabase link --project-ref SEU_PROJECT_REF` e então o deploy.

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
