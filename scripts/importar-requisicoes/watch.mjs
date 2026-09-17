import { criarSupabase, autenticarAdmin } from './autenticar.mjs'
import { processarPasta } from './importar.mjs'

const intervaloMs = Number(process.env.INTERVALO_MINUTOS || 5) * 60 * 1000

function agora() {
  return new Date().toLocaleString('pt-BR')
}

const supabase = criarSupabase()
const profileId = await autenticarAdmin(supabase)
console.log(`[${agora()}] Autenticado. Vigiando: ${process.env.PASTA_REQUISICOES} (a cada ${process.env.INTERVALO_MINUTOS || 5} min)`)

async function ciclo() {
  try {
    const resultado = await processarPasta({
      supabase,
      profileId,
      pasta: process.env.PASTA_REQUISICOES,
    })
    if (resultado.novos > 0) {
      console.log(`[${agora()}] ${resultado.novos} requisição(ões) nova(s) importada(s).`)
    }
  } catch (err) {
    console.error(`[${agora()}] Erro ao verificar a pasta:`, err.message)
  }
}

await ciclo()
setInterval(ciclo, intervaloMs)
