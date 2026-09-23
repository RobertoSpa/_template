import { assert } from '../lib/assert.ts'
import { ok } from '../lib/result.ts'
import { create } from './httpClient.ts'
import { createServer } from 'node:http'
import { afterAll, beforeAll, expect, it } from 'vitest'

const HOST = '127.0.0.1'
const BODY = 'hello from the real socket'

const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end(BODY)
})

const portOf = (): number => {
  const address = server.address()

  assert(address !== null, 'the server listens')
  assert(typeof address === 'object', 'the server listens on a TCP port')

  return address.port
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server.listen(0, HOST, resolve)
  })
})

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => {
      resolve()
    })
  })
})

it('reads a body over a real socket', async () => {
  const client = create()
  const result = await client.send(
    { method: 'GET', path: `http://${HOST}:${portOf()}/`, tier: 'critical' },
    (text) => ok(text),
  )

  expect(result).toStrictEqual({ ok: true, value: BODY })
})
