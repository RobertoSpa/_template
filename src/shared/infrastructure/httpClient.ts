import { appError } from '../lib/appError.ts'
import { assert } from '../lib/assert.ts'
import { fail, type Result } from '../lib/result.ts'
import { toFetchError } from '../parse/appError.ts'

const TIMEOUT_MS = 5_000
const RETRY_MAX = 2
const RETRY_METHODS = ['GET', 'HEAD']
const BACKOFF_BASE_MS = 200
const RETRY_BUDGET_PER_TAB = 10
const RETRY_CODES = ['network', 'server', 'timeout']
const STATUS_SERVER_ERROR_MIN = 500

export type NullResponse =
  { body: string; status: number } | { throws: 'network' | 'timeout' }
type Fetch = (path: string, init: RequestInit) => Promise<Response>
type Method = 'DELETE' | 'GET' | 'HEAD' | 'POST' | 'PUT'
type Parse<T> = (text: string) => Result<T>
type Random = () => number
type Request = {
  body?: string
  method: Method
  path: string
  tier: Tier
}
type Sent = { method: string; path: string; signal: RequestInit['signal'] }
type Sleep = (ms: number) => Promise<void>
type Tier = 'critical' | 'sheddable'

const attempt = async <T>(
  fetchLike: Fetch,
  request: Request,
  parse: Parse<T>,
  context: string,
): Promise<Result<T>> => {
  assert(context.length > 0, 'a request names its context')
  assert(request.path.length > 0, 'a request has a path')

  let response: Response

  try {
    response = await fetchLike(request.path, {
      body: request.body,
      method: request.method,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    return fail(toFetchError(error, context))
  }

  if (response.status >= STATUS_SERVER_ERROR_MIN) {
    return fail(appError('server', context, String(response.status)))
  }

  return parse(await response.text())
}

const canRetry = <T>(
  result: Result<T>,
  retriesMax: number,
  retry: number,
  budget: number,
): boolean => {
  assert(retry >= 0, 'a retry index is not negative')
  assert(budget >= 0, 'a budget is not negative')

  if (result.ok) {
    return false
  }

  if (retry >= retriesMax) {
    return false
  }

  if (budget === 0) {
    return false
  }

  return RETRY_CODES.includes(result.error.code)
}

const build = (
  fetchLike: Fetch,
  sleep: Sleep,
  random: Random,
  budgetStart: number,
) => {
  assert(budgetStart >= 0, 'a budget is not negative')
  assert(RETRY_MAX >= 0, 'the retry limit is not negative')

  let budget = budgetStart

  return {
    async send<T>(request: Request, parse: Parse<T>): Promise<Result<T>> {
      const context = `${request.method} ${request.path}`

      if (budget === 0 && request.tier === 'sheddable') {
        return fail(appError('shed', context, 'retry budget 0'))
      }

      const retriesMax = RETRY_METHODS.includes(request.method) ? RETRY_MAX : 0
      let result = await attempt(fetchLike, request, parse, context)

      for (
        let retry = 0;
        canRetry(result, retriesMax, retry, budget);
        retry += 1
      ) {
        budget -= 1
        await sleep(random() * BACKOFF_BASE_MS * 2 ** retry)
        result = await attempt(fetchLike, request, parse, context)
      }

      assert(budget >= 0, 'the budget did not go below 0')

      return result
    },
  }
}

const sleepFor: Sleep = async (ms) => {
  assert(ms >= 0, 'a wait is not negative')

  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export const create = () =>
  build(
    (path, init) => globalThis.fetch(path, init),
    sleepFor,
    Math.random,
    RETRY_BUDGET_PER_TAB,
  )

// Stryker disable next-line all
export const createNull = (
  responses: NullResponse[],
  budgetStart = RETRY_BUDGET_PER_TAB,
) => {
  const queue = [...responses]
  const sent: Sent[] = []
  const waitsMs: number[] = []
  const nullFetch: Fetch = async (path, init) => {
    const next = queue.shift()

    assert(next !== undefined, 'the null client has a response for each fetch')
    sent.push({ method: init.method ?? 'GET', path, signal: init.signal })

    if ('throws' in next && next.throws === 'timeout') {
      throw new DOMException('timed out', 'TimeoutError')
    }

    if ('throws' in next) {
      throw new TypeError('Failed to fetch')
    }

    return new Response(next.body, { status: next.status })
  }

  const nullSleep: Sleep = async (ms) => {
    waitsMs.push(ms)
  }

  return {
    ...build(nullFetch, nullSleep, () => 0.5, budgetStart),
    sent,
    waitsMs,
  }
}
