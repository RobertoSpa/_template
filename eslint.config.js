import {
  a11yPluginRules,
  a11yPrimitiveSinks,
  a11ySinks,
} from './eslint-rules/accessibilityConfig.js'
import {
  bannedEverywhere,
  bannedInTests,
  bannedProperties,
  htmlSinks,
  parseSinks,
  typeHoles,
} from './eslint-rules/pennoConfig.js'
import requireCreateNull from './eslint-rules/requireCreateNull.js'
import {
  infrastructureSinks,
  resilienceBlocks,
  resilienceSinks,
} from './eslint-rules/resilienceConfig.js'
import vitest from '@vitest/eslint-plugin'
import auto from 'eslint-config-canonical/auto'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import noUnsanitized from 'eslint-plugin-no-unsanitized'
import security from 'eslint-plugin-security'
import globals from 'globals'
import ts from 'typescript-eslint'

const SKILL = 'See .claude/skills/penno/SKILL.md'

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
      'import/no-deprecated': 'error',
      'prettier/prettier': [
        'error',
        { ...prettierOptions, semi: false },
        { usePrettierrc: false },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
      'import/no-deprecated': 'off',
    },
  },
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    plugins: { 'no-unsanitized': noUnsanitized, security },
    rules: {
      ...security.configs.recommended.rules,
      'no-unsanitized/method': 'error',
      'no-unsanitized/property': 'error',
      'security/detect-object-injection': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true, 'ts-ignore': true, 'ts-nocheck': true },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': [
        'error',
        { ignoreIIFE: false, ignoreVoid: false },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/only-throw-error': 'error',
    },
  },
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['scripts/**', 'e2e/**', 'eslint-rules/**'],
    rules: {
      'no-console': 'off',
      'no-template-curly-in-string': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
    },
  },
  {
    files: ['**/*.e2e.ts'],
    rules: { 'unicorn/prevent-abbreviations': 'off' },
  },
  {
    files: ['**/*.{js,cjs,mjs,ts,tsx}'],
    ignores: ['**/*.{test,spec,e2e}.{ts,tsx}'],
    rules: {
      'max-lines': [
        'error',
        { max: 300, skipBlankLines: true, skipComments: true },
      ],
    },
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
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: a11yPluginRules,
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.{test,spec,e2e}.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...bannedEverywhere,
        ...parseSinks,
        ...htmlSinks,
        ...typeHoles,
        ...a11ySinks,
        ...resilienceSinks,
      ],
    },
  },
  {
    files: ['src/shared/parse/**/*.ts', 'src/shared/sanitize/**/*.ts'],
    ignores: ['**/*.{test,spec}.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...bannedEverywhere,
        ...a11yPrimitiveSinks,
        ...resilienceSinks,
      ],
    },
  },
  {
    files: ['src/shared/ui/**/*.{ts,tsx}'],
    ignores: ['**/*.{test,spec}.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...bannedEverywhere,
        ...parseSinks,
        ...htmlSinks,
        ...typeHoles,
        ...a11yPrimitiveSinks,
        ...resilienceSinks,
      ],
    },
  },
  {
    files: [
      'e2e/**',
      'eslint-rules/**/*.js',
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
    ignores: [
      'src/shared/infrastructure/**/*.{test,spec,integration}.{ts,tsx}',
    ],
    plugins: { local: { rules: { 'require-create-null': requireCreateNull } } },
    rules: {
      'local/require-create-null': 'error',
      'no-restricted-imports': 'off',
      'no-restricted-properties': 'off',
      'no-restricted-syntax': ['error', ...infrastructureSinks],
    },
  },
  ...resilienceBlocks,
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'no-restricted-syntax': ['error', ...bannedEverywhere, ...bannedInTests],
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
