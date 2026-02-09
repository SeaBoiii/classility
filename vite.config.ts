import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getBasePath(): string {
  const explicitBase = process.env.VITE_BASE_PATH
  if (explicitBase) {
    const withPrefix = explicitBase.startsWith('/') ? explicitBase : `/${explicitBase}`
    return withPrefix.endsWith('/') ? withPrefix : `${withPrefix}/`
  }

  const onGitHubActions = process.env.GITHUB_ACTIONS === 'true'
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  if (onGitHubActions && repoName) {
    if (repoName.endsWith('.github.io')) {
      return '/'
    }
    return `/${repoName}/`
  }

  return '/'
}

export default defineConfig({
  plugins: [react()],
  base: getBasePath(),
})
