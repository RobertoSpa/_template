import { HASH } from '../bundle/measure.ts'
import { type Policy } from './shared.ts'
import assert from 'node:assert'

// One header name and its value. Names are lowercase. Rule HDR-01.
export type Header = [string, string]

export const HEADER_NAME = /^[a-z][a-z0-9-]*$/u

const DIRECTIVES_MAX = 50
const HEADERS_MAX = 50
const STATUS_OK = 200

const cspOf = (csp: Record<string, string[]>): string => {
  const names = Object.keys(csp).toSorted()

  assert(names.length > 0)
  assert(names.length <= DIRECTIVES_MAX)

  const directives = names.map((name) => {
    const sources = csp[name]

    assert(Array.isArray(sources))

    return sources.length === 0 ? name : `${name} ${sources.join(' ')}`
  })

  return directives.join('; ')
}

const permissionsPolicyOf = (denied: string[]): string => {
  assert(denied.length > 0)
  assert(denied.length <= HEADERS_MAX)

  return denied
    .toSorted()
    .map((feature) => `${feature}=()`)
    .join(', ')
}

// The one list of headers that every response carries. Rule ESOT-01.
export const headerSetOf = (headers: Policy['headers']): Header[] => {
  assert(Object.keys(headers.fixed).length > 0)
  assert(headers.permissions_denied.length > 0)

  const fixed: Header[] = Object.entries(headers.fixed)
  const made: Header[] = [
    ['content-security-policy', cspOf(headers.csp)],
    ['permissions-policy', permissionsPolicyOf(headers.permissions_denied)],
  ]
  const set = [...fixed, ...made].toSorted(([one], [two]) =>
    one.localeCompare(two, 'en'),
  )

  assert(set.every(([name]) => HEADER_NAME.test(name)))
  assert(set.length <= HEADERS_MAX)

  return set
}

// A served hashed file is immutable. Each other response is checked on each load. Rule HDR-09.
export const cacheControlOf = (
  path: string,
  status: number,
  headers: Policy['headers'],
): string => {
  assert(path.length > 0)
  assert(status > 0)

  const hashed = status === STATUS_OK && HASH.test(path)

  assert(typeof hashed === 'boolean')

  return hashed ? headers.cache.hashed : headers.cache.other
}
