import { a11yPrimitiveSinks, a11ySinks } from './accessibilityConfig.js'
import mustUseResult from './mustUseResult.js'
import {
  bannedEverywhere,
  htmlSinks,
  parseSinks,
  typeHoles,
} from './pennoConfig.js'
import requireBoundary from './requireBoundary.js'
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'

const RESILIENCE = 'See docs/agents/resilience.md'
const POLICY_PATH = 'resilience/policy.yaml'

const resilience = parseYaml(readFileSync(POLICY_PATH, 'utf8'))

const throwSink = {
  message: `A throw is a bug, and an expected failure is a returned Result. A throw lives in ${resilience.error.throw_allowed_in.join(', ')}. Rule ERR-01. ${RESILIENCE}`,
  selector: 'ThrowStatement',
}

const trySink = {
  message: `A component and the logic layer do not catch. Recovery is the job of the boundary, and a catch lives in ${resilience.error.catch_allowed_in.join(', ')}. Rule BND-05. ${RESILIENCE}`,
  selector: 'TryStatement',
}

const catchParserSink = {
  message: `A caught value goes through the one parser in ${resilience.error.parser}. Call toAppError or toFetchError in the catch. Rule ERR-05. ${RESILIENCE}`,
  selector:
    'CatchClause:not(:has(CallExpression[callee.name=/^to(App|Fetch)Error$/]))',
}

const messageSinks = [
  {
    message: `A message changes, and a code does not. Branch on the field code. Rule ERR-08. ${RESILIENCE}`,
    selector:
      'BinaryExpression[operator=/^[!=]==?$/] > MemberExpression[property.name="message"]',
  },
  {
    message: `A message changes, and a code does not. Branch on the field code. Rule ERR-08. ${RESILIENCE}`,
    selector:
      'CallExpression[callee.object.property.name="message"][callee.property.name=/^(includes|startsWith|endsWith|match|search)$/]',
  },
]

const flagStateSink = {
  message: `An asynchronous state is one union of ${resilience.error.async_states.join(', ')}. Three flags give eight states, and four of them are not possible. Rule ERR-09. ${RESILIENCE}`,
  selector: 'ArrayPattern > Identifier[name=/(Loading|Error)$/]',
}

const fetchSinks = [
  {
    message: `Only the client in ${resilience.network.client} calls fetch, with a timeout and one retry policy. Rules NET-01 and NET-02. ${RESILIENCE}`,
    selector: 'CallExpression[callee.name="fetch"]',
  },
  {
    message: `Only the client in ${resilience.network.client} calls fetch, with a timeout and one retry policy. Rules NET-01 and NET-02. ${RESILIENCE}`,
    selector:
      'CallExpression[callee.object.name="globalThis"][callee.property.name="fetch"]',
  },
  {
    message: `Only the client in ${resilience.network.client} talks to the network. Rule NET-02. ${RESILIENCE}`,
    selector: 'NewExpression[callee.name="XMLHttpRequest"]',
  },
]

const retrySink = {
  message: `Only the client in ${resilience.network.client} retries. A second retry loop multiplies the load. Rule NET-02. ${RESILIENCE}`,
  selector: 'Identifier[name=/retr(y|ies)/i]',
}

// The logic layer, the pages, the widgets, and the features.
export const resilienceSinks = [
  throwSink,
  trySink,
  catchParserSink,
  ...messageSinks,
  flagStateSink,
  ...fetchSinks,
  retrySink,
]

// The boundary throws to its parent, and assert throws on a bug.
const resilienceSinksWithThrow = resilienceSinks.filter(
  (sink) => sink !== throwSink,
)

// An infrastructure module catches at the external client.
export const infrastructureSinks = [
  catchParserSink,
  ...messageSinks,
  flagStateSink,
  ...fetchSinks,
  retrySink,
]

// The client fetches, retries, and its stub throws as fetch throws.
const clientSinks = [catchParserSink, ...messageSinks, flagStateSink]

// These blocks name one file each, and they come after the folder blocks.
export const resilienceBlocks = [
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      resilient: {
        rules: {
          'must-use-result': mustUseResult,
          'require-boundary': requireBoundary,
        },
      },
    },
    rules: {
      'resilient/must-use-result': 'error',
      'resilient/require-boundary': 'error',
    },
  },
  {
    files: [resilience.error.result_file, 'src/shared/lib/assert.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...bannedEverywhere,
        ...parseSinks,
        ...htmlSinks,
        ...typeHoles,
        ...a11ySinks,
        ...resilienceSinksWithThrow,
      ],
    },
  },
  {
    files: [resilience.boundary.file],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...bannedEverywhere,
        ...parseSinks,
        ...htmlSinks,
        ...typeHoles,
        ...a11yPrimitiveSinks,
        ...resilienceSinksWithThrow,
      ],
      'react/no-set-state': 'off',
    },
  },
  {
    files: [resilience.network.client],
    rules: { 'no-restricted-syntax': ['error', ...clientSinks] },
  },
  {
    files: [resilience.detection.reporter],
    rules: { 'no-console': 'off' },
  },
]
