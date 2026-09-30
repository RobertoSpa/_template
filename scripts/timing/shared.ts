export type Policy = {
  deviation: { file: string; max_days: number }
  gates: string[]
  lab: {
    interaction_threshold_ms: number
    report: string
    runs: number
    suite: string
  }
  limits: { inp_ms: number; lcp_ms: number }
  routes: { file: string }
  version: number
}
export type Report = { routes: Record<string, Sample[]> }
// control is the visible text of the control that the suite presses. Rule LAB-03.
export type RouteRecord = { control?: string; path: string }
// One load of one route. lcp_ms is null when the route painted no content.
export type Sample = { inp_ms: number; lcp_ms: null | number }

export const RULES_PATH = 'docs/agents/timing.md'
