import assert from 'node:assert'

export type RouteRecord = {
  core?: string
  dependencies?: string[]
  page?: string
  path?: string
  refresh?: string
  safe_mode?: string
}

type Known = { modes: string[]; modules: string[]; pages: string[] }

const RECORDS_MAX = 1_000
const NORMAL = 'normal'

const oneRecordProblems = (
  record: RouteRecord,
  index: number,
  known: Known,
): string[] => {
  assert(index >= 0)
  assert(known.modes.includes(NORMAL))

  const { modes, modules, pages } = known

  const {
    core = '',
    dependencies = [],
    page = '',
    path = '',
    safe_mode: mode = '',
  } = record
  const problems: string[] = []

  if (!pages.includes(page)) {
    problems.push(
      `record ${index} names the page ${page}, and src/pages/ has no such folder. Rule SAFE-01.`,
    )
  }

  if (!path.startsWith('/')) {
    problems.push(
      `record ${index} has the path ${path}, and a path starts with /. Rule SAFE-01.`,
    )
  }

  if (core.length === 0) {
    problems.push(`record ${index} has no core function. Rule SAFE-01.`)
  }

  if (mode === NORMAL) {
    problems.push(
      `record ${index} has the safe mode ${mode}, and the safe mode is not ${NORMAL}. Rule SAFE-02.`,
    )
  } else if (!modes.includes(mode)) {
    problems.push(
      `record ${index} has the safe mode ${mode}, and routes.modes has no such mode. Rule SAFE-02.`,
    )
  }

  for (const dependency of dependencies.filter(
    (one) => !modules.includes(one),
  )) {
    problems.push(
      `record ${index} names the dependency ${dependency}, and src/shared/infrastructure/ has no such module. Rule SAFE-01.`,
    )
  }

  return problems
}

export const recordProblems = (
  records: RouteRecord[],
  pages: string[],
  modes: string[],
  modules: string[],
): string[] => {
  assert(records.length <= RECORDS_MAX)
  assert(modes.length > 0)

  const problems: string[] = []
  const seen = new Set<string>()

  for (const [index, record] of records.entries()) {
    problems.push(
      ...oneRecordProblems(record, index, { modes, modules, pages }),
    )

    const page = record.page ?? ''

    if (seen.has(page)) {
      problems.push(
        `record ${index} names the page ${page} a second time. Rule SAFE-01.`,
      )
    }

    seen.add(page)
  }

  return problems
}

export const unnamedModuleProblems = (
  records: RouteRecord[],
  modules: string[],
  pageCount: number,
): string[] => {
  assert(pageCount >= 0)
  assert(records.length <= RECORDS_MAX)

  if (pageCount === 0) {
    return []
  }

  const named = new Set(records.flatMap((record) => record.dependencies ?? []))

  return modules
    .filter((module) => !named.has(module))
    .map(
      (module) =>
        `no record names the module ${module}. A dependency with no fault case is a failed dependency. Rule FIT-02.`,
    )
}

export const unrecordedPages = (
  records: RouteRecord[],
  pages: string[],
): string[] => {
  assert(records.length <= RECORDS_MAX)
  assert(pages.length <= RECORDS_MAX)

  const recorded = new Set(records.map((record) => record.page ?? ''))

  return pages.filter((page) => !recorded.has(page))
}

export const pageComponentProblems = (
  components: Record<string, string[]>,
): string[] => {
  assert(Object.keys(components).length <= RECORDS_MAX)

  const problems: string[] = []

  for (const [page, files] of Object.entries(components)) {
    assert(files.length <= RECORDS_MAX)

    if (files.length === 0) {
      problems.push(
        `src/pages/${page} has no file of the shape ui/*Page.tsx, so no boundary of the level route exists. Rule BND-01.`,
      )
    } else if (files.length > 1) {
      problems.push(
        `src/pages/${page} has ${files.length} files of the shape ui/*Page.tsx, and the route component is one file. Rule BND-01.`,
      )
    }
  }

  return problems
}
