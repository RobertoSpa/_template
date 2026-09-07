import requireCreateNull from './eslint-rules/requireCreateNull.js'
import vitest from '@vitest/eslint-plugin'
import auto from 'eslint-config-canonical/auto'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import globals from 'globals'
import ts from 'typescript-eslint'

const SKILL = 'See .claude/skills/testing/SKILL.md'

const bannedInTests = [
  {
    message: `A mock asserts how the code talks to a collaborator, not what it did. Give the module a real dependency built by createNull(). ${SKILL}`,
    selector:
      'CallExpression[callee.object.name=/^(vi|jest)$/][callee.property.name=/^(mock|doMock|spyOn|mocked)$/]',
  },
  {
    message: `A test id is a hook that only the test uses, so it tests the markup and not the behavior. Query by role, by label, or by visible text. ${SKILL}`,
    selector:
      'MemberExpression[property.name=/^(get|query|find)(All)?ByTestId$/]',
  },
  {
    message: `A snapshot asserts nothing, because a wrong output is accepted the moment it is written. Name the value that you expect. ${SKILL}`,
    selector: 'MemberExpression[property.name=/^toMatch(Inline)?Snapshot$/]',
  },
  {
    message: `A catch block with no assertion turns a thrown error into a pass. Assert on the rejection with expect(...).rejects or expect(...).toThrow(). ${SKILL}`,
    selector: 'TryStatement',
  },
]

const bannedEverywhere = [
  {
    message: `The clock is infrastructure. Take it from a wrapper in src/shared/infrastructure/ that exports create() and createNull(). ${SKILL}`,
    selector: 'NewExpression[callee.name="Date"]',
  },
  {
    message: `The environment is infrastructure. Read it one time in a wrapper in src/shared/infrastructure/ and pass the value down. ${SKILL}`,
    selector: 'MemberExpression[object.name="process"][property.name="env"]',
  },
]

const bannedProperties = [
  {
    message: `The clock is infrastructure. Take it from a wrapper in src/shared/infrastructure/ that exports create() and createNull(). ${SKILL}`,
    object: 'Date',
    property: 'now',
  },
  {
    message: `A random number is infrastructure, and it makes a flaky test. Take it from a wrapper in src/shared/infrastructure/. ${SKILL}`,
    object: 'Math',
    property: 'random',
  },
]

const pluginsUnused = ['@graphql-eslint', 'jsonc', 'yml']

const canonical = auto
  .filter((config) => {
    const plugins = Object.keys(config.plugins ?? {})

    return !plugins.some((name) => pluginsUnused.includes(name))
  })
  .map(({ settings, ...config }) => ({
    ...config,
    settings: {
      ...settings,
      'import-x/resolver-next': [createTypeScriptImportResolver()],
      'import/resolver': undefined,
    },
  }))

const [, prettierOptions] = auto.find((config) => config.plugins?.prettier)
  .rules['prettier/prettier']

export default ts.config(
  ...canonical,
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', next: '*', prev: 'multiline-block-like' },
        {
          blankLine: 'always',
          next: ['return', 'if', 'for', 'try'],
          prev: '*',
        },
        { blankLine: 'any', next: '*', prev: 'let' },
      ],
      '@stylistic/semi': ['error', 'never'],
      'prettier/prettier': [
        'error',
        { ...prettierOptions, semi: false },
        { usePrettierrc: false },
      ],
    },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.e2e.ts'],
    rules: { 'unicorn/prevent-abbreviations': 'off' },
  },
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              message: `A network mock replaces the code under test with a script. Give the component an API client built by createNull(). ${SKILL}`,
              name: 'msw',
            },
            {
              message: `A network mock replaces the code under test with a script. Give the component an API client built by createNull(). ${SKILL}`,
              name: 'msw/node',
            },
          ],
          patterns: [
            {
              group: [
                'node:fs',
                'node:fs/*',
                'node:net',
                'node:http',
                'node:https',
                'node:dns',
                'node:child_process',
                'pg',
              ],
              message: `Only a module in src/shared/infrastructure/ talks to the outside. Wrap this client there and export create() and createNull(). ${SKILL}`,
            },
          ],
        },
      ],
      'no-restricted-properties': ['error', ...bannedProperties],
      'no-restricted-syntax': ['error', ...bannedEverywhere],
    },
  },
  {
    files: [
      'src/shared/infrastructure/**/*.{ts,tsx}',
      'vitest.setup.ts',
      'vitest.setup.browser.ts',
      'scripts/**',
    ],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['src/shared/infrastructure/**/*.{ts,tsx}'],
    ignores: ['src/shared/infrastructure/**/*.{test,spec}.{ts,tsx}'],
    plugins: { local: { rules: { 'require-create-null': requireCreateNull } } },
    rules: { 'local/require-create-null': 'error' },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'no-restricted-syntax': ['error', ...bannedEverywhere, ...bannedInTests],
      'vitest/expect-expect': 'error',
      'vitest/no-conditional-expect': 'error',
      'vitest/no-conditional-in-test': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/prefer-strict-equal': 'error',
      'vitest/valid-expect': 'error',
    },
  },
  { ignores: ['dist/', '.vercel/', '.stryker-tmp/', 'reports/'] },
)
