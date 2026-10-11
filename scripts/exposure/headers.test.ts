import { cacheControlOf, headerSetOf } from './headers.ts'
import { describe, expect, it } from 'vitest'

const HEADERS = {
  absent: ['server'],
  cache: { hashed: 'public, max-age=31536000, immutable', other: 'no-cache' },
  csp: {
    'base-uri': ["'none'"],
    'default-src': ["'self'"],
    'upgrade-insecure-requests': [],
  },
  fixed: {
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY',
  },
  html_content_type: 'text/html; charset=utf-8',
  permissions_denied: ['camera', 'accelerometer'],
}

describe('headerSetOf', () => {
  it('gives each header once, lowercase, in alphabetical order', () => {
    expect(headerSetOf(HEADERS)).toStrictEqual([
      [
        'content-security-policy',
        "base-uri 'none'; default-src 'self'; upgrade-insecure-requests",
      ],
      ['permissions-policy', 'accelerometer=(), camera=()'],
      ['referrer-policy', 'no-referrer'],
      ['x-frame-options', 'DENY'],
    ])
  })

  it('sorts the directives of the policy', () => {
    const csp = { 'base-uri': ["'none'"], 'script-src': ["'self'"] }

    expect(headerSetOf({ ...HEADERS, csp })[0]).toStrictEqual([
      'content-security-policy',
      "base-uri 'none'; script-src 'self'",
    ])
  })
})

describe('cacheControlOf', () => {
  it.each([
    ['assets/index-BZxIwzb4.js', 200, 'public, max-age=31536000, immutable'],
    ['index.html', 200, 'no-cache'],
    ['assets/index-BZxIwzb4.js.map', 404, 'no-cache'],
    ['assets/index-BZxIwzb4.js', 404, 'no-cache'],
    ['robots.txt', 200, 'no-cache'],
  ])('gives %s with the status %i the value %s', (path, status, value) => {
    expect(cacheControlOf(path, status, HEADERS)).toBe(value)
  })
})
