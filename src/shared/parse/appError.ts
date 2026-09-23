import { type AppError, appError, type Code } from '../lib/appError.ts'
import { assert } from '../lib/assert.ts'

const ABORT_NAMES = ['TimeoutError', 'AbortError']

const detailOf = (caught: unknown): string => {
  const detail = caught instanceof Error ? caught.message : String(caught)

  assert(typeof detail === 'string', 'a detail is text')

  return detail
}

const codeOf = (caught: unknown): Code => {
  if (caught instanceof DOMException && ABORT_NAMES.includes(caught.name)) {
    return 'timeout'
  }

  if (caught instanceof SyntaxError) {
    return 'malformed'
  }

  return 'unexpected'
}

export const toAppError = (caught: unknown, context: string): AppError => {
  assert(context.length > 0, 'an error names its context')

  const error = appError(codeOf(caught), context, detailOf(caught))

  assert(error.context === context, 'the context is kept')

  return error
}

export const toFetchError = (caught: unknown, context: string): AppError => {
  assert(context.length > 0, 'an error names its context')

  const error = toAppError(caught, context)

  if (error.code === 'unexpected' && caught instanceof TypeError) {
    return appError('network', context, error.detail)
  }

  assert(
    error.code !== 'network',
    'only a TypeError of fetch is a network error',
  )

  return error
}
