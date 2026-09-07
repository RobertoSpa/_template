import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const TEST_FILE_PATTERN = /\.(?:test|spec)\.tsx?$/u
const TEST_CASE_PATTERN = /(?:^|[\s;{])(?:it|test)\s*[(.]/gu
const FILES_MAX = 500

const countTestCases = (source: string) => {
  assert(typeof source === 'string')

  const found = source.match(TEST_CASE_PATTERN)

  assert(found === null || Array.isArray(found))

  return found === null ? 0 : found.length
}

const isCommitted = (path: string) => {
  assert(path.length > 0)
  assert(TEST_FILE_PATTERN.test(path))

  const found = execFileSync('git', ['ls-tree', '--name-only', 'HEAD', path], {
    encoding: 'utf8',
  })

  assert(typeof found === 'string')

  return found.trim() === path
}

const readCommitted = (path: string) => {
  assert(path.length > 0)
  assert(TEST_FILE_PATTERN.test(path))

  if (!isCommitted(path)) {
    return ''
  }

  return execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' })
}

const changedTestFiles = () => {
  const output = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
    encoding: 'utf8',
  })

  assert(typeof output === 'string')

  const paths = output
    .split('\n')
    .filter((path: string) => TEST_FILE_PATTERN.test(path))

  assert(paths.length <= FILES_MAX)

  return paths
}

const reportLoss = (path: string) => {
  const before = countTestCases(readCommitted(path))
  const after = existsSync(path)
    ? countTestCases(readFileSync(path, 'utf8'))
    : 0

  assert(before >= 0)
  assert(after >= 0)

  if (after >= before) {
    return false
  }

  console.error(`${path}: got ${after} test cases, want ${before} or more`)

  return true
}

const main = () => {
  if (process.env.ALLOW_TEST_REMOVAL === '1') {
    return
  }

  const losses = changedTestFiles().filter(reportLoss)

  assert(Array.isArray(losses))
  assert(losses.length >= 0)

  if (losses.length === 0) {
    return
  }

  console.error(
    'A test count went down. Name the tests and the reason, then rerun with ALLOW_TEST_REMOVAL=1.',
  )
  process.exit(1)
}

main()
