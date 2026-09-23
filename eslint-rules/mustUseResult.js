import assert from 'node:assert'

const RESULT_FIELD = 'ok'

const isResultType = (type) => {
  assert(type !== undefined)

  if (!type.isUnion()) {
    return false
  }

  return type.types.every((member) =>
    member.getProperties().some((property) => property.name === RESULT_FIELD),
  )
}

const callOf = (expression) => {
  assert(expression !== undefined)

  if (expression.type === 'AwaitExpression') {
    return expression.argument
  }

  return expression
}

export default {
  create(context) {
    const services = context.sourceCode.parserServices

    assert(services !== undefined)

    if (services.program === undefined) {
      return {}
    }

    const checker = services.program.getTypeChecker()

    assert(typeof checker.getTypeAtLocation === 'function')

    return {
      ExpressionStatement(statement) {
        const call = callOf(statement.expression)

        if (call.type !== 'CallExpression') {
          return
        }

        const tsNode = services.esTreeNodeToTSNodeMap.get(statement.expression)
        const type = checker.getTypeAtLocation(tsNode)

        if (!isResultType(type)) {
          return
        }

        context.report({ messageId: 'dropped', node: statement })
      },
    }
  },
  meta: {
    docs: {
      description: 'The value of a Result is used.',
    },
    messages: {
      dropped:
        'This call returns a Result, and the statement drops it. Handle the error, return the Result, or assert on it. Rule ERR-07. See docs/agents/resilience.md',
    },
    schema: [],
    type: 'problem',
  },
}
