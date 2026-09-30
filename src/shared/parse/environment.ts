import { appError } from '../lib/appError.ts'
import { fail, ok, type Result } from '../lib/result.ts'

export type Environment = { mode: string }

type Raw = Readonly<Record<string, boolean | string | undefined>>

const SHIPPED_PREFIX = 'VITE_'
const SECRET_WORDS = new Set(['PASSWORD', 'PRIVATE', 'SECRET', 'TOKEN'])

const isShippedSecret = (name: string): boolean => {
  if (name.startsWith(SHIPPED_PREFIX)) {
    return name
      .toUpperCase()
      .split('_')
      .some((word) => SECRET_WORDS.has(word))
  }

  return false
}

export const secretNameOf = (names: readonly string[]): string | undefined =>
  names.find(isShippedSecret)

export const parseEnvironment = (
  raw: Raw = import.meta.env,
): Result<Environment> => {
  const mode = raw.MODE

  if (typeof mode !== 'string' || mode.length === 0) {
    return fail(appError('unexpected', 'env', 'the variable MODE is missing'))
  }

  return ok({ mode })
}
