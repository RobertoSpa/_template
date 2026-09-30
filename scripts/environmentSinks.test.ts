import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const RULE = 'parse/no-import-meta-env'
const DOTTED = 'export const mode = import.meta.env.MODE\n'

const OUTSIDE = 'src/features/probe.ts'
const OUTSIDE_JS = 'src/features/probe.js'
const INSIDE = 'src/shared/parse/probe.ts'

const eslint = new ESLint({
  cwd: process.cwd(),
  overrideConfig: {
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: {
          allowDefaultProject: [OUTSIDE, OUTSIDE_JS, INSIDE],
        },
      },
    },
  },
})

const messagesOf = async (source: string, filePath: string) => {
  const [result] = await eslint.lintText(source, { filePath })

  return result.messages
    .filter((message) => message.ruleId === RULE)
    .map((message) => message.message)
}

describe('the lint rule for import.meta.env', { timeout: 30_000 }, () => {
  it.each([
    ['a dotted read', DOTTED],
    ['a computed read', "export const mode = import.meta['env'].MODE\n"],
    [
      'a destructured read',
      'const { env } = import.meta\n\nexport const mode = env.MODE\n',
    ],
    [
      'an alias of import.meta',
      'const meta = import.meta\n\nexport const mode = meta.env.MODE\n',
    ],
  ])('refuses %s outside the parse slice', async (_name, source) => {
    const messages = await messagesOf(source, OUTSIDE)

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('src/shared/parse/')
  })

  it('refuses a read in a JavaScript file', async () => {
    expect(await messagesOf(DOTTED, OUTSIDE_JS)).toHaveLength(1)
  })

  it('accepts import.meta.url outside the parse slice', async () => {
    expect(
      await messagesOf('export const here = import.meta.url\n', OUTSIDE),
    ).toStrictEqual([])
  })

  it('accepts a read in the parse slice', async () => {
    expect(await messagesOf(DOTTED, INSIDE)).toStrictEqual([])
  })
})
