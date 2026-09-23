import { fail, ok } from './result.ts'
import { describe, expect, it } from 'vitest'

describe('Result', () => {
  it('ok holds the value', () => {
    expect(ok(3)).toStrictEqual({ ok: true, value: 3 })
  })

  it('fail holds the error', () => {
    expect(
      fail({ code: 'timeout', context: 'load rates', detail: '' }),
    ).toStrictEqual({
      error: { code: 'timeout', context: 'load rates', detail: '' },
      ok: false,
    })
  })
})
