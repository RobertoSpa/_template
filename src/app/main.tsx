import {
  create as createReporter,
  listen,
} from '../shared/infrastructure/report.ts'
import { messageOf } from '../shared/lib/appError.ts'
import { assert } from '../shared/lib/assert.ts'
import { parseEnvironment } from '../shared/parse/environment.ts'
import { Boundary, RESETS_MAX } from '../shared/ui/boundary.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const root = document.querySelector('#root')

assert(root !== null, 'index.html has an element with the id root')

const routeOf = () => window.location.pathname

const mount = (release: string): void => {
  const reporter = createReporter(release)

  listen(reporter, window, routeOf)

  createRoot(root).render(
    <StrictMode>
      <Boundary
        level="root"
        report={(error) => {
          reporter.report(error, routeOf())
        }}
        resetsMax={RESETS_MAX}
      >
        <main />
      </Boundary>
    </StrictMode>,
  )
}

const environment = parseEnvironment()

if (environment.ok) {
  mount(environment.value.mode)
} else {
  createReporter('unknown').report(environment.error, routeOf())
  root.textContent = messageOf(environment.error.code)
}
