// Edge Function: rapid-worker (cria e edita colaboradores)
// Cria/edita um usuário no Supabase Auth + a linha correspondente em `profiles`.
// Só pode ser chamada por um usuário autenticado com role = 'admin'.
// Usa a service_role key (via env var automática ou secret manual SERVICE_ROLE_KEY,
// nunca exposta ao navegador) para ter permissão de mexer no Auth Admin API.

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEPOSITOS = ['deposito_1', 'deposito_2', 'deposito_3']

/**
 * Extrai uma mensagem de erro utilizável, com fallback — alguns erros do SDK do
 * Supabase chegam com `.message` vazio ou "{}" (JSON.stringify de um objeto sem
 * campos úteis), o que sem essa checagem acabava aparecendo cru na tela do usuário.
 */
function mensagemDeErro(erro: unknown, fallback: string): string {
  if (erro && typeof erro === 'object' && 'message' in erro) {
    const msg = (erro as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim() && msg.trim() !== '{}') return msg
  }
  return fallback
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
    // Em alguns ambientes a variável automática SUPABASE_SERVICE_ROLE_KEY não fica
    // disponível para funções publicadas pelo editor do painel — SERVICE_ROLE_KEY é
    // um secret manual de fallback (Edge Functions → Secrets) com o mesmo valor.
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || ''

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
    const userId = typeof body.userId === 'string' && body.userId ? body.userId : null
    const email = String(body.email ?? '').trim().toLowerCase()
    const senha = String(body.senha ?? '')
    const nomeCompleto = String(body.nome_completo ?? '').trim()
    const role = body.role === 'admin' ? 'admin' : 'funcionario'
    // Admin não precisa de depósito; funcionário precisa de um dos valores válidos.
    const deposito = role === 'admin' ? null : String(body.deposito ?? '')

    if (!email || !nomeCompleto) {
      return jsonResponse({ erro: 'Preencha e-mail e nome completo.' }, 400)
    }
    if (!EMAIL_REGEX.test(email)) {
      return jsonResponse({ erro: 'E-mail inválido. Use o formato nome@dominio.com.' }, 400)
    }
    if (!userId && !senha) {
      return jsonResponse({ erro: 'Preencha a senha.' }, 400)
    }
    if (senha && senha.length < 6) {
      return jsonResponse({ erro: 'A senha precisa ter pelo menos 6 caracteres.' }, 400)
    }
    if (role === 'funcionario' && !DEPOSITOS.includes(deposito ?? '')) {
      return jsonResponse({ erro: 'Selecione um depósito para o funcionário.' }, 400)
    }

    if (!serviceRoleKey) {
      return jsonResponse(
        {
          erro:
            'Configuração incompleta no servidor: falta a chave de serviço. Adicione o secret SERVICE_ROLE_KEY em Edge Functions → Secrets.',
        },
        500
      )
    }

    // Cliente com a service_role key, com permissão total (ignora RLS) — só usado
    // a partir daqui, depois de já termos confirmado que quem chamou é admin.
    const admin = createClient(supabaseUrl, serviceRoleKey)

    if (userId) {
      // ============================================================
      // EDITAR colaborador existente
      // ============================================================
      const corpoAtualizacao: Record<string, unknown> = { email, email_confirm: true }
      if (senha) corpoAtualizacao.password = senha

      const respostaEdicao = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(corpoAtualizacao),
      })
      const corpoRespostaEdicao = await respostaEdicao.json().catch(() => null)

      if (!respostaEdicao.ok) {
        console.error('Erro ao editar usuário no Auth:', respostaEdicao.status, JSON.stringify(corpoRespostaEdicao))
        const mensagemApi =
          corpoRespostaEdicao?.msg ||
          corpoRespostaEdicao?.message ||
          corpoRespostaEdicao?.error_description ||
          corpoRespostaEdicao?.error
        return jsonResponse(
          { erro: mensagemApi || `Não foi possível editar o usuário (status ${respostaEdicao.status}).` },
          400
        )
      }

      const { error: erroPerfil } = await admin
        .from('profiles')
        .update({ nome_completo: nomeCompleto, email, role, deposito })
        .eq('id', userId)

      if (erroPerfil) {
        console.error('Erro ao atualizar profile:', JSON.stringify(erroPerfil))
        return jsonResponse(
          {
            erro: `Usuário atualizado, mas não foi possível salvar o perfil: ${mensagemDeErro(erroPerfil, 'erro desconhecido')}`,
          },
          400
        )
      }

      return jsonResponse({ ok: true, email }, 200)
    }

    // ============================================================
    // CRIAR novo colaborador
    // ============================================================

    // Chama a API de Auth diretamente (em vez de admin.auth.admin.createUser) porque
    // o SDK descarta o corpo da resposta para qualquer status 5xx e mostra só uma
    // mensagem genérica vazia — isso escondia o motivo real da rejeição.
    const respostaCriacao = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ email, password: senha, email_confirm: true }),
    })

    const corpoCriacao = await respostaCriacao.json().catch(() => null)

    if (!respostaCriacao.ok || !corpoCriacao?.id) {
      console.error(
        'Erro ao criar usuário no Auth (raw fetch):',
        respostaCriacao.status,
        JSON.stringify(corpoCriacao)
      )
      const mensagemApi =
        corpoCriacao?.msg || corpoCriacao?.message || corpoCriacao?.error_description || corpoCriacao?.error
      return jsonResponse(
        { erro: mensagemApi || `Não foi possível criar o usuário (status ${respostaCriacao.status}).` },
        400
      )
    }

    const novoUsuario = { user: { id: corpoCriacao.id as string } }

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
      email,
      role,
      deposito,
    })

    if (erroPerfil) {
      // Evita usuário "órfão" no Auth sem profile correspondente.
      console.error('Erro ao salvar profile:', JSON.stringify(erroPerfil))
      await admin.auth.admin.deleteUser(novoUsuario.user.id)
      return jsonResponse(
        { erro: `Não foi possível salvar o perfil: ${mensagemDeErro(erroPerfil, 'erro desconhecido')}` },
        400
      )
    }

    return jsonResponse({ ok: true, email, username }, 200)
  } catch (erro) {
    console.error('Erro inesperado na função:', erro)
    const mensagem = mensagemDeErro(erro, String(erro))
    return jsonResponse({ erro: `Erro inesperado: ${mensagem}` }, 500)
  }
})
