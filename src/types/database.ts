export type Role = 'admin' | 'funcionario' | 'lider'

export type Urgencia = 'urgente' | 'medio' | 'nao_urgente'

export type Status = 'pendente' | 'em_andamento' | 'pausado' | 'finalizado'

export type Deposito = 'deposito_1' | 'deposito_2' | 'deposito_3'

export type MotivoPausa = 'falta_estoque' | 'empilhadeira' | 'equipamento_quebrado'

export type EquipeEstoque = 'equipe_1' | 'equipe_2' | 'equipe_3'

export interface Profile {
  id: string
  username: string
  nome_completo: string
  email: string | null
  role: Role
  deposito: Deposito | null
  oculto: boolean
  lider_geral: boolean
  equipe_estoque: EquipeEstoque | null
  created_at: string
}

export interface Pedido {
  id: string
  numero_pv: string
  cliente: string
  urgencia: Urgencia
  status: Status
  deposito: Deposito
  quantidade_itens: number
  motivo_pausa: MotivoPausa | null
  criado_por: string
  created_at: string
  iniciado_em: string | null
  iniciado_por: string | null
  finalizado_em: string | null
  finalizado_por: string | null
  entregue_em: string | null
  entregue_por: string | null
  retirado_por_nome: string | null
  funcionario_atual: string | null
  updated_at: string
}

export interface EstoqueItem {
  id: string
  codigo: string
  descricao: string
  deposito: Deposito
  categoria: string | null
  quantidade: number | null
  lotes: string | null
  created_at: string
  updated_at: string
}

export interface EstoqueContagem {
  id: string
  item_id: string
  equipe: EquipeEstoque
  // '' quando o item não tem lote múltiplo — ver src/lib/lotesItem.ts
  lote: string
  quantidade: number
  contado_por: string
  contado_em: string
}

export interface EstoqueEquipeStatus {
  equipe: EquipeEstoque
  finalizada_em: string | null
  finalizada_por: string | null
}

export interface PedidoSessao {
  id: string
  pedido_id: string
  usuario_id: string
  inicio: string
  fim: string | null
  duracao_segundos: number | null
  encerrada_por_evento: 'pausa' | 'finalizacao' | null
  motivo_pausa: MotivoPausa | null
}
