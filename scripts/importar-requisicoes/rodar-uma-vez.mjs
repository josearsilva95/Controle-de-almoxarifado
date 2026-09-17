import { criarSupabase, autenticarAdmin } from './autenticar.mjs'
import { processarPasta } from './importar.mjs'

const supabase = criarSupabase()
const profileId = await autenticarAdmin(supabase)
console.log(`Autenticado. Verificando pasta: ${process.env.PASTA_REQUISICOES}`)

const resultado = await processarPasta({
  supabase,
  profileId,
  pasta: process.env.PASTA_REQUISICOES,
})

if (resultado.novos > 0) {
  console.log(`\n${resultado.novos} requisição(ões) nova(s) importada(s).`)
} else {
  console.log('\nNenhuma requisição nova.')
}
if (resultado.erros.length > 0) {
  console.log(`${resultado.erros.length} arquivo(s) com erro — serão tentados novamente na próxima execução.`)
}
