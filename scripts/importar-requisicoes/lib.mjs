// Extração e regras de negócio da importação automática de requisições.
// Testado contra o texto real extraído (via pdf-parse) do relatório
// "Requisição Materiais - O.P. - Itens Comprados" do ERP Sapiens.

// Regra combinada com o Zé (dono do almoxarifado): a classificação usa a
// DESCRIÇÃO do material, não o código de "Depósito Reserva" do ERP — esse
// código (ex: "03 - SIDERURGICOS") mistura chapas e perfis/barras, que no
// almoxarifado físico ficam em depósitos diferentes (Planos vs Não Planos).
const REGRAS_DEPOSITO = [
  { deposito: 'deposito_2', regex: /\bCHAPAS?\b/i },
  {
    deposito: 'deposito_3',
    regex: /\b(VIGAS?|CANTONEIRAS?|PERFIL(?:ADOS?)?|TUBOS?|TARUGOS?|BARRA REDONDA|BARRA CHATA)\b/i,
  },
]

export function classificarDeposito(descricao) {
  for (const regra of REGRAS_DEPOSITO) {
    if (regra.regex.test(descricao)) return regra.deposito
  }
  return 'deposito_1'
}

function paraNumero(brStr) {
  return Number(brStr.replace(/\./g, '').replace(',', '.'))
}

// Divide o texto bruto do PDF em blocos, um por linha de material — cada
// bloco tem a mesma estrutura fixa gerada pelo relatório (Origem/O.P.,
// Código+Qtde+U.M., Depósito Reserva, Enviado pelo Cliente etc.).
function dividirBlocos(texto) {
  const limpo = texto.replace(/--\s*\d+ of \d+\s*--/g, '\n')
  return limpo
    .split(/(?=^[ \t]*\d+[ \t]+\d{2,3}\.\d{3}[ \t]*$)/m)
    .filter((bloco) => /Requisição Materiais/i.test(bloco) && /Pedido\s+[\d.]+/.test(bloco))
}

// Extrai {numeroPv, linhas[]} de um PDF de requisição já convertido em texto.
// Retorna null se o PDF não parecer ser desse tipo de documento (ex: plano
// de corte / oxicorte, que usa outro layout e não deve gerar requisição).
export function extrairRequisicao(texto) {
  const blocos = dividirBlocos(texto)
  if (blocos.length === 0) return null

  let numeroPv = null
  const linhas = []

  for (const bloco of blocos) {
    const mPedido = bloco.match(/Pedido\s+([\d.]+)/)
    if (mPedido) numeroPv = mPedido[1].replace(/\./g, '')

    const mItem = bloco.match(/^[ \t]*(\d{5,})[ \t]+([\d.,]+)[ \t]+([A-ZÇÃÕ]{1,4})[ \t]*$/m)
    const mDescricao = bloco.match(/Código[ \t]*\n(.+?)\t-[ \t]*\n/)
    const mEnviadoCliente = bloco.match(/Enviado pelo Cliente:[^\n]*?(SIM|NÃO)/)

    if (!mItem || !mDescricao) continue

    // Material que o próprio cliente fornece — o almoxarifado não separa,
    // então não entra na lista de itens a buscar.
    const enviadoPeloCliente = mEnviadoCliente?.[1] === 'SIM'
    if (enviadoPeloCliente) continue

    linhas.push({
      codigo: mItem[1],
      quantidade: paraNumero(mItem[2]),
      unidade: mItem[3],
      descricao: mDescricao[1].trim(),
    })
  }

  if (!numeroPv || linhas.length === 0) return null
  return { numeroPv, linhas }
}

// Agrupa as linhas por depósito e consolida por código de material (soma
// as quantidades repetidas — o que interessa pra quem separa é o total por
// material, não o produto final de cada peça).
export function consolidarPorDeposito(linhas) {
  const grupos = new Map()

  for (const linha of linhas) {
    const deposito = classificarDeposito(linha.descricao)
    if (!grupos.has(deposito)) grupos.set(deposito, new Map())
    const itens = grupos.get(deposito)

    const existente = itens.get(linha.codigo)
    if (existente) {
      existente.quantidade = Math.round((existente.quantidade + linha.quantidade) * 1e5) / 1e5
    } else {
      itens.set(linha.codigo, {
        codigo: linha.codigo,
        descricao: linha.descricao,
        quantidade: Math.round(linha.quantidade * 1e5) / 1e5,
        unidade: linha.unidade,
      })
    }
  }

  return grupos
}
