import { problem } from './shared.ts'
import assert from 'node:assert'
import { createHash } from 'node:crypto'

// The browser hashes the text between the tags, byte for byte. Rule OUT-03.
const STYLE_TAG = /<style[^>]*>(.*?)<\/style>/gisu
const HASH_SOURCE = /^'sha256-[A-Za-z0-9+/=]+'$/u
const TAGS_MAX = 1_000

// Each inline style of the html has its hash in style-src, and each hash has a style. Rule OUT-03.
export const styleHashProblems = (
  path: string,
  text: string,
  styleSources: string[],
): string[] => {
  assert(path.endsWith('.html'))
  assert(Array.isArray(styleSources))

  const hashes = [...text.matchAll(STYLE_TAG)].map(
    (match) =>
      `'sha256-${createHash('sha256').update(match[1]).digest('base64')}'`,
  )
  const listed = styleSources.filter((source) => HASH_SOURCE.test(source))

  assert(hashes.length <= TAGS_MAX)

  return [
    ...hashes
      .filter((hash) => !listed.includes(hash))
      .map((hash) =>
        problem(
          `${path} holds a style tag with the hash ${hash}, and headers.csp.style-src does not list it`,
          `Add ${hash} to headers.csp.style-src in exposure/policy.yaml`,
          'OUT-03',
        ),
      ),
    ...listed
      .filter((hash) => !hashes.includes(hash))
      .map((hash) =>
        problem(
          `headers.csp.style-src lists ${hash}, and no style tag of ${path} has that hash`,
          `Remove ${hash} from headers.csp.style-src in exposure/policy.yaml`,
          'OUT-03',
        ),
      ),
  ]
}
