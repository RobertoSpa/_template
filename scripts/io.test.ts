import { readYaml } from './io.ts'
import { describe, expect, it } from 'vitest'

describe('readYaml', () => {
  it('gives null for a file that holds only comments', () => {
    expect(readYaml('scripts/fixtures/commentsOnly.yaml')).toBeNull()
  })
})
