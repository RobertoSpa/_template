import base from './vite.config.ts'
import assert from 'node:assert'
import { defineConfig } from 'vitest/config'

const INTEGRATION = 'integration'
const projects = base.test?.projects ?? []

assert(projects.length === 3, 'vite.config.ts holds three projects')

const isIntegration = (project: (typeof projects)[number]): boolean =>
  typeof project === 'object' &&
  'test' in project &&
  project.test?.name === INTEGRATION

const unitProjects = projects.filter((project) => !isIntegration(project))

assert(unitProjects.length === 2, 'the unit projects are client and server')

export default defineConfig({
  ...base,
  test: { ...base.test, projects: unitProjects },
})
