export type Policy = {
  boundary: {
    fallback_delay_ms: number
    fallback_text: string
    file: string
    levels: string[]
    max_resets: number
  }
  detection: { fields: string[]; reporter: string }
  deviation: { file: string; max_days: number }
  error: {
    async_states: string[]
    catch_allowed_in: string[]
    file: string
    parser: string
    result_file: string
    throw_allowed_in: string[]
  }
  fault: { cases: string[]; suite: string }
  gates: string[]
  network: {
    backoff_base_ms: number
    client: string
    retry_budget_per_tab: number
    retry_max: number
    retry_methods: string[]
    tiers: string[]
    timeout_ms: number
  }
  routes: { default_mode: string; file: string; modes: string[] }
  version: number
}
