import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  erro: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro não tratado na interface:', erro, info.componentStack)
  }

  render() {
    if (this.state.erro) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center">
            <h1 className="mb-2 text-lg font-semibold text-card-foreground">Algo deu errado</h1>
            <p className="mb-4 text-sm text-muted-foreground">
              Ocorreu um erro inesperado nesta tela. Tente recarregar a página.
            </p>
            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
