import { assert } from './assert.ts'

const MESSAGES = {
  malformed: 'The server sent data that the app cannot read. Reload the page.',
  network: 'The app cannot reach the server. Test the connection, then retry.',
  server: 'The server had an error. Retry in one minute.',
  shed: 'The app is busy. Retry in one minute.',
  timeout: 'The server did not answer in time. Retry.',
  unexpected: 'The app hit a bug. Reload the page.',
} as const

export type AppError = { code: Code; context: string; detail: string }

export type Code = keyof typeof MESSAGES

export const appError = (
  code: Code,
  context: string,
  detail: string,
): AppError => {
  assert(context.length > 0, 'an error names its context')
  assert(code in MESSAGES, `the code ${code} has a message`)

  return { code, context, detail }
}

export const messageOf = (code: Code): string => {
  assert(code in MESSAGES, `the code ${code} has a message`)

  const message = MESSAGES[code]

  assert(message.length > 0, 'a message has text')

  return message
}
