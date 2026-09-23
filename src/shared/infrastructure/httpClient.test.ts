import { appError } from '../lib/appError.ts'
import { fail, ok } from '../lib/result.ts'
import { createNull } from './httpClient.ts'
import { describe, expect, it } from 'vitest'

const asText = (text: string) => ok(text)
const refuse = () => fail<string>(appError('malformed', 'parse', 'not json'))

describe('send', () => {
  it('gives the body of a 200', async () => {
    const client = createNull([{ body: 'hello', status: 200 }])

    expect(
      await client.send(
        { method: 'GET', path: '/a', tier: 'critical' },
        asText,
      ),
    ).toStrictEqual({ ok: true, value: 'hello' })
  })

  it('passes a timeout signal to each fetch', async () => {
    const client = createNull([{ body: '', status: 200 }])

    expect(
      (
        await client.send(
          { method: 'GET', path: '/a', tier: 'critical' },
          asText,
        )
      ).ok,
    ).toBe(true)
    expect(client.sent[0]?.signal).toBeInstanceOf(AbortSignal)
  })

  it('gives malformed when the parser refuses the body', async () => {
    const client = createNull([{ body: '???', status: 200 }])

    expect(
      await client.send(
        { method: 'GET', path: '/a', tier: 'critical' },
        refuse,
      ),
    ).toStrictEqual({
      error: { code: 'malformed', context: 'parse', detail: 'not json' },
      ok: false,
    })
  })

  it('gives server on a 500 and sends a POST one time', async () => {
    const client = createNull([{ body: '', status: 500 }])

    expect(
      await client.send(
        { method: 'POST', path: '/a', tier: 'critical' },
        asText,
      ),
    ).toStrictEqual({
      error: { code: 'server', context: 'POST /a', detail: '500' },
      ok: false,
    })
    expect(client.sent).toHaveLength(1)
  })

  it('retries a GET two times, then gives server', async () => {
    const client = createNull([
      { body: '', status: 500 },
      { body: '', status: 502 },
      { body: '', status: 503 },
    ])

    expect(
      (
        await client.send(
          { method: 'GET', path: '/a', tier: 'critical' },
          asText,
        )
      ).ok,
    ).toBe(false)
    expect(client.sent).toHaveLength(3)
  })

  it('retries a GET one time, then gives the body', async () => {
    const client = createNull([
      { body: '', status: 500 },
      { body: 'late', status: 200 },
    ])

    expect(
      await client.send(
        { method: 'GET', path: '/a', tier: 'critical' },
        asText,
      ),
    ).toStrictEqual({ ok: true, value: 'late' })
    expect(client.sent).toHaveLength(2)
  })

  it('waits with full jitter between the retries', async () => {
    const client = createNull([
      { body: '', status: 500 },
      { body: '', status: 500 },
      { body: '', status: 500 },
    ])

    expect(
      (
        await client.send(
          { method: 'GET', path: '/a', tier: 'critical' },
          asText,
        )
      ).ok,
    ).toBe(false)
    expect(client.waitsMs).toStrictEqual([100, 200])
  })

  it('gives timeout when each fetch times out', async () => {
    const client = createNull([
      { throws: 'timeout' },
      { throws: 'timeout' },
      { throws: 'timeout' },
    ])

    expect(
      await client.send(
        { method: 'GET', path: '/a', tier: 'critical' },
        asText,
      ),
    ).toStrictEqual({
      error: { code: 'timeout', context: 'GET /a', detail: 'timed out' },
      ok: false,
    })
  })

  it('gives network when the fetch throws a TypeError', async () => {
    const client = createNull([{ throws: 'network' }])

    expect(
      await client.send(
        { method: 'POST', path: '/a', tier: 'critical' },
        asText,
      ),
    ).toStrictEqual({
      error: { code: 'network', context: 'POST /a', detail: 'Failed to fetch' },
      ok: false,
    })
  })

  it('drops a sheddable request when the retry budget is empty', async () => {
    const client = createNull([{ body: 'x', status: 200 }], 0)

    expect(
      await client.send(
        { method: 'GET', path: '/a', tier: 'sheddable' },
        asText,
      ),
    ).toStrictEqual({
      error: { code: 'shed', context: 'GET /a', detail: 'retry budget 0' },
      ok: false,
    })
    expect(client.sent).toHaveLength(0)
  })

  it('sends a critical request with no retry when the budget is empty', async () => {
    const client = createNull([{ body: '', status: 500 }], 0)

    expect(
      (
        await client.send(
          { method: 'GET', path: '/a', tier: 'critical' },
          asText,
        )
      ).ok,
    ).toBe(false)
    expect(client.sent).toHaveLength(1)
  })

  it('spends the budget on each retry', async () => {
    const client = createNull(
      [
        { body: '', status: 500 },
        { body: '', status: 500 },
        { body: '', status: 500 },
        { body: 'x', status: 200 },
      ],
      1,
    )

    expect(
      (
        await client.send(
          { method: 'GET', path: '/a', tier: 'critical' },
          asText,
        )
      ).ok,
    ).toBe(false)
    expect(client.sent).toHaveLength(2)
    expect(
      await client.send(
        { method: 'GET', path: '/b', tier: 'sheddable' },
        asText,
      ),
    ).toStrictEqual({
      error: { code: 'shed', context: 'GET /b', detail: 'retry budget 0' },
      ok: false,
    })
  })
})
