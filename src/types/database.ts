export type Role = 'admin' | 'funcionario'

export type Urgencia = 'urgente' | 'medio' | 'nao_urgente'

export type Status = 'pendente' | 'em_andamento' | 'pausado' | 'finalizado'

export type Deposito = 'deposito_1' | 'deposito_2' | 'deposito_3'

export type MotivoPausa = 'falta_estoque' | 'empilhadeira' | 'equipamento_quebrado'

export interface Profile {
  id: string
  username: string
  nome_completo: string
  email: string | null
  role: Role
  deposito: Deposito | null
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
  funcionario_atual: string | null
  updated_at: string
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
