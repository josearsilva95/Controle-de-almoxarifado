// Edge Function: criar-usuario
// Cria um usuário no Supabase Auth + a linha correspondente em `profiles`.
// Só pode ser chamada por um usuário autenticado com role = 'admin'.
// Usa a service_role key (disponível automaticamente como variável de ambiente
// dentro da Edge Function, nunca exposta ao navegador) para ter permissão de
// criar contas via Auth Admin API.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ erro: 'Não autenticado.' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Cliente autenticado como quem chamou, só para descobrir quem é e checar o papel.
    const clienteChamador = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await clienteChamador.auth.getUser()
    if (userError || !userData.user) {
      return jsonResponse({ erro: 'Sessão inválida.' }, 401)
    }

    const { data: perfilChamador, error: perfilError } = await clienteChamador
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (perfilError || perfilChamador?.role !== 'admin') {
      return jsonResponse({ erro: 'Apenas administradores podem criar colaboradores.' }, 403)
    }

    const body = await req.json()
    const email = String(body.email ?? '').trim().toLowerCase()
    const senha = String(body.senha ?? '')
    const nomeCompleto = String(body.nome_completo ?? '').trim()
    const role = body.role === 'admin' ? 'admin' : 'funcionario'

    if (!email || !senha || !nomeCompleto) {
      return jsonResponse({ erro: 'Preencha e-mail, senha e nome completo.' }, 400)
    }
    if (senha.length < 6) {
      return jsonResponse({ erro: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
    }

    // Cliente com a service_role key, com permissão total (ignora RLS) — só usado
    // a partir daqui, depois de já termos confirmado que quem chamou é admin.
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: novoUsuario, error: erroCriacao } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    })

    if (erroCriacao || !novoUsuario.user) {
      return jsonResponse({ erro: erroCriacao?.message ?? 'Não foi possível criar o usuário.' }, 400)
    }

    const baseUsername = email.split('@')[0].replace(/[^a-z0-9._-]/g, '')
    let username = baseUsername
    let tentativa = 0
    while (true) {
      const { data: existente } = await admin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (!existente) break
      tentativa += 1
      username = `${baseUsername}${tentativa}`
    }

    const { error: erroPerfil } = await admin.from('profiles').insert({
      id: novoUsuario.user.id,
      username,
      nome_completo: nomeCompleto,
      role,
    })

    if (erroPerfil) {
      // Evita usuário "órfão" no Auth sem profile correspondente.
      await admin.auth.admin.deleteUser(novoUsuario.user.id)
      return jsonResponse({ erro: `Não foi possível salvar o perfil: ${erroPerfil.message}` }, 400)
    }

    return jsonResponse({ ok: true, email, username }, 200)
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro)
    return jsonResponse({ erro: `Erro inesperado: ${mensagem}` }, 500)
  }
})
