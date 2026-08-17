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
  -- Equipe do inventário de estoque (nula = não participa). equipe_1/equipe_2
  -- contam de forma independente; equipe_3 resolve as divergências entre elas.
  equipe_estoque text check (equipe_estoque in ('equipe_1', 'equipe_2', 'equipe_3')),
  -- Recebe o alerta flutuante quando a contagem cíclica diária do estoque é
  -- concluída, com o botão pra baixar o PDF do resultado (ver estoque_ciclos).
  recebe_alerta_ciclo boolean not null default false,
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
-- "iniciado por fulano" etc.). Criar/editar credenciais continua só pela Edge
-- Function rapid-worker (service_role) — esse update aqui é só pra campos de
-- dado simples que o admin ajusta direto pela UI, como a equipe do estoque.
create policy profiles_select_autenticados
  on public.profiles for select
  to authenticated
  using (true);

create policy profiles_update_admin
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
-- estoque_itens: catálogo de itens de estoque, carregado a partir do
-- relatório oficial "Situação Estoque" — quantidade já é a quantidade real
-- do sistema (soma por código quando há mais de um lote/rastreabilidade).
-- Serve de base pro inventário: cada equipe conta por fora e compara.
-- ============================================================

create table public.estoque_itens (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  descricao text not null,
  deposito text not null check (deposito in ('deposito_1', 'deposito_2', 'deposito_3')),
  -- Livre (não é enum fixo) — vem da "Família" do sistema de origem, usada
  -- pra agrupar em abas na tela em vez de só buscar em uma lista enorme.
  categoria text,
  -- Quantidade oficial do sistema (importada) — não é sobrescrita pelas
  -- contagens do inventário, que ficam à parte em estoque_contagens.
  quantidade integer,
  -- Lote(s)/rastreabilidade do sistema de origem, só informativo — texto
  -- livre, vários lotes separados por vírgula quando o item tem mais de um
  -- (a quantidade já vem somada entre eles, não conta por lote separado).
  lotes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (codigo, deposito)
);

create index estoque_itens_codigo_idx on public.estoque_itens (codigo);
create index estoque_itens_categoria_idx on public.estoque_itens (categoria);

create trigger estoque_itens_set_updated_at
  before update on public.estoque_itens
  for each row
  execute function public.set_updated_at();

alter table public.estoque_itens enable row level security;

-- Leitura: quem administra, ou quem está numa equipe de inventário (precisa
-- buscar itens pra contar, mas não gerencia o catálogo). Escrita continua
-- só admin.
create policy estoque_itens_select_admin_ou_equipe
  on public.estoque_itens for select
  to authenticated
  using (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  );

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
-- estoque_locais: catálogo de endereços físicos do almoxarifado (ex: "01a"
-- = unidade 1, nível 1, lado esquerdo). Cadastrado pelo admin; a etiqueta
-- colada na prateleira usa esse mesmo código como valor do código de
-- barras — quem conta bipa a etiqueta pra marcar o "local ativo".
-- ============================================================

create table public.estoque_locais (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  rotulo text,
  created_at timestamptz not null default now()
);

alter table public.estoque_locais enable row level security;

create policy estoque_locais_select_admin_ou_equipe
  on public.estoque_locais for select
  to authenticated
  using (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  );

create policy estoque_locais_insert_admin
  on public.estoque_locais for insert
  to authenticated
  with check (public.is_admin());

create policy estoque_locais_update_admin
  on public.estoque_locais for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy estoque_locais_delete_admin
  on public.estoque_locais for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- estoque_contagens: contagem física do inventário, uma linha por
-- (item, equipe, lote) — equipe_1 e equipe_2 contam de forma independente;
-- equipe_3 grava a contagem final nos lotes em que elas divergem. Contar
-- de novo pela mesma equipe/lote atualiza a própria linha em vez de duplicar.
-- ============================================================

create table public.estoque_contagens (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.estoque_itens (id) on delete cascade,
  equipe text not null check (equipe in ('equipe_1', 'equipe_2', 'equipe_3')),
  -- '' quando o item não tem lote cadastrado ou só tem um (sem ambiguidade
  -- pra escolher) — só vira um valor de fato quando o item tem 2+ lotes e
  -- quem contou escolheu qual estava contando (ver src/lib/lotesItem.ts).
  lote text not null default '',
  -- Código de estoque_locais informado no momento da contagem (onde a
  -- equipe encontrou fisicamente esse item/lote) — opcional no banco, mas
  -- a UI exige antes de deixar registrar, pra garantir o mapeamento.
  local text,
  quantidade integer not null,
  contado_por uuid not null references public.profiles (id),
  contado_em timestamptz not null default now(),
  unique (item_id, equipe, lote)
);

create index estoque_contagens_item_id_idx on public.estoque_contagens (item_id);

alter table public.estoque_contagens enable row level security;

-- Leitura: admin vê tudo; equipe_3 vê tudo (precisa comparar equipe_1 x
-- equipe_2 pra achar as divergências); equipe_1 e equipe_2 só veem a
-- própria contagem — contagem cega de verdade, uma não influencia a outra.
create policy estoque_contagens_select_visao_por_equipe
  on public.estoque_contagens for select
  to authenticated
  using (
    public.is_admin()
    or equipe = (select equipe_estoque from public.profiles where id = auth.uid())
    or (select equipe_estoque from public.profiles where id = auth.uid()) = 'equipe_3'
  );

-- Só grava contagem em nome de si mesmo e da própria equipe (admin pode
-- gravar por qualquer equipe, útil pra correções).
create policy estoque_contagens_insert_propria_equipe
  on public.estoque_contagens for insert
  to authenticated
  with check (
    contado_por = auth.uid()
    and (
      public.is_admin()
      or equipe = (select equipe_estoque from public.profiles where id = auth.uid())
    )
  );

-- Depois de enviada, uma contagem só é editável por admin — nem quem
-- registrou pode alterar depois (evita "corrigir" o número depois de ver
-- outra contagem). Divergência de verdade se resolve pela equipe_3, não
-- editando o valor original.
create policy estoque_contagens_update_admin
  on public.estoque_contagens for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Só admin apaga contagens — usado pelo "Reiniciar inventário" (zera os
-- lançamentos de todas as equipes pra começar uma auditoria nova).
create policy estoque_contagens_delete_admin
  on public.estoque_contagens for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- estoque_equipes_status: marca quando uma equipe finaliza a contagem dela.
-- Usado só pra decidir quando mostrar o relatório de itens que uma equipe
-- não chegou a contar (a comparação de divergência de valor já aparece em
-- tempo real sem depender disso — ver estoque_contagens).
-- ============================================================

create table public.estoque_equipes_status (
  equipe text primary key check (equipe in ('equipe_1', 'equipe_2', 'equipe_3')),
  finalizada_em timestamptz,
  finalizada_por uuid references public.profiles (id)
);

alter table public.estoque_equipes_status enable row level security;

create policy estoque_equipes_status_select_admin_ou_equipe
  on public.estoque_equipes_status for select
  to authenticated
  using (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  );

-- Só marca a própria equipe como finalizada (admin pode qualquer uma).
create policy estoque_equipes_status_upsert_propria_equipe
  on public.estoque_equipes_status for insert
  to authenticated
  with check (
    public.is_admin()
    or equipe = (select equipe_estoque from public.profiles where id = auth.uid())
  );

create policy estoque_equipes_status_update_propria_equipe
  on public.estoque_equipes_status for update
  to authenticated
  using (
    public.is_admin()
    or equipe = (select equipe_estoque from public.profiles where id = auth.uid())
  )
  with check (
    public.is_admin()
    or equipe = (select equipe_estoque from public.profiles where id = auth.uid())
  );

-- "Reabrir contagem" apaga a linha de status — só admin pode, pra evitar
-- que um funcionário desfaça o "finalizar" da própria equipe sem querer.
create policy estoque_equipes_status_delete_admin
  on public.estoque_equipes_status for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- estoque_ciclos / estoque_ciclos_itens: contagem cíclica diária — todo dia
-- que alguém com acesso ao Estoque abrir o app, o sistema sorteia 10 itens
-- pra conferência rápida (separado do inventário geral em 3 equipes).
-- data_referencia garante um ciclo por dia mesmo com duas pessoas abrindo
-- ao mesmo tempo (ver gerar_ciclo_hoje() abaixo).
-- ============================================================

create table public.estoque_ciclos (
  id uuid primary key default gen_random_uuid(),
  data_referencia date not null unique,
  gerado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  visto_por uuid references public.profiles (id),
  visto_em timestamptz
);

create table public.estoque_ciclos_itens (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references public.estoque_ciclos (id) on delete cascade,
  item_id uuid not null references public.estoque_itens (id) on delete cascade,
  quantidade_contada integer,
  local text,
  contado_por uuid references public.profiles (id),
  contado_em timestamptz,
  unique (ciclo_id, item_id)
);

alter table public.estoque_ciclos enable row level security;
alter table public.estoque_ciclos_itens enable row level security;

create policy estoque_ciclos_select_admin_ou_equipe
  on public.estoque_ciclos for select
  to authenticated
  using (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  );

create policy estoque_ciclos_update_admin_ou_equipe
  on public.estoque_ciclos for update
  to authenticated
  using (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  )
  with check (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  );

create policy estoque_ciclos_itens_select_admin_ou_equipe
  on public.estoque_ciclos_itens for select
  to authenticated
  using (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  );

create policy estoque_ciclos_itens_update_admin_ou_equipe
  on public.estoque_ciclos_itens for update
  to authenticated
  using (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  )
  with check (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  );

-- Sorteia os 10 itens do dia, priorizando quem nunca foi conferido ou foi
-- conferido há mais tempo (não é 100% aleatório de propósito — puro random
-- deixaria alguns itens sem nunca serem checados enquanto outros repetem
-- por sorte). security definer porque insere em duas tabelas sem RLS de
-- insert pro cliente (só admin/quem tem equipe_estoque pode chamar).
create function public.gerar_ciclo_hoje()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ciclo_existente uuid;
  novo_ciclo_id uuid;
begin
  if not (
    public.is_admin()
    or coalesce((select equipe_estoque from public.profiles where id = auth.uid()), '') <> ''
  ) then
    raise exception 'Apenas quem tem acesso ao Estoque pode gerar o ciclo do dia.';
  end if;

  select id into ciclo_existente from public.estoque_ciclos where data_referencia = current_date;
  if ciclo_existente is not null then
    return ciclo_existente;
  end if;

  insert into public.estoque_ciclos (data_referencia)
  values (current_date)
  on conflict (data_referencia) do nothing
  returning id into novo_ciclo_id;

  -- Outra sessão criou ao mesmo tempo (race) — usa o ciclo dela.
  if novo_ciclo_id is null then
    select id into novo_ciclo_id from public.estoque_ciclos where data_referencia = current_date;
    return novo_ciclo_id;
  end if;

  insert into public.estoque_ciclos_itens (ciclo_id, item_id)
  select novo_ciclo_id, ei.id
  from public.estoque_itens ei
  order by (
    select max(eci.contado_em)
    from public.estoque_ciclos_itens eci
    where eci.item_id = ei.id
  ) asc nulls first, random()
  limit 10;

  return novo_ciclo_id;
end;
$$;

grant execute on function public.gerar_ciclo_hoje() to authenticated;

-- ============================================================
-- Realtime — habilita replicação para as tabelas usadas nos hooks
-- ============================================================

alter publication supabase_realtime add table public.pedidos;
alter publication supabase_realtime add table public.pedido_sessoes;
alter publication supabase_realtime add table public.estoque_contagens;
alter publication supabase_realtime add table public.estoque_equipes_status;
alter publication supabase_realtime add table public.estoque_locais;
alter publication supabase_realtime add table public.estoque_ciclos;
alter publication supabase_realtime add table public.estoque_ciclos_itens;

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
