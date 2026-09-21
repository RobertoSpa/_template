import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'

const A11Y = 'See docs/agents/accessibility.md'
const POLICY_PATH = 'a11y/policy.yaml'

const policy = parseYaml(readFileSync(POLICY_PATH, 'utf8'))

export const a11yPluginRules = Object.fromEntries(
  policy.eslint_jsx_a11y.map((name) => [`jsx-a11y/${name}`, 'error']),
)

const colorSinks = [
  {
    message: `Each color lives in ${policy.tokens.file}. Use a token. Rule COLOR-01. ${A11Y}`,
    selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
  },
  {
    message: `Each color lives in ${policy.tokens.file}. Use a token. Rule COLOR-01. ${A11Y}`,
    selector: 'Literal[value=/(rgba?|hsla?|oklch|color-mix)\\(/]',
  },
]

export const a11yPrimitiveSinks = [
  ...colorSinks,
  {
    message: `role="application" turns off the reading mode of the screen reader. Rule UI-05. ${A11Y}`,
    selector: 'JSXAttribute[name.name="role"][value.value="application"]',
  },
  {
    message: `The down event starts no function. The up event does. Rule KEY-08. ${A11Y}`,
    selector: 'JSXAttribute[name.name=/^on(Mouse|Pointer)Down$/]',
  },
]

export const a11ySinks = [
  ...a11yPrimitiveSinks,
  ...policy.patterns.elements_reserved.map((name) => ({
    message: `A raw <${name}> lives in ${policy.patterns.primitives_directory}. Import the primitive. Rule UI-01. ${A11Y}`,
    selector: `JSXOpeningElement[name.name="${name}"]`,
  })),
  {
    message: `Only a primitive moves the focus, and only after an action of the user. Rule FOC-07. ${A11Y}`,
    selector: 'CallExpression[callee.property.name="focus"]',
  },
]
