import { type AppError } from '../lib/appError.ts'
import { assert } from '../lib/assert.ts'
import { toAppError } from '../parse/appError.ts'

export type Reporter = { report: (error: AppError, route: string) => void }
type Report = AppError & { release: string; route: string }
type Sink = (report: Report) => void

const build = (sink: Sink, release: string): Reporter => {
  assert(release.length > 0, 'a reporter names its release')

  return {
    report(error, route) {
      assert(route.length > 0, 'a report names its route')
      assert(error.context.length > 0, 'a report names its context')

      sink({ ...error, release, route })
    },
  }
}

export const listen = (
  reporter: Reporter,
  target: EventTarget,
  routeOf: () => string,
): void => {
  assert(typeof target.addEventListener === 'function', 'a target listens')
  assert(typeof routeOf === 'function', 'a route reader is a function')

  target.addEventListener('error', (event) => {
    const caught = event instanceof ErrorEvent ? event.error : event

    reporter.report(toAppError(caught, 'error'), routeOf())
  })
  target.addEventListener('unhandledrejection', (event) => {
    const caught = event instanceof PromiseRejectionEvent ? event.reason : event

    reporter.report(toAppError(caught, 'unhandledrejection'), routeOf())
  })
}

export const create = (): Reporter =>
  build(
    (report) => {
      console.error(JSON.stringify(report))
    },
    import.meta.env.MODE,
  )

// Stryker disable next-line all
export const createNull = (release = 'test') => {
  const reports: Report[] = []

  return {
    ...build((report) => {
      reports.push(report)
    }, release),
    reports,
  }
}
