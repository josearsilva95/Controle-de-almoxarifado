import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ClipboardCheck, Lock, Pause, Play } from 'lucide-react'
import { Botao } from './ui/Botao'
import { Cartao } from './ui/Cartao'
import { LocalAtivoBar } from './LocalAtivoBar'
import { definirCicloPausado, registrarContagemCiclica } from '../lib/acoesEstoque'
import { formatDataHora } from '../lib/tempo'
import type { EstoqueCiclo, EstoqueCicloItemComItem, EstoqueLocal } from '../types/database'

interface ContagemCiclicaProps {
  ciclo: EstoqueCiclo | null
  itens: EstoqueCicloItemComItem[]
  locais: EstoqueLocal[]
  usuarioId: string
  carregando: boolean
  pausado: boolean
  souAdmin: boolean
  onAtualizado: () => void
}

function LinhaItemCiclo({
  cicloItem,
  cicloId,
  localAtivo,
  usuarioId,
  onAtualizado,
}: {
  cicloItem: EstoqueCicloItemComItem
  cicloId: string
  localAtivo: string | null
  usuarioId: string
  onAtualizado: () => void
}) {
  const [quantidade, setQuantidade] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const contado = cicloItem.quantidade_contada != null

  async function confirmar(evento: FormEvent) {
    evento.preventDefault()
    if (!localAtivo) {
      setErro('Selecione um local (bipe a etiqueta da prateleira) antes de registrar.')
      return
    }
    const valor = Number(quantidade)
    if (!Number.isInteger(valor) || valor < 0) {
      setErro('Informe uma quantidade válida.')
      return
    }
    setSalvando(true)
    setErro(null)
    const { erro: erroAcao } = await registrarContagemCiclica(cicloItem.id, cicloId, valor, localAtivo, usuarioId)
    setSalvando(false)
    if (erroAcao) {
      setErro(erroAcao)
      return
    }
    onAtualizado()
  }

  return (
    <Cartao className="p-4">
      <p className="font-medium text-card-foreground">{cicloItem.item.codigo}</p>
      <p className="mb-3 text-sm text-muted-foreground">{cicloItem.item.descricao}</p>
      {contado ? (
        <div className="flex items-center gap-1.5 text-sm text-card-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-semibold">{cicloItem.quantidade_contada}</span>
          <span className="text-xs text-muted-foreground">
            {cicloItem.local && `· local ${cicloItem.local}`} · {formatDataHora(cicloItem.contado_em!)}
          </span>
        </div>
      ) : (
        <form onSubmit={confirmar} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-card-foreground">
            Quantidade
            <input
              className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              type="number"
              min={0}
              step={1}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </label>
          <Botao type="submit" tamanho="sm" disabled={salvando || !localAtivo}>
            <Check className="h-4 w-4" />
            {salvando ? 'Salvando...' : 'Confirmar'}
          </Botao>
          {!localAtivo && (
            <p className="mt-1 w-full text-xs text-amber-600">Selecione um local ativo (acima) pra poder confirmar.</p>
          )}
          {erro && <p className="mt-1 w-full text-xs text-destructive">{erro}</p>}
        </form>
      )}
    </Cartao>
  )
}

// Spot-check contínuo do estoque: 10 itens sorteados por dia (ver
// gerar_ciclo_hoje() no banco), separado do inventário geral em 3 equipes.
// Não mostra a quantidade do sistema durante a contagem, mesmo motivo do
// inventário — evita que quem conta só copie o número esperado.
export function ContagemCiclica({
  ciclo,
  itens,
  locais,
  usuarioId,
  carregando,
  pausado,
  souAdmin,
  onAtualizado,
}: ContagemCiclicaProps) {
  const [localAtivo, setLocalAtivo] = useState<string | null>(null)
  const [alternando, setAlternando] = useState(false)

  async function alternarPausa() {
    setAlternando(true)
    const { erro } = await definirCicloPausado(!pausado)
    setAlternando(false)
    if (erro) {
      window.alert(`Não foi possível ${pausado ? 'retomar' : 'pausar'}: ${erro}`)
      return
    }
    onAtualizado()
  }

  const botaoPausa = souAdmin && (
    <Botao variante="secundaria" tamanho="sm" onClick={alternarPausa} disabled={alternando}>
      {pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
      {pausado ? 'Retomar contagem cíclica' : 'Pausar contagem cíclica'}
    </Botao>
  )

  if (carregando) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando contagem de hoje...</p>
  }

  if (pausado) {
    return (
      <div className="py-8 text-center">
        <p className="mb-3 text-sm text-muted-foreground">
          Contagem cíclica pausada — nenhum ciclo novo está sendo gerado.
        </p>
        {botaoPausa}
      </div>
    )
  }

  if (!ciclo || itens.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Gerando a contagem cíclica de hoje...</p>
  }

  const contados = itens.filter((i) => i.quantidade_contada != null).length

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
        <span className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          Contagem cíclica de hoje ({new Date(ciclo.data_referencia).toLocaleDateString('pt-BR')}) — {contados} de{' '}
          {itens.length} itens conferidos.
          {ciclo.finalizado_em && ' Concluída.'}
        </span>
        {botaoPausa}
      </div>

      <LocalAtivoBar locais={locais} localAtivo={localAtivo} onMudarLocal={setLocalAtivo} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((cicloItem) => (
          <LinhaItemCiclo
            key={cicloItem.id}
            cicloItem={cicloItem}
            cicloId={ciclo.id}
            localAtivo={localAtivo}
            usuarioId={usuarioId}
            onAtualizado={onAtualizado}
          />
        ))}
      </div>
    </div>
  )
}
