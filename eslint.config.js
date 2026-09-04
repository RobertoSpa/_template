import auto from 'eslint-config-canonical/auto'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'
import globals from 'globals'
import ts from 'typescript-eslint'

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
  { ignores: ['dist/', '.vercel/'] },
)
