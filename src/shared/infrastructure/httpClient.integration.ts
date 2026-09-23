import { ok } from '../lib/result.ts'
import { create } from './httpClient.ts'
import { expect, it } from 'vitest'

it('reads a page from the real network', async () => {
  const client = create()
  const result = await client.send(
    { method: 'GET', path: 'https://example.com/', tier: 'critical' },
    (text) => ok(text.includes('<html')),
  )

  expect(result).toStrictEqual({ ok: true, value: true })
})
