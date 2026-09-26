import { execute } from './io.ts'
import assert from 'node:assert'

// The pre-push hook and CI compare with origin/main, so each pipeline does too.
const BASE_REFS = ['origin/main', 'main']

export const baseRef = (): string | undefined => {
  assert(BASE_REFS.length > 0)

  const found = BASE_REFS.find(
    (ref) =>
      execute('git', ['rev-parse', '--verify', '--quiet', ref]).status === 0,
  )

  assert(found === undefined || BASE_REFS.includes(found))

  return found
}

export const onBase = (ref: string, path: string): string | undefined => {
  assert(ref.length > 0)
  assert(path.length > 0)

  const shown = execute('git', ['show', `${ref}:${path}`])

  return shown.status === 0 ? shown.output : undefined
}

// The files that the commits of the branch change, with no uncommitted work.
export const changedFiles = (ref: string): string[] => {
  assert(ref.length > 0)

  const listed = execute('git', ['diff', '--name-only', `${ref}...HEAD`])

  assert(listed.status === 0, `git diff --name-only ${ref}...HEAD failed`)

  const files = listed.output.split('\n').filter((line) => line.length > 0)

  assert(files.length <= 100_000)

  return files
}

export const trackedFiles = (): string[] => {
  const listing = execute('git', ['ls-files', '-z'])

  assert(listing.status === 0, 'git ls-files failed')

  const files = listing.output.split('\0').filter((path) => path.length > 0)

  assert(files.length > 0)

  return files
}
