const SKILL = 'See .claude/skills/penno/SKILL.md'
const SECURITY = 'See docs/agents/security.md'

export const parseSinks = [
  {
    message: `Input is parsed in one place. Move this call to src/shared/parse/ and return a typed value. Rule CODE-01. ${SECURITY}`,
    selector:
      'CallExpression[callee.object.name="JSON"][callee.property.name="parse"]',
  },
  {
    message: `Input is parsed in one place. Move this call to src/shared/parse/ and return a typed value. Rule CODE-01. ${SECURITY}`,
    selector: 'NewExpression[callee.name="URLSearchParams"]',
  },
  {
    message: `A response is parsed in one place. Move this call to src/shared/parse/ and return a typed value. Rule CODE-01. ${SECURITY}`,
    selector:
      'CallExpression[callee.property.name=/^(json|text|formData)$/][callee.object.type!="Identifier"]',
  },
]

export const htmlSinks = [
  {
    message: `dangerouslySetInnerHTML takes only the value of the sanitize function in src/shared/sanitize/. Rule CODE-03. ${SECURITY}`,
    selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
  },
]

export const typeHoles = [
  {
    message: `unknown is a hole in the type proof. Parse the value into a named type. Rule CODE-05. ${SECURITY}`,
    selector: 'TSUnknownKeyword',
  },
]

export const bannedInTests = [
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
    message: `An empty catch block turns a thrown error into a pass. Assert on the rejection with expect(...).rejects or expect(...).toThrow(). ${SKILL}`,
    selector: 'CatchClause > BlockStatement[body.length=0]',
  },
]

export const bannedEverywhere = [
  {
    message: `The clock is infrastructure. Take it from a wrapper in src/shared/infrastructure/ that exports create() and createNull(). ${SKILL}`,
    selector: 'NewExpression[callee.name="Date"]',
  },
  {
    message: `The environment is infrastructure. Read it one time in a wrapper in src/shared/infrastructure/ and pass the value down. ${SKILL}`,
    selector: 'MemberExpression[object.name="process"][property.name="env"]',
  },
]

export const bannedProperties = [
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

// A rule of its own, so no list of no-restricted-syntax can drop it.
const ENVIRONMENT = 'env'

// import.meta.url and import.meta.glob stay. An alias or a destructure hides the read, so it is one too.
const readsEnvironment = (parent) => {
  if (parent.type !== 'MemberExpression') {
    return true
  }

  if (parent.computed) {
    return (
      parent.property.type !== 'Literal' ||
      parent.property.value === ENVIRONMENT
    )
  }

  return parent.property.name === ENVIRONMENT
}

const noImportMetaEnvironment = {
  create: (context) => ({
    'MetaProperty[meta.name="import"][property.name="meta"]': (node) => {
      if (readsEnvironment(node.parent)) {
        context.report({ messageId: 'read', node })
      }
    },
  }),
  meta: {
    messages: {
      read: `Vite gives each variable as an unchecked string. Read import.meta.env one time in src/shared/parse/ and use the typed value. Rule CODE-01. ${SECURITY}`,
    },
    schema: [],
    type: 'problem',
  },
}

export const environmentBlocks = [
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    ignores: ['src/shared/parse/**'],
    plugins: {
      parse: { rules: { 'no-import-meta-env': noImportMetaEnvironment } },
    },
    rules: { 'parse/no-import-meta-env': 'error' },
  },
]
