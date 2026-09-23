import { toAppError, toFetchError } from './appError.ts'
import { describe, expect, it } from 'vitest'

describe('toAppError', () => {
  it.each([
    [
      'a TimeoutError',
      new DOMException('timed out', 'TimeoutError'),
      'timeout',
    ],
    ['an AbortError', new DOMException('aborted', 'AbortError'), 'timeout'],
    ['a SyntaxError', new SyntaxError('Unexpected token'), 'malformed'],
    ['a TypeError', new TypeError('x is not a function'), 'unexpected'],
    ['an Error', new Error('boom'), 'unexpected'],
    ['a string', 'boom', 'unexpected'],
  ])('gives the code of %s', (_name, caught, code) => {
    expect(toAppError(caught, 'load').code).toBe(code)
  })

  it('keeps the message of an Error as the detail', () => {
    expect(toAppError(new Error('boom'), 'load')).toStrictEqual({
      code: 'unexpected',
      context: 'load',
      detail: 'boom',
    })
  })

  it('keeps the text of a value that is not an Error as the detail', () => {
    expect(toAppError(42, 'load').detail).toBe('42')
  })
})

describe('toFetchError', () => {
  it('reads a TypeError from fetch as a network error', () => {
    expect(
      toFetchError(new TypeError('Failed to fetch'), 'GET /a'),
    ).toStrictEqual({
      code: 'network',
      context: 'GET /a',
      detail: 'Failed to fetch',
    })
  })

  it('reads a TimeoutError from fetch as a timeout', () => {
    expect(
      toFetchError(new DOMException('timed out', 'TimeoutError'), 'GET /a')
        .code,
    ).toBe('timeout')
  })
})
