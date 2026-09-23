import {
  create as createReporter,
  listen,
} from '../shared/infrastructure/report.ts'
import { assert } from '../shared/lib/assert.ts'
import { Boundary, RESETS_MAX } from '../shared/ui/boundary.tsx'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const root = document.querySelector('#root')

assert(root !== null, 'index.html has an element with the id root')

const reporter = createReporter()

listen(reporter, window, () => window.location.pathname)

createRoot(root).render(
  <StrictMode>
    <Boundary
      level="root"
      report={(error) => {
        reporter.report(error, window.location.pathname)
      }}
      resetsMax={RESETS_MAX}
    >
      <main />
    </Boundary>
  </StrictMode>,
)
