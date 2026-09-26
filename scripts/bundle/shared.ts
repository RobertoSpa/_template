import { POLICY_PATHS } from '../policies.ts'
import { join } from 'node:path'

export type Budget = { css: number; js: number; loaded: number; total: number }
export type Count = { raw: number; wire: number }
export type FileGroup = {
  allowed_other?: string[]
  compress: boolean
  extensions: string[]
  max_raw: number
  max_wire: number
}
export type Policy = {
  build: {
    env: Record<string, string>
    inline_max_bytes: number
    sourcemap: string
    target: string
  }
  ceiling: Budget
  deviation: { file: string; max_days: number }
  files: Record<string, FileGroup>
  gates: string[]
  growth: { branch_max_bytes: number; review_percent: number }
  measure: {
    brotli_quality: number
    sizes_file: string
    skip_dir: string
    skip_extensions: string[]
  }
  packages: { denied: string[] }
  routes: Route[]
  shake: { side_effects: string[]; test_patterns: string[] }
  stage: {
    lock_from: string
    margin: Record<string, number>
    order: string[]
    slack_bytes: number
  }
  version: number
}
export type Route = {
  budget: Budget
  owner: string
  page?: string
  path: string
  stage: string
}
export type Sizes = {
  files: Record<string, Count>
  packages: Record<string, number>
  routes: Record<string, Budget>
  total: Count
}

// Each budget kind. loaded counts each file that the route can load, lazy chunks too.
export const KINDS = ['js', 'css', 'total', 'loaded'] as const
export const RULES_PATH = 'docs/agents/bundle.md'

// The gates run from the repository root. Only the Vite config needs an absolute path.
export const ABSOLUTE_POLICY_PATH = join(
  import.meta.dirname,
  '../..',
  POLICY_PATHS.bundle,
)
