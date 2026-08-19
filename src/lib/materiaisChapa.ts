export interface MaterialChapa {
  slug: string
  label: string
  densidade: number // g/cm³
}

export const MATERIAIS_CHAPA: MaterialChapa[] = [
  { slug: 'A36', label: 'Aço Carbono (A36 / SAE 1020)', densidade: 7.85 },
  { slug: 'Inox304', label: 'Aço Inox 304 / 316', densidade: 8.0 },
  { slug: 'Aluminio', label: 'Alumínio', densidade: 2.7 },
  { slug: 'Cobre', label: 'Cobre', densidade: 8.96 },
  { slug: 'Latao', label: 'Latão', densidade: 8.5 },
  { slug: 'Chumbo', label: 'Chumbo', densidade: 11.34 },
  { slug: 'Titanio', label: 'Titânio', densidade: 4.51 },
]
