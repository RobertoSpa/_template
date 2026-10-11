import { type Probe, problem } from './shared.ts'
import assert from 'node:assert'

const COOKIE = 'set-cookie'
const CORS_HEADER = 'access-control-allow-origin'
const HOST_COOKIE =
  /^__Host-[^=]+=.*;\s*Secure.*;\s*HttpOnly.*;\s*Path=\/.*;\s*SameSite=(?:Lax|Strict)/isu
const COOKIE_DOMAIN = /;\s*Domain=/iu

const label = (probe: Probe): string => {
  assert(probe.path.length > 0)
  assert(probe.method.length > 0)

  return `${probe.method} ${probe.path}`
}

export const cookieProblems = (probe: Probe, serverKind: string): string[] => {
  assert(serverKind.length > 0)
  assert(probe.path.length > 0)

  const cookie = probe.headers[COOKIE]

  if (cookie === undefined) {
    return []
  }

  if (serverKind === 'none') {
    return [
      problem(
        `${label(probe)} has ${COOKIE}: ${cookie}, and a static build sets no cookie`,
        'Remove the cookie from the host',
        'HDR-10',
      ),
    ]
  }

  return HOST_COOKIE.test(cookie) && !COOKIE_DOMAIN.test(cookie)
    ? []
    : [
        problem(
          `${label(probe)} has ${COOKIE}: ${cookie}`,
          'Name the cookie __Host-, add Secure, HttpOnly, Path=/, SameSite=Lax, and remove Domain',
          'HDR-10',
        ),
      ]
}

export const corsProblems = (probe: Probe): string[] => {
  assert(probe.kind === 'cors')
  assert(probe.path.length > 0)

  const found = probe.headers[CORS_HEADER]

  return found === undefined
    ? []
    : [
        problem(
          `${label(probe)} with a foreign origin has ${CORS_HEADER}: ${found}`,
          'Make the server send no access-control-allow-origin',
          'HDR-08',
        ),
      ]
}
