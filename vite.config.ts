import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' gera caminhos relativos no build, funcionando tanto em
// usuario.github.io/NOME_DO_REPO/ quanto em domínio próprio, sem precisar
// fixar o nome do repositório aqui.
export default defineConfig({
  base: './',
  plugins: [react()],
})
