import { appError } from '../lib/appError.ts'
import { fail, ok } from '../lib/result.ts'
import { parseEnvironment, secretNameOf } from './environment.ts'
import { describe, expect, it } from 'vitest'

describe('parseEnvironment', () => {
  it('gives the mode as a typed value', () => {
    expect(parseEnvironment({ MODE: 'production' })).toStrictEqual(
      ok({ mode: 'production' }),
    )
  })

  it('reads import.meta.env when it gets no input', () => {
    expect(parseEnvironment()).toStrictEqual(ok({ mode: 'test' }))
  })

  it.each([
    ['is absent', {}],
    ['is undefined', { MODE: undefined }],
    ['is empty', { MODE: '' }],
    ['is not a string', { MODE: true }],
  ])('names MODE when it %s', (_name, raw) => {
    expect(parseEnvironment(raw)).toStrictEqual(
      fail(appError('unexpected', 'env', 'the variable MODE is missing')),
    )
  })
})

describe('secretNameOf', () => {
  it.each([
    ['VITE_API_TOKEN'],
    ['VITE_SECRET_KEY'],
    ['VITE_password'],
    ['VITE_PRIVATE_KEY'],
  ])('gives %s, a secret name that Vite ships', (name) => {
    expect(secretNameOf(['MODE', name])).toBe(name)
  })

  it.each([
    ['API_TOKEN', 'Vite does not ship it'],
    ['VITE_PUBLIC_KEY', 'it has no secret word'],
    ['VITE_TOKENIZER', 'TOKEN is a part of a word'],
  ])('gives no name for %s, because %s', (name) => {
    expect(secretNameOf(['MODE', name])).toBeUndefined()
  })
})
