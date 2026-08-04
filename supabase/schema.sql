-- Controle de Movimentação — schema completo do Supabase (Postgres)
-- Rodar tudo de uma vez no SQL Editor do Supabase Studio.

-- ============================================================
-- TABELAS
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  nome_completo text not null,
  role text not null default 'funcionario' check (role in ('admin', 'funcionario')),
  created_at timestamptz not null default now()
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero_pv text not null,
  cliente text not null,
  urgencia text not null check (urgencia in ('urgente', 'medio', 'nao_urgente')),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'pausado', 'finalizado')),
  criado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  iniciado_em timestamptz,
  iniciado_por uuid references public.profiles (id),
  finalizado_em timestamptz,
  finalizado_por uuid references public.profiles (id),
  funcionario_atual uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);

create table public.pedido_sessoes (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id),
  inicio timestamptz not null default now(),
  fim timestamptz,
  duracao_segundos int,
  encerrada_por_evento text check (encerrada_por_evento in ('pausa', 'finalizacao'))
);

-- Garante que só existe UMA sessão aberta (fim is null) por pedido a qualquer momento.
-- Este índice é o mecanismo real de "um funcionário por vez": uma segunda tentativa de
-- iniciar/continuar a mesma PV falha aqui com violação de unique constraint.
create unique index pedido_sessoes_uma_aberta_por_pedido
  on public.pedido_sessoes (pedido_id)
  where fim is null;

create index pedido_sessoes_pedido_id_idx on public.pedido_sessoes (pedido_id);
create index pedidos_status_idx on public.pedidos (status);

-- ============================================================
-- updated_at automático em pedidos
-- ============================================================

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pedidos_set_updated_at
  before update on public.pedidos
  for each row
  execute function public.set_updated_at();

-- ============================================================
-- Função auxiliar is_admin() — usada nas policies de RLS
-- ============================================================

create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_sessoes enable row level security;

-- profiles: qualquer autenticado pode ler todos os perfis (precisa exibir
-- "iniciado por fulano" etc.). Nenhum insert/update é permitido pelo client —
-- contas são criadas manualmente pelo Supabase Studio.
create policy profiles_select_autenticados
  on public.profiles for select
  to authenticated
  using (true);

-- pedidos: leitura liberada a todo autenticado.
create policy pedidos_select_autenticados
  on public.pedidos for select
  to authenticated
  using (true);

-- pedidos: só admin cria PVs.
create policy pedidos_insert_admin
  on public.pedidos for insert
  to authenticated
  with check (public.is_admin());

-- pedidos: update liberado a autenticados. A máquina de estados fina fica
-- garantida pelo índice único parcial em pedido_sessoes + a UI só oferecendo
-- os botões válidos para cada status (trade-off pragmático documentado no plano).
create policy pedidos_update_autenticados
  on public.pedidos for update
  to authenticated
  using (true)
  with check (true);

-- pedidos: só admin exclui (inclusive requisições já finalizadas).
create policy pedidos_delete_admin
  on public.pedidos for delete
  to authenticated
  using (public.is_admin());

-- pedido_sessoes: leitura liberada a todo autenticado (admin precisa ver tudo).
create policy pedido_sessoes_select_autenticados
  on public.pedido_sessoes for select
  to authenticated
  using (true);

-- pedido_sessoes: um funcionário só pode abrir sessão em seu próprio nome.
create policy pedido_sessoes_insert_propria
  on public.pedido_sessoes for insert
  to authenticated
  with check (usuario_id = auth.uid());

-- pedido_sessoes: um funcionário só pode fechar (update) a própria sessão aberta.
create policy pedido_sessoes_update_propria_aberta
  on public.pedido_sessoes for update
  to authenticated
  using (usuario_id = auth.uid() and fim is null)
  with check (usuario_id = auth.uid());

-- pedido_sessoes: só admin exclui — necessário para a cascata funcionar quando
-- um admin exclui a requisição pai (sem isso, o delete em pedidos falha por
-- não ter permissão de apagar as sessões filhas via RLS).
create policy pedido_sessoes_delete_admin
  on public.pedido_sessoes for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- Realtime — habilita replicação para as tabelas usadas nos hooks
-- ============================================================

alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.pedido_sessoes;

-- ============================================================
-- Após rodar este schema:
-- 1. Authentication -> Users -> Add user: criar cada admin/funcionário manualmente
--    com o e-mail real da pessoa e uma senha à sua escolha (o login do app pede
--    e-mail + senha diretamente, sem convenção de e-mail sintético). Marque a opção
--    "Auto Confirm User" ao criar, para não depender de confirmação real por e-mail.
-- 2. Table Editor -> profiles -> Insert row (ou INSERT via SQL Editor): para cada
--    usuário criado no passo 1, inserir uma linha com o mesmo id (uuid do usuário
--    em Authentication -> Users), um username (apelido interno, só exibido na UI),
--    nome_completo e role ('admin' ou 'funcionario').
-- ============================================================
