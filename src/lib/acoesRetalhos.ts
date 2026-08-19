import { supabase } from './supabaseClient'
import type { FormaChapa } from './chapaMedicao'

interface ResultadoAcao {
  erro: string | null
}

export async function criarRetalho(retalho: {
  codigo: string
  materialSlug: string | null
  materialLabel: string | null
  espessuraMm: number | null
  shapeMode: FormaChapa
  dim1Mm: number | null
  dim2Mm: number | null
  areaMm2: number | null
  pesoKg: number | null
  usuarioId: string
}): Promise<ResultadoAcao> {
  const { error } = await supabase.from('retalhos').insert({
    codigo: retalho.codigo,
    material_slug: retalho.materialSlug,
    material_label: retalho.materialLabel,
    espessura_mm: retalho.espessuraMm,
    shape_mode: retalho.shapeMode,
    dim1_mm: retalho.dim1Mm,
    dim2_mm: retalho.dim2Mm,
    area_mm2: retalho.areaMm2,
    peso_kg: retalho.pesoKg,
    criado_por: retalho.usuarioId,
  })
  if (error) return { erro: error.message }
  return { erro: null }
}

export async function excluirRetalho(id: string): Promise<ResultadoAcao> {
  const { error } = await supabase.from('retalhos').delete().eq('id', id)
  if (error) return { erro: error.message }
  return { erro: null }
}
