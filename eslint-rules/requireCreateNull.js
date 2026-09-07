import assert from 'node:assert'

const INFRASTRUCTURE_PATTERN = /src\/shared\/infrastructure\//u
const REQUIRED_EXPORTS = ['create', 'createNull']

const collectClassStatics = (declaration) => {
  if (declaration.type !== 'ClassDeclaration') {
    return []
  }

  return declaration.body.body
    .filter(
      (member) => member.static === true && member.key?.name !== undefined,
    )
    .map((member) => member.key.name)
}

const collectDeclarationNames = (declaration) => {
  if (declaration === null || declaration === undefined) {
    return []
  }

  if (declaration.type === 'VariableDeclaration') {
    return declaration.declarations.map((declarator) => declarator.id.name)
  }

  return [declaration.id?.name, ...collectClassStatics(declaration)]
}

const collectExportedNames = (statement) => {
  if (statement.type !== 'ExportNamedDeclaration') {
    return []
  }

  const specified = statement.specifiers.map(
    (specifier) => specifier.exported.name,
  )

  return [...collectDeclarationNames(statement.declaration), ...specified]
}

export default {
  create(context) {
    assert(typeof context.filename === 'string')
    assert(REQUIRED_EXPORTS.length === 2)

    if (!INFRASTRUCTURE_PATTERN.test(context.filename)) {
      return {}
    }

    return {
      'Program:exit'(program) {
        assert(Array.isArray(program.body))
        assert(program.type === 'Program')

        const exported = new Set(program.body.flatMap(collectExportedNames))
        const missing = REQUIRED_EXPORTS.filter((name) => !exported.has(name))

        if (missing.length === 0) {
          return
        }

        context.report({
          data: { missing: missing.join(' and ') },
          messageId: 'missingFactory',
          node: program,
        })
      },
    }
  },
  meta: {
    docs: {
      description:
        'An infrastructure module exports a real factory and a null factory.',
    },
    messages: {
      missingFactory:
        'This infrastructure module does not export {{missing}}. An infrastructure module exports create() for the real thing and createNull() for the test double. The stub of createNull() sits at the external client, and the rest of the module runs for real. See .claude/skills/penno/SKILL.md',
    },
    schema: [],
    type: 'problem',
  },
}
