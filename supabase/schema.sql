-- Controle de Movimentação — schema completo do Supabase (Postgres)
-- Rodar tudo de uma vez no SQL Editor do Supabase Studio.

-- ============================================================
-- TABELAS
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  nome_completo text not null,
  email text,
  role text not null default 'funcionario' check (role in ('admin', 'funcionario', 'lider')),
  deposito text check (deposito in ('deposito_1', 'deposito_2', 'deposito_3')),
  -- Some das listagens de gestão (ex: painel Colaboradores) sem perder acesso —
  -- usado pra manter o usuário master fora da lista visível.
  oculto boolean not null default false,
  -- Enxerga requisições/desempenho de todos os depósitos mesmo sem ser admin —
  -- concedido manualmente por conta específica (ex: líder de equipe), não por papel.
  lider_geral boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero_pv text not null,
  cliente text not null,
  quantidade_itens integer not null,
  urgencia text not null check (urgencia in ('urgente', 'medio', 'nao_urgente')),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'pausado', 'finalizado')),
  deposito text not null check (deposito in ('deposito_1', 'deposito_2', 'deposito_3')),
  motivo_pausa text check (motivo_pausa in ('falta_estoque', 'empilhadeira', 'equipamento_quebrado')),
  criado_por uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  iniciado_em timestamptz,
  iniciado_por uuid references public.profiles (id),
  finalizado_em timestamptz,
  finalizado_por uuid references public.profiles (id),
  -- Separação concluída (finalizado_em) já conta nas estatísticas; entregue_em
  -- só é preenchido quando o cliente retira de fato — usado para medir atraso
  -- de retirada em requisições urgentes.
  entregue_em timestamptz,
  entregue_por uuid references public.profiles (id),
  -- Nome de quem retirou fisicamente (pessoa do cliente, não usuário do sistema)
  -- informado pelo almoxarife no momento de marcar como entregue.
  retirado_por_nome text,
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
  encerrada_por_evento text check (encerrada_por_evento in ('pausa', 'finalizacao')),
  motivo_pausa text check (motivo_pausa in ('falta_estoque', 'empilhadeira', 'equipamento_quebrado'))
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

-- Também retorna true para contas com lider_geral=true: um líder de equipe
-- promovido dessa forma passa a ter, no banco, exatamente a mesma permissão
-- de um admin (cria/edita/exclui requisições e colaboradores). Continua sendo
-- por conta específica, não pelo papel 'lider' em geral.
create function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and (role = 'admin' or lider_geral = true)
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

-- pedidos: admin lê tudo; contas com lider_geral (ex: líder de equipe) também
-- leem tudo, independente de depósito; demais funcionários só leem requisições
-- do próprio depósito.
create policy pedidos_select_por_deposito
  on public.pedidos for select
  to authenticated
  using (
    public.is_admin()
    or coalesce((select lider_geral from public.profiles where id = auth.uid()), false)
    or deposito = (select deposito from public.profiles where id = auth.uid())
  );

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
-- estoque_itens: catálogo de itens de estoque (código + descrição), usado
-- pra conferência física em auditoria. Por enquanto sem integração com
-- pedidos (não desconta automaticamente) — só cadastro, consulta e PDF.
-- ============================================================

create table public.estoque_itens (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  descricao text not null,
  deposito text not null check (deposito in ('deposito_1', 'deposito_2', 'deposito_3')),
  -- Nullable: a carga inicial só tem código/descrição, quantidade é
  -- preenchida depois conforme a auditoria avança.
  quantidade integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (codigo, deposito)
);

create index estoque_itens_codigo_idx on public.estoque_itens (codigo);

create trigger estoque_itens_set_updated_at
  before update on public.estoque_itens
  for each row
  execute function public.set_updated_at();

alter table public.estoque_itens enable row level security;

-- Só quem administra (admin ou líder com lider_geral) mexe no estoque por
-- enquanto — não tem tela de estoque para funcionário ainda.
create policy estoque_itens_select_admin
  on public.estoque_itens for select
  to authenticated
  using (public.is_admin());

create policy estoque_itens_insert_admin
  on public.estoque_itens for insert
  to authenticated
  with check (public.is_admin());

create policy estoque_itens_update_admin
  on public.estoque_itens for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy estoque_itens_delete_admin
  on public.estoque_itens for delete
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
--    nome_completo, role ('admin', 'funcionario' ou 'lider') e, se for funcionário,
--    o deposito ('deposito_1'/'deposito_2'/'deposito_3') — ele só vê as requisições
--    do próprio depósito. Admin e líder não precisam de depósito (fica null).
-- 3. Para dar a uma conta específica visão de todos os depósitos sem ser admin
--    (ex: um líder de equipe), rode:
--      update public.profiles set lider_geral = true where email = '...';
--    Para tirar uma conta da listagem de gestão (ex: usuário master):
--      update public.profiles set oculto = true where email = '...';
-- ============================================================
