import { type RouteRecord } from '../scripts/resilience/routesChecks.ts'
import { type Policy } from '../scripts/resilience/shared.ts'
import { expect, type Page, type Route, test } from '@playwright/test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'

const POLICY_PATH = 'resilience/policy.yaml'
const API_PATTERN = '**/api/**'
const SCRIPT_PATTERN = '**/*.js'
const MALFORMED_BODY = '<html>not json</html>'
const STATUS_SERVER_ERROR = 500
const SETTLE_MS = 1_000

const policy = parseYaml(readFileSync(POLICY_PATH, 'utf8')) as Policy
const records =
  (parseYaml(readFileSync(policy.routes.file, 'utf8')) as
    null | RouteRecord[]) ?? []

assert(policy.fault.cases.length > 0)
assert(policy.boundary.fallback_text.length > 0)

const faults: Record<string, (route: Route) => Promise<void>> = {
  malformed_body: async (route) => {
    await route.fulfill({ body: MALFORMED_BODY, status: 200 })
  },
  status_500: async (route) => {
    await route.fulfill({ body: '', status: STATUS_SERVER_ERROR })
  },
  timeout: async (route) => {
    await new Promise((resolve) => {
      setTimeout(resolve, policy.network.timeout_ms + SETTLE_MS)
    })
    await route.abort('timedout')
  },
}

const inject = async (page: Page, name: string): Promise<void> => {
  const fault = faults[name]

  assert(
    fault !== undefined,
    `${name} is not a fault of ${Object.keys(faults).join(', ')}`,
  )

  await page.route(API_PATTERN, fault)
}

test('the root shows the static fallback when no script loads', async ({
  page,
}) => {
  await page.route(SCRIPT_PATTERN, async (route) => {
    await route.abort('failed')
  })
  await page.goto('/')

  await expect(page.getByText(policy.boundary.fallback_text)).toBeVisible({
    timeout: policy.boundary.fallback_delay_ms + SETTLE_MS,
  })
})

test('the root replaces the static fallback when the script runs', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('main')).toBeAttached()
  await expect(page.getByText(policy.boundary.fallback_text)).toHaveCount(0)
})

for (const record of records) {
  const { core = '', path = '/', refresh = '' } = record

  for (const name of policy.fault.cases) {
    test(`${path} keeps "${core}" with the fault ${name}`, async ({ page }) => {
      await inject(page, name)
      await page.goto(path)

      await expect(page.getByText(core)).toBeVisible()
    })
  }

  if (refresh.length > 0) {
    test(`${path} keeps "${core}" when a refresh fails`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByText(core)).toBeVisible()

      await inject(page, 'status_500')

      const failed = page.waitForResponse(
        (response) => response.status() === STATUS_SERVER_ERROR,
      )

      await page.getByText(refresh).click()
      await failed

      await expect(page.getByText(core)).toBeVisible()
    })
  }
}
