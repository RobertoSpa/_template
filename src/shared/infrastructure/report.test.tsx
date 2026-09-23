import { createNull, listen } from './report.ts'
import { describe, expect, it } from 'vitest'

describe('report', () => {
  it('records a report with the five fields', () => {
    const reporter = createNull('r1')

    reporter.report({ code: 'timeout', context: 'load', detail: 'x' }, '/home')

    expect(reporter.reports).toStrictEqual([
      {
        code: 'timeout',
        context: 'load',
        detail: 'x',
        release: 'r1',
        route: '/home',
      },
    ])
  })
})

describe('listen', () => {
  it('reports an error event', () => {
    const target = new EventTarget()
    const reporter = createNull('r1')

    listen(reporter, target, () => '/a')
    target.dispatchEvent(new ErrorEvent('error', { error: new Error('boom') }))

    expect(reporter.reports).toStrictEqual([
      {
        code: 'unexpected',
        context: 'error',
        detail: 'boom',
        release: 'r1',
        route: '/a',
      },
    ])
  })

  it('reports an unhandled rejection', () => {
    const target = new EventTarget()
    const reporter = createNull('r1')
    const promise = Promise.resolve()

    listen(reporter, target, () => '/b')
    target.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise,
        reason: new Error('nope'),
      }),
    )

    expect(reporter.reports).toStrictEqual([
      {
        code: 'unexpected',
        context: 'unhandledrejection',
        detail: 'nope',
        release: 'r1',
        route: '/b',
      },
    ])
  })
})
