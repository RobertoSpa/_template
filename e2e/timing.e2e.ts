import {
  type Policy,
  type RouteRecord,
  type Sample,
} from '../scripts/timing/shared.ts'
import {
  type Browser,
  expect,
  type JSHandle,
  type Page,
  test,
} from '@playwright/test'
import assert from 'node:assert'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parse as parseYaml } from 'yaml'

// The DOM types of TypeScript 6 do not have durationThreshold. Chrome reads it.
type EventObserverInit = PerformanceObserverInit & { durationThreshold: number }

const POLICY_PATH = 'timing/policy.yaml'
const RUNS_MAX = 100
const BODY_CORNER = { x: 1, y: 1 }

const policy = parseYaml(readFileSync(POLICY_PATH, 'utf8')) as Policy
const records =
  (parseYaml(readFileSync(policy.routes.file, 'utf8')) as
    null | RouteRecord[]) ?? []
const samples: Record<string, Sample[]> = {}

assert(policy.lab.runs > 0)
assert(policy.lab.runs <= RUNS_MAX)
assert(records.length > 0)

// The last entry of the buffer is the largest paint. A route with no entry painted no content.
const lcpOf = (page: Page): Promise<null | number> =>
  page.evaluate(() => {
    const observer = new PerformanceObserver(() => {})

    observer.observe({ buffered: true, type: 'largest-contentful-paint' })

    const entries = observer.takeRecords()

    observer.disconnect()

    return entries.length === 0
      ? null
      : Math.round(entries[entries.length - 1].startTime)
  })

const observeInteractions = (
  page: Page,
  thresholdMs: number,
): Promise<JSHandle<number[]>> =>
  page.evaluateHandle((durationThreshold) => {
    const durations: number[] = []
    const init: EventObserverInit = {
      buffered: false,
      durationThreshold,
      type: 'event',
    }

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (
          entry instanceof PerformanceEventTiming &&
          entry.interactionId > 0
        ) {
          durations.push(entry.duration)
        }
      }
    }).observe(init)

    return durations
  }, thresholdMs)

const interact = async (page: Page, control: string | undefined) => {
  assert(control === undefined || control.length > 0)
  assert(page.isClosed() === false)

  if (control === undefined) {
    await page.keyboard.press('Tab')
    await page.mouse.click(BODY_CORNER.x, BODY_CORNER.y)

    return
  }

  await page.getByText(control, { exact: true }).click()
}

// Chrome reports an interaction after the frame that follows it. Two frames and one task cover that.
const interactionDurationsOf = (
  durations: JSHandle<number[]>,
): Promise<number[]> =>
  durations.evaluate(
    (list) =>
      new Promise<number[]>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => resolve(list), 0)
          })
        })
      }),
  )

const sampleOf = async (
  browser: Browser,
  route: RouteRecord,
): Promise<Sample> => {
  assert(route.path.startsWith('/'))
  assert(policy.lab.interaction_threshold_ms > 0)

  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto(route.path, { waitUntil: 'networkidle' })

  const lcp = await lcpOf(page)

  const observed = await observeInteractions(
    page,
    policy.lab.interaction_threshold_ms,
  )

  await interact(page, route.control)

  const durations = await interactionDurationsOf(observed)

  await context.close()

  assert(lcp === null || lcp >= 0)
  assert(durations.every((duration) => duration >= 0))

  return { inp_ms: Math.round(Math.max(0, ...durations)), lcp_ms: lcp }
}

for (const route of records) {
  test(`${route.path} gives ${policy.lab.runs} samples of the LCP and the INP`, async ({
    browser,
  }) => {
    const taken: Sample[] = []

    for (let run = 0; run < policy.lab.runs; run += 1) {
      taken.push(await sampleOf(browser, route))
    }

    samples[route.path] = taken

    expect(taken).toHaveLength(policy.lab.runs)
  })
}

test.afterAll(() => {
  mkdirSync(dirname(policy.lab.report), { recursive: true })
  writeFileSync(policy.lab.report, JSON.stringify({ routes: samples }, null, 2))
})
