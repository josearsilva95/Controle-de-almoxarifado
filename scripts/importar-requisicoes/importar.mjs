import fs from 'fs'
import path from 'path'
import { PDFParse } from 'pdf-parse'
import { extrairRequisicao, consolidarPorDeposito } from './lib.mjs'

const NOME_PASTA_PROCESSADAS = 'Processadas'

// Lê e extrai o texto de um PDF do disco.
async function lerTextoPdf(caminho) {
  const buffer = fs.readFileSync(caminho)
  const parser = new PDFParse({ data: buffer })
  const resultado = await parser.getText()
  return resultado.text
}

// Cria (se ainda não existir) uma requisição por depósito presente no PDF.
// Idempotente: se já existe uma requisição com o mesmo numero_pv+depósito,
// não duplica (funciona mesmo se o arquivo acabar sendo processado 2x).
async function importarArquivo({ supabase, profileId, caminho, log }) {
  const texto = await lerTextoPdf(caminho)
  const requisicao = extrairRequisicao(texto)

  if (!requisicao) {
    return { reconhecida: false, criadas: [] }
  }

  const grupos = consolidarPorDeposito(requisicao.linhas)
  const criadas = []

  for (const [deposito, itensMap] of grupos) {
    const itens = [...itensMap.values()]

    const { data: existente, error: erroBusca } = await supabase
      .from('pedidos')
      .select('id')
      .eq('numero_pv', requisicao.numeroPv)
      .eq('deposito', deposito)
      .maybeSingle()

    if (erroBusca) throw new Error(`Falha ao verificar duplicidade (PV ${requisicao.numeroPv}, ${deposito}): ${erroBusca.message}`)
    if (existente) {
      log(`  PV ${requisicao.numeroPv} (${deposito}) já importada antes, pulando.`)
      continue
    }

    const { error: erroInsercao } = await supabase.from('pedidos').insert({
      numero_pv: requisicao.numeroPv,
      cliente: '',
      quantidade_itens: itens.length,
      itens,
      urgencia: 'nao_urgente',
      deposito,
      criado_por: profileId,
    })

    if (erroInsercao) throw new Error(`Falha ao criar requisição (PV ${requisicao.numeroPv}, ${deposito}): ${erroInsercao.message}`)

    log(`  PV ${requisicao.numeroPv} (${deposito}): ${itens.length} item(ns) — requisição criada.`)
    criadas.push({ numeroPv: requisicao.numeroPv, deposito, itens: itens.length })
  }

  return { reconhecida: true, criadas }
}

// Varre a pasta de requisições e processa qualquer PDF que ainda esteja lá
// (a pasta "Processadas" é onde os PDFs já lidos vão parar, então servem de
// marca de "já processado" visível pra qualquer um que olhe a pasta — não
// depende de nenhum estado guardado só neste PC).
export async function processarPasta({ supabase, profileId, pasta, log = console.log }) {
  const pastaProcessadas = path.join(pasta, NOME_PASTA_PROCESSADAS)
  fs.mkdirSync(pastaProcessadas, { recursive: true })

  const arquivos = fs
    .readdirSync(pasta, { withFileTypes: true })
    .filter((entrada) => entrada.isFile() && entrada.name.toLowerCase().endsWith('.pdf'))
    .map((entrada) => entrada.name)

  const novasRequisicoes = []
  const erros = []

  for (const nome of arquivos) {
    const caminho = path.join(pasta, nome)
    log(`Novo arquivo: ${nome}`)

    try {
      const { reconhecida, criadas } = await importarArquivo({ supabase, profileId, caminho, log })

      if (!reconhecida) {
        log('  não parece ser uma requisição de materiais — deixado na pasta pra você conferir.')
        continue
      }

      fs.renameSync(caminho, path.join(pastaProcessadas, nome))
      novasRequisicoes.push(...criadas)
    } catch (err) {
      log(`  erro ao processar ${nome}: ${err.message} — vai tentar de novo no próximo ciclo.`)
      erros.push({ nome, mensagem: err.message })
    }
  }

  return { novos: novasRequisicoes.length, requisicoes: novasRequisicoes, erros }
}
