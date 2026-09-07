import assert from 'node:assert'
import { type ChildProcess, spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { setTimeout as delay } from 'node:timers/promises'
import { type Browser, chromium } from 'playwright'

const PORT = 5_173
const ORIGIN_DEFAULT = `http://localhost:${PORT}`
const OUT_DIR = 'reports/shots'
const VIEWPORT = { height: 800, width: 1_280 }
const READY_TRIES_MAX = 120
const READY_DELAY_MS = 250
const ROUTES_MAX = 20
const ERRORS_SHOWN_MAX = 20

type Plan = {
  origin: string
  routes: string[]
  serve: boolean
}

const planOf = (argv: string[]): Plan => {
  assert(Array.isArray(argv))
  assert(argv.length >= 0)

  const flag = argv.indexOf('--url')
  const given = flag === -1 ? ORIGIN_DEFAULT : argv[flag + 1]

  if (given === undefined || !given.startsWith('http')) {
    throw new Error('--url needs an origin such as http://localhost:5173')
  }

  const origin = given

  assert(typeof origin === 'string')
  assert(origin.startsWith('http'))

  const routes = argv
    .filter((word: string) => word.startsWith('/'))
    .slice(0, ROUTES_MAX)

  return {
    origin,
    routes: routes.length === 0 ? ['/'] : routes,
    serve: flag === -1,
  }
}

const fileNameOf = (route: string) => {
  assert(route.startsWith('/'))
  assert(route.length >= 1)

  const name = route.slice(1).replaceAll('/', '-')

  return `${name === '' ? 'index' : name}.png`
}

const startServer = () => {
  const server = spawn(
    'pnpm',
    ['exec', 'vite', '--strictPort', '--port', String(PORT)],
    { stdio: 'ignore' },
  )

  assert(server.pid !== undefined)
  assert(server.killed === false)

  return server
}

const waitForServer = async (origin: string) => {
  assert(origin.startsWith('http'))
  assert(READY_TRIES_MAX > 0)

  let tries = 0

  while (tries < READY_TRIES_MAX) {
    try {
      await fetch(origin)

      return
    } catch {
      await delay(READY_DELAY_MS)
    }

    tries += 1
  }

  throw new Error(`${origin} did not answer after ${READY_TRIES_MAX} tries`)
}

const capture = async (browser: Browser, origin: string, route: string) => {
  assert(route.startsWith('/'))
  assert(origin.startsWith('http'))

  const errors: string[] = []
  const page = await browser.newPage({ viewport: VIEWPORT })

  page.on('console', (line) => {
    if (line.type() !== 'error') {
      return
    }

    errors.push(line.text())
  })
  page.on('pageerror', (error: Error) => errors.push(error.message))

  const path = `${OUT_DIR}/${fileNameOf(route)}`

  await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' })
  await page.screenshot({ fullPage: true, path })
  await page.close()

  assert(Array.isArray(errors))

  return { errors, path }
}

const report = (route: string, path: string, errors: string[]) => {
  assert(route.startsWith('/'))
  assert(Array.isArray(errors))

  console.log(`${route} -> ${path}`)

  for (const message of errors.slice(0, ERRORS_SHOWN_MAX)) {
    console.log(`  console error: ${message}`)
  }
}

const main = async () => {
  const plan = planOf(process.argv.slice(2))

  assert(plan.routes.length > 0)
  assert(plan.routes.length <= ROUTES_MAX)

  mkdirSync(OUT_DIR, { recursive: true })

  const server: ChildProcess | null = plan.serve ? startServer() : null

  try {
    await waitForServer(plan.origin)

    const browser = await chromium.launch({ headless: true })

    for (const route of plan.routes) {
      const shot = await capture(browser, plan.origin, route)

      report(route, shot.path, shot.errors)
    }

    await browser.close()
  } finally {
    server?.kill()
  }
}

await main()
