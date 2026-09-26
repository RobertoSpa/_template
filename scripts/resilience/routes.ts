import { type Outcome } from '../gates.ts'
import { exists, folders, readYaml } from '../io.ts'
import {
  pageComponentProblems,
  recordProblems,
  type RouteRecord,
  unnamedModuleProblems,
  unrecordedPages,
} from './routesChecks.ts'
import { type Policy } from './shared.ts'
import assert from 'node:assert'
import { readdirSync } from 'node:fs'

const PAGES_PATH = 'src/pages'
const INFRASTRUCTURE_PATH = 'src/shared/infrastructure'
const MODULE_FILE = /^([a-z][A-Za-z]*)\.tsx?$/u
const PAGE_COMPONENT = /Page\.tsx$/u
const UI_FOLDER = 'ui'
const ENTRIES_MAX = 10_000

const modules = (path: string): string[] => {
  assert(path.length > 0)

  if (!exists(path)) {
    return []
  }

  const names = readdirSync(path)
    .map((name) => MODULE_FILE.exec(name)?.[1])
    .filter((name) => name !== undefined)

  assert(names.length <= ENTRIES_MAX)

  return names.toSorted()
}

const pageComponents = (pages: string[]): Record<string, string[]> => {
  assert(pages.length <= ENTRIES_MAX)

  const components: Record<string, string[]> = {}

  for (const page of pages) {
    const folder = `${PAGES_PATH}/${page}/${UI_FOLDER}`
    const files = exists(folder) ? readdirSync(folder) : []

    assert(files.length <= ENTRIES_MAX)
    components[page] = files.filter((name) => PAGE_COMPONENT.test(name))
  }

  return components
}

export const checkRoutes = (policy: Policy): Outcome => {
  assert(policy.routes.modes.length > 0)
  assert(policy.routes.default_mode.length > 0)

  const records = readYaml<null | RouteRecord[]>(policy.routes.file) ?? []
  const pages = folders(PAGES_PATH)
  const known = modules(INFRASTRUCTURE_PATH)
  const notes = [
    `${pages.length} pages read`,
    `${records.length} records read`,
    ...unrecordedPages(records, pages).map(
      (page) =>
        `${PAGES_PATH}/${page} has no record. It takes the mode ${policy.routes.default_mode} and each module. Rule SAFE-02.`,
    ),
  ]
  const problems = [
    ...recordProblems(records, pages, policy.routes.modes, known),
    ...unnamedModuleProblems(records, known, pages.length),
    ...pageComponentProblems(pageComponents(pages)),
  ]

  assert(notes.length >= 2)

  return { notes, problems }
}
