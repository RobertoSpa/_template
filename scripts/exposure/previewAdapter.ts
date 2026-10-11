import { readPolicy } from '../policies.ts'
import { cacheControlOf, type Header, headerSetOf } from './headers.ts'
import { dotSegmentOf } from './outputChecks.ts'
import { type Policy } from './shared.ts'
import assert from 'node:assert'
import { existsSync } from 'node:fs'
import { type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import { type Plugin } from 'vite'

const POLICY_PATH = new URL('../../exposure/policy.yaml', import.meta.url)
const STATUS_NOT_FOUND = 404
const STATUS_METHOD = 405
const HTML = '.html'
const ROOT = '/'
const PATH_MAX = 2_048

type Refusal = [string, (request: Request, policy: Policy) => boolean]
type Request = { method: string; pathname: string }
type Verdict = undefined | { reason: string; status: number }

// Each row is one cause of a 404, in the sequence of the test. Rule ROUTE-04.
const NOT_FOUND: Refusal[] = [
  [
    'dot segment',
    ({ pathname }, { output }) =>
      dotSegmentOf(pathname, output.dot_allowed) !== undefined,
  ],
  [
    'skipped file',
    ({ pathname }, { output }) =>
      output.skip.some(
        (one) => pathname.endsWith(one) || pathname.startsWith(`/${one}`),
      ),
  ],
  [
    'folder path',
    ({ pathname }) => pathname !== ROOT && pathname.endsWith(ROOT),
  ],
  [
    'missing file',
    ({ pathname }, { output }) =>
      extname(pathname).length > 0 && !existsSync(join(output.dir, pathname)),
  ],
]

const verdictOf = (request: Request, policy: Policy): Verdict => {
  assert(request.pathname.startsWith(ROOT))
  assert(request.method.length > 0)

  if (!policy.routes.methods_default.includes(request.method)) {
    return { reason: 'method', status: policy.routes.method_status }
  }

  const refused = NOT_FOUND.find(([, test]) => test(request, policy))

  if (refused === undefined) {
    return undefined
  }

  return { reason: refused[0], status: STATUS_NOT_FOUND }
}

const applyHeaders = (
  response: ServerResponse,
  pathname: string,
  set: Header[],
  policy: Policy,
): void => {
  assert(set.length > 0)
  assert(pathname.startsWith(ROOT))

  for (const [name, value] of set) {
    response.setHeader(name, value)
  }

  for (const name of policy.headers.absent) {
    response.removeHeader(name)
  }

  response.setHeader(
    'cache-control',
    cacheControlOf(pathname, response.statusCode, policy.headers),
  )

  const type = String(response.getHeader('content-type') ?? '')

  if (type.startsWith('text/html') || extname(pathname) === HTML) {
    response.setHeader('content-type', policy.headers.html_content_type)
  }
}

// The preview server is the first adapter. It reads the same header set as the others. Rule ESOT-01.
export const exposurePreview = (): Plugin => ({
  config: () => ({ preview: { cors: false } }),
  configurePreviewServer: (server) => {
    const policy = readPolicy<Policy>(POLICY_PATH.pathname)
    const set = headerSetOf(policy.headers)

    assert(set.length > 0)
    assert(policy.routes.methods_default.length > 0)

    server.middlewares.use(
      (request: IncomingMessage, response: ServerResponse, next) => {
        const pathname = new URL(request.url ?? ROOT, 'http://preview').pathname
        const method = request.method ?? 'GET'

        assert(pathname.length <= PATH_MAX)

        const writeHead = response.writeHead.bind(response)
        const withHeaders = (...args: Parameters<typeof writeHead>) => {
          applyHeaders(response, pathname, set, policy)

          return writeHead(...args)
        }

        response.writeHead = withHeaders as typeof response.writeHead

        const verdict = verdictOf({ method, pathname }, policy)

        if (verdict === undefined) {
          next()

          return
        }

        if (verdict.status === STATUS_METHOD) {
          response.setHeader('allow', policy.routes.methods_default.join(', '))
        }

        response.statusCode = verdict.status
        response.end(verdict.reason)
      },
    )
  },
  name: 'exposure-preview',
})
