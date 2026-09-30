import { type AppError } from './appError.ts'
import { fail, ok, type Result } from './result.ts'
import { describe, expect, expectTypeOf, it } from 'vitest'

describe('Result', () => {
  it('ok holds the value', () => {
    const result = ok(3)

    expectTypeOf(result).toEqualTypeOf<Result<number>>()
    expectTypeOf(result)
      .extract<{ ok: true }>()
      .toHaveProperty('value')
      .toEqualTypeOf<number>()
    expect(result).toStrictEqual({ ok: true, value: 3 })
  })

  it('fail holds the error', () => {
    const result = fail<number>({
      code: 'timeout',
      context: 'load rates',
      detail: '',
    })

    expectTypeOf(result).toEqualTypeOf<Result<number>>()
    expectTypeOf(result)
      .extract<{ ok: false }>()
      .toHaveProperty('error')
      .toEqualTypeOf<AppError>()
    expect(result).toStrictEqual({
      error: { code: 'timeout', context: 'load rates', detail: '' },
      ok: false,
    })
  })
})
