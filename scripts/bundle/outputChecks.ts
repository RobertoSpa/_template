import { packageOf } from './measure.ts'
import assert from 'node:assert'

type Modules = Record<string, Record<string, number>>

const FILES_MAX = 10_000
const MAP_NAME = 'sourceMappingURL'
// Each way to load a script. A URL of a different origin can come after it.
const LOADS = ['src=', 'href=', 'import(', 'importScripts(', 'from']
const QUOTES = ['"', "'"]
const SCHEME = /^https?:/iu

const isRemoteUrl = (after: string): boolean => {
  assert(typeof after === 'string')

  const quoted = after.startsWith(' ') ? after.slice(1) : after

  if (!QUOTES.includes(quoted.charAt(0))) {
    return false
  }

  const url = quoted.slice(1).replace(SCHEME, '')

  assert(url.length <= quoted.length)

  return url.startsWith('//')
}

const testProblems = (
  modules: Modules,
  root: string,
  patterns: string[],
): string[] => {
  assert(root.length > 0)
  assert(patterns.length > 0)

  return Object.entries(modules).flatMap(([chunk, ids]) =>
    Object.keys(ids)
      .map((id) => id.replace(`${root}/`, ''))
      .filter((id) => patterns.some((pattern) => id.includes(pattern)))
      .map((id) => `${chunk} holds ${id}, which is test code. Rule SHAKE-04.`),
  )
}

export const moduleProblems = (
  modules: Modules,
  root: string,
  testPatterns: string[],
): { packages: Record<string, number>; problems: string[] } => {
  assert(Object.keys(modules).length <= FILES_MAX)
  assert(root.length > 0)

  const packages: Record<string, number> = {}
  const instances = new Map<string, Set<string>>()

  for (const [id, length] of Object.values(modules).flatMap(Object.entries)) {
    const found = packageOf(id)

    if (found === undefined) {
      continue
    }

    packages[found.name] = (packages[found.name] ?? 0) + length
    instances.set(
      found.name,
      (instances.get(found.name) ?? new Set()).add(found.instance),
    )
  }

  const duplicates = [...instances.values()]
    .filter((set) => set.size > 1)
    .map(
      (set) =>
        `the output holds ${[...set].toSorted().join(' and ')}. Rule PKG-03.`,
    )

  return {
    packages,
    problems: [...duplicates, ...testProblems(modules, root, testPatterns)],
  }
}

export const mapProblems = (
  scripts: Record<string, string>,
  names: string[],
): string[] => {
  assert(names.length <= FILES_MAX)
  assert(Object.keys(scripts).every((name) => names.includes(name)))

  return Object.entries(scripts).flatMap(([name, text]) => [
    ...(names.includes(`${name}.map`)
      ? []
      : [`${name} has no map. Rule MAP-01.`]),
    ...(text.includes(MAP_NAME) ? [`${name} names its map. Rule MAP-01.`] : []),
  ])
}

const loadsRemote = (text: string): boolean => {
  assert(typeof text === 'string')
  assert(LOADS.length > 0)

  return LOADS.some((load) =>
    text
      .split(load)
      .slice(1)
      .some((after) => isRemoteUrl(after)),
  )
}

export const originProblems = (texts: Record<string, string>): string[] => {
  assert(Object.keys(texts).length <= FILES_MAX)

  const problems = Object.entries(texts)
    .filter(([, text]) => loadsRemote(text))
    .map(
      ([name]) =>
        `${name} loads a script from a different origin. Rule SPLIT-03.`,
    )

  assert(problems.length <= Object.keys(texts).length)

  return problems
}
