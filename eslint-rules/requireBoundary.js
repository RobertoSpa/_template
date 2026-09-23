import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'

const POLICY_PATH = 'resilience/policy.yaml'
const COMPONENT = 'Boundary'
const LEVEL_ATTRIBUTE = 'level'

const policy = parseYaml(readFileSync(POLICY_PATH, 'utf8'))

const globToRegExp = (glob) => {
  assert(typeof glob === 'string')
  assert(glob.length > 0)

  const escaped = glob.replaceAll('.', String.raw`\.`).replaceAll('*', '[^/]+')

  return new RegExp(`(?:^|/)${escaped}$`, 'u')
}

const LEVEL_OF = [
  [globToRegExp(policy.boundary.route_files), 'route'],
  [globToRegExp(policy.boundary.widget_files), 'widget'],
]

const levelOf = (filename) => {
  assert(typeof filename === 'string')

  const found = LEVEL_OF.find(([pattern]) => pattern.test(filename))

  return found?.[1]
}

const levelOfElement = (element) => {
  assert(element.type === 'JSXOpeningElement')

  const attribute = element.attributes.find(
    (one) => one.type === 'JSXAttribute' && one.name.name === LEVEL_ATTRIBUTE,
  )

  return attribute?.value?.value
}

export default {
  create(context) {
    const level = levelOf(context.filename)

    if (level === undefined) {
      return {}
    }

    const levels = new Set()

    return {
      [`JSXOpeningElement[name.name="${COMPONENT}"]`](element) {
        levels.add(levelOfElement(element))
      },
      'Program:exit'(program) {
        assert(program.type === 'Program')
        assert(levels.size < program.body.length + 1_000)

        if (levels.has(level)) {
          return
        }

        context.report({
          data: { level },
          messageId: 'missingBoundary',
          node: program,
        })
      },
    }
  },
  meta: {
    docs: {
      description:
        'The component of a route or of a widget renders under a boundary of its level.',
    },
    messages: {
      missingBoundary:
        'This file is the component of a {{level}}, and it holds no <Boundary level="{{level}}">. A failure in it would take down the level above. Wrap the returned tree. Rule BND-01. See docs/agents/resilience.md',
    },
    schema: [],
    type: 'problem',
  },
}
