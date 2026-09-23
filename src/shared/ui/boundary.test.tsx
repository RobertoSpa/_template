import { createNull } from '../infrastructure/report.ts'
import { type AppError, messageOf } from '../lib/appError.ts'
import { Boundary, FALLBACK_TEXT } from './boundary.tsx'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

const Bomb = ({ explode }: { readonly explode: () => boolean }) => {
  if (explode()) {
    throw new Error('boom')
  }

  return <p>alive</p>
}

const mount = (element: React.ReactNode) => {
  const host = document.createElement('div')

  document.body.append(host)
  createRoot(host).render(element)

  return host
}

const reportTo =
  (reporter: ReturnType<typeof createNull>) => (error: AppError) => {
    reporter.report(error, '/t')
  }

const retryButton = (host: HTMLElement) =>
  [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'Retry',
  )

describe('Boundary', () => {
  it('renders the children when nothing throws', async () => {
    const host = mount(
      <Boundary
        level="widget"
        report={reportTo(createNull('r1'))}
        resetsMax={3}
      >
        <Bomb explode={() => false} />
      </Boundary>,
    )

    await expect.poll(() => host.textContent).toBe('alive')
  })

  it('renders the message of the code and keeps the siblings', async () => {
    const host = mount(
      <>
        <p>sibling</p>
        <Boundary
          level="widget"
          report={reportTo(createNull('r1'))}
          resetsMax={3}
        >
          <Bomb explode={() => true} />
        </Boundary>
      </>,
    )

    await expect.poll(() => host.textContent).toContain(messageOf('unexpected'))
    expect(host.textContent).toContain('sibling')
    expect(host.textContent).not.toContain('boom')
  })

  it('reports the error one time', async () => {
    const reporter = createNull('r1')
    const host = mount(
      <Boundary
        level="widget"
        report={reportTo(reporter)}
        resetsMax={3}
      >
        <Bomb explode={() => true} />
      </Boundary>,
    )

    await expect.poll(() => host.textContent).toContain(messageOf('unexpected'))
    expect(reporter.reports.map((report) => report.context)).toStrictEqual([
      'widget',
    ])
  })

  it('resets only its own subtree on Retry', async () => {
    let explode = true
    const host = mount(
      <Boundary
        level="widget"
        report={reportTo(createNull('r1'))}
        resetsMax={3}
      >
        <Bomb explode={() => explode} />
      </Boundary>,
    )

    await expect.poll(() => retryButton(host)).toBeInstanceOf(HTMLButtonElement)
    explode = false
    retryButton(host)?.click()

    await expect.poll(() => host.textContent).toBe('alive')
  })

  it('throws to the parent past resetsMax', async () => {
    const reporter = createNull('r1')
    const host = mount(
      <Boundary
        level="route"
        report={reportTo(reporter)}
        resetsMax={3}
      >
        <Boundary
          level="widget"
          report={reportTo(reporter)}
          resetsMax={1}
        >
          <Bomb explode={() => true} />
        </Boundary>
      </Boundary>,
    )

    await expect.poll(() => retryButton(host)).toBeInstanceOf(HTMLButtonElement)
    retryButton(host)?.click()
    await expect.poll(() => reporter.reports).toHaveLength(2)
    retryButton(host)?.click()

    await expect
      .poll(() => reporter.reports.map((report) => report.context))
      .toStrictEqual(['widget', 'widget', 'route'])
  })

  it('renders the static fallback text at the root past resetsMax', async () => {
    const host = mount(
      <Boundary
        level="root"
        report={reportTo(createNull('r1'))}
        resetsMax={0}
      >
        <Bomb explode={() => true} />
      </Boundary>,
    )

    await expect.poll(() => retryButton(host)).toBeInstanceOf(HTMLButtonElement)
    retryButton(host)?.click()

    await expect.poll(() => host.textContent).toBe(FALLBACK_TEXT)
  })
})
