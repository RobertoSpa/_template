import { HASH } from '../bundle/measure.ts'
import { type ManifestEntry, type Policy, problem } from './shared.ts'
import { styleHashProblems } from './styleChecks.ts'
import assert from 'node:assert'
import { createHash } from 'node:crypto'
import { extname } from 'node:path'

// One file of the output, by its path relative to output.dir.
export type OutputFile = { bytes: Uint8Array; path: string }

const FILES_MAX = 10_000
const ASSETS = 'assets/'
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>\s*[^\s<]/iu
const ON_ATTRIBUTE = /\son[a-z]+\s*=/iu
const JAVASCRIPT_URL = /(?:href|src)\s*=\s*["']?javascript:/iu
const HTTP_EQUIV = /http-equiv\s*=\s*["']?content-security-policy/iu
const DISALLOW = /^Disallow:\s*(\S+)/gimu
const LOCATION = /<loc>([^<]+)<\/loc>/giu
const CONTACT = /^Contact:\s*\S+/imu
const EXPIRES = /^Expires:\s*(\S+)/imu
const MS_PER_DAY = 86_400_000
// A JSON web token is three base64url parts. The payload is the second.
const JWT = /\beyJ[\w-]{8,}\.([\w-]{8,})\.[\w-]{8,}/gu
const SECRET_PATTERNS: Array<[string, RegExp]> = [
  ['a Supabase secret key', /\bsb_secret_[\w-]{8,}/u],
  ['a private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/u],
  ['a URL with a password', /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/iu],
]

const decoder = new TextDecoder()

// The served set is the output minus each path of output.skip. Rule OUT-01.
export const servedOf = (files: OutputFile[], skip: string[]): OutputFile[] => {
  assert(files.length <= FILES_MAX)
  assert(skip.length > 0)

  const served = files.filter(
    ({ path }) =>
      !skip.some((one) => path.endsWith(one) || path.startsWith(one)),
  )

  assert(served.length <= files.length)

  return served
}

// The first segment of a path that starts with a dot and is not allowed. Rule OUT-02.
export const dotSegmentOf = (
  path: string,
  allowed: string[],
): string | undefined => {
  assert(path.length > 0)
  assert(Array.isArray(allowed))

  return path
    .split('/')
    .find((segment) => segment.startsWith('.') && !allowed.includes(segment))
}

const pathProblems = (path: string, output: Policy['output']): string[] => {
  assert(path.length > 0)
  assert(output.served_extensions.length > 0)

  const problems: string[] = []
  const extension = extname(path)
  const dotSegment = dotSegmentOf(path, output.dot_allowed)

  if (!output.served_extensions.includes(extension)) {
    problems.push(
      problem(
        `${path} has the extension ${extension}, which is not in output.served_extensions`,
        `Remove ${path} from the build`,
        'OUT-01',
      ),
    )
  }

  if (dotSegment !== undefined) {
    problems.push(
      problem(
        `${path} has the segment ${dotSegment}, and a dot segment is not served`,
        `Remove ${path} from the build`,
        'OUT-02',
      ),
    )
  }

  if (path.startsWith(ASSETS) && !HASH.test(path)) {
    problems.push(
      problem(
        `${path} has no content hash in its name`,
        `Let Vite name ${path} with a hash`,
        'OUT-04',
      ),
    )
  }

  return problems
}

const htmlProblems = (path: string, text: string): string[] => {
  assert(path.endsWith('.html'))
  assert(typeof text === 'string')

  const found: Array<[RegExp, string, string]> = [
    [
      INLINE_SCRIPT,
      'an inline script body',
      'Move the script to a file in assets/',
    ],
    [
      ON_ATTRIBUTE,
      'an attribute that starts with on',
      'Attach the handler in the script',
    ],
    [
      JAVASCRIPT_URL,
      'a javascript: URL',
      'Replace the URL with a handler in the script',
    ],
    [
      HTTP_EQUIV,
      'a meta tag with http-equiv',
      'Remove the meta tag, the header carries the policy',
    ],
  ]

  return found
    .filter(([pattern]) => pattern.test(text))
    .map(([, what, action]) =>
      problem(`${path} holds ${what}`, action, 'OUT-03'),
    )
}

const secretProblems = (path: string, text: string): string[] => {
  assert(path.length > 0)
  assert(typeof text === 'string')

  const problems = SECRET_PATTERNS.filter(([, pattern]) =>
    pattern.test(text),
  ).map(([what]) =>
    problem(
      `${path} holds ${what}`,
      `Remove the secret from ${path} and rotate it`,
      'DATA-07',
    ),
  )

  for (const match of text.matchAll(JWT)) {
    const payload = Buffer.from(match[1], 'base64url').toString('utf8')

    if (payload.includes('"service_role"')) {
      problems.push(
        problem(
          `${path} holds a JSON web token with the role service_role`,
          `Remove the token from ${path} and rotate it`,
          'DATA-07',
        ),
      )
    }
  }

  return problems
}

const contentProblems = (file: OutputFile): string[] => {
  assert(file.path.length > 0)
  assert(file.bytes.length >= 0)

  const text = decoder.decode(file.bytes)
  const problems = secretProblems(file.path, text)

  if (file.path.endsWith('.html')) {
    problems.push(...htmlProblems(file.path, text))
  }

  return problems
}

export const servedProblems = (
  served: OutputFile[],
  output: Policy['output'],
  styleSources: string[],
): string[] => {
  assert(served.length <= FILES_MAX)
  assert(output.files_max > 0)

  const problems = served.flatMap((file) => [
    ...pathProblems(file.path, output),
    ...contentProblems(file),
    ...(file.path.endsWith('.html')
      ? styleHashProblems(file.path, decoder.decode(file.bytes), styleSources)
      : []),
    ...(file.bytes.length > output.file_bytes_max
      ? [
          problem(
            `${file.path} has ${file.bytes.length} bytes, and output.file_bytes_max is ${output.file_bytes_max}`,
            `Make ${file.path} smaller`,
            'OUT-04',
          ),
        ]
      : []),
  ])

  if (served.length > output.files_max) {
    problems.push(
      problem(
        `the served set has ${served.length} files, and output.files_max is ${output.files_max}`,
        'Remove the files that no page loads',
        'OUT-04',
      ),
    )
  }

  return problems
}

// Rule ROUTE-07. The two index files name no route of a non-public audience.
export const indexProblems = (
  served: OutputFile[],
  nonPublicPaths: string[],
): string[] => {
  assert(served.length <= FILES_MAX)
  assert(nonPublicPaths.length <= FILES_MAX)

  const files: Array<[string, RegExp]> = [
    ['robots.txt', DISALLOW],
    ['sitemap.xml', LOCATION],
  ]

  return files.flatMap(([name, pattern]) => {
    const found = served.find((file) => file.path === name)

    if (found === undefined) {
      return []
    }

    const text = decoder.decode(found.bytes)

    return [...text.matchAll(pattern)]
      .map((match) => match[1])
      .filter((value) => nonPublicPaths.some((path) => value.endsWith(path)))
      .map((value) =>
        problem(
          `${name} names ${value}, a route of a non-public audience`,
          `Remove ${value} from ${name}`,
          'ROUTE-07',
        ),
      )
  })
}

// Rule OUT-08. Days until the expiry, rounded down.
export const securityTxtProblems = (
  text: string | undefined,
  rule: Policy['output']['security_txt'],
  todayIso: string,
): string[] => {
  assert(todayIso.length === 10)
  assert(rule.expires_days_min < rule.expires_days_max)

  if (text === undefined) {
    return [
      problem(
        `the served set has no ${rule.path}`,
        `Write public/${rule.path} with a Contact line and an Expires line`,
        'OUT-08',
      ),
    ]
  }

  const problems: string[] = []
  const expires = EXPIRES.exec(text)?.[1]
  const days =
    expires === undefined
      ? Number.NaN
      : Math.floor((Date.parse(expires) - Date.parse(todayIso)) / MS_PER_DAY)

  if (!CONTACT.test(text)) {
    problems.push(
      problem(
        `${rule.path} has no Contact line`,
        'Add a Contact line with a mailto: or https: URL',
        'OUT-08',
      ),
    )
  }

  if (Number.isNaN(days)) {
    problems.push(
      problem(
        `${rule.path} has no Expires line with a date`,
        'Add an Expires line with an ISO 8601 date',
        'OUT-08',
      ),
    )
  } else if (days < rule.expires_days_min || days > rule.expires_days_max) {
    problems.push(
      problem(
        `${rule.path} expires in ${days} days, and the window is ${rule.expires_days_min} to ${rule.expires_days_max}`,
        `Set Expires to a date between ${rule.expires_days_min} and ${rule.expires_days_max} days from today`,
        'OUT-08',
      ),
    )
  }

  return problems
}

// Rule OUT-06. The list of served files with their hashes, in alphabetical sequence.
export const manifestOf = (served: OutputFile[]): ManifestEntry[] => {
  assert(served.length > 0)
  assert(served.length <= FILES_MAX)

  const entries = served
    .map(({ bytes, path }) => ({
      bytes: bytes.length,
      path,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }))
    .toSorted((one, two) => one.path.localeCompare(two.path, 'en'))

  assert(entries.length === served.length)
  assert(entries.every((entry) => entry.sha256.length === 64))

  return entries
}
