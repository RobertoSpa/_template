import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const root = document.querySelector('#root')

if (root === null) {
  throw new Error('index.html has no element with id "root"')
}

createRoot(root).render(
  <StrictMode>
    <main />
  </StrictMode>,
)
