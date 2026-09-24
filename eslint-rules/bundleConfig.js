const BUNDLE = 'See docs/agents/bundle.md'

// Rule SHAKE-02. A rule of its own, so no list of no-restricted-syntax can drop it.
const literalImport = {
  create: (context) => ({
    ImportExpression: (node) => {
      if (node.source.type === 'Literal') {
        return
      }

      context.report({ messageId: 'literal', node })
    },
  }),
  meta: {
    messages: {
      literal: `An import() call has one string literal as its argument. The bundler cannot put a limit on a path that it cannot read. Rule SHAKE-02. ${BUNDLE}`,
    },
    schema: [],
    type: 'problem',
  },
}

// Rule SHAKE-03. Rule CODE-02 of docs/agents/security.md refuses eval.
export const bundleBlocks = [
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['**/*.{test,spec,e2e,integration}.{ts,tsx}'],
    plugins: { bundle: { rules: { 'literal-import': literalImport } } },
    rules: {
      'bundle/literal-import': 'error',
      'import/no-namespace': 'error',
      'no-implied-eval': 'error',
    },
  },
]
