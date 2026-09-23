import { type AppError } from './appError.ts'

export type Result<T> = { error: AppError; ok: false } | { ok: true; value: T }

export const ok = <T>(value: T): Result<T> => ({ ok: true, value })

export const fail = <T>(error: AppError): Result<T> => ({ error, ok: false })
