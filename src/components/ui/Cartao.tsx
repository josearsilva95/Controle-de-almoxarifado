import type { HTMLAttributes } from 'react'

export function Cartao({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`} {...props} />
  )
}
