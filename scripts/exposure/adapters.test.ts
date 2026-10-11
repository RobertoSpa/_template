import { adapterProblems, adaptersOf } from './adapters.ts'
import { describe, expect, it } from 'vitest'

const SET: Array<[string, string]> = [
  ['referrer-policy', 'no-referrer'],
  ['x-frame-options', 'DENY'],
]
const CACHE = {
  hashed: 'public, max-age=31536000, immutable',
  other: 'no-cache',
}

describe('adaptersOf', () => {
  it('writes the _headers file of Netlify and Cloudflare Pages', () => {
    const found = adaptersOf(SET, CACHE).find(({ name }) => name === '_headers')

    expect(found?.text).toBe(
      [
        '# DANGER: a generated file. A hand edit is a second copy of the header set.',
        '# Source: exposure/policy.yaml. Run: pnpm exposure write.',
        '/*',
        '  referrer-policy: no-referrer',
        '  x-frame-options: DENY',
        '  cache-control: no-cache',
        '/assets/*',
        '  cache-control: public, max-age=31536000, immutable',
        '',
      ].join('\n'),
    )
  })

  it('writes vercel.json with one record per path', () => {
    const found = adaptersOf(SET, CACHE).find(
      ({ name }) => name === 'vercel.json',
    )

    expect(JSON.parse(found?.text ?? '')).toStrictEqual({
      headers: [
        {
          headers: [
            { key: 'referrer-policy', value: 'no-referrer' },
            { key: 'x-frame-options', value: 'DENY' },
            { key: 'cache-control', value: 'no-cache' },
          ],
          source: '/(.*)',
        },
        {
          headers: [
            {
              key: 'cache-control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
          source: '/assets/(.*)',
        },
      ],
    })
  })

  it('writes the header set with always in each of the four nginx locations', () => {
    const found = adaptersOf(SET, CACHE).find(
      ({ name }) => name === 'nginx.conf',
    )
    const text = found?.text ?? ''
    const locations = text
      .split('\n')
      .filter((line) => line.startsWith('location '))

    expect(locations).toStrictEqual([
      'location ~ /\\. {',
      'location ~ \\.map$ {',
      'location /assets/ {',
      'location / {',
    ])
    expect(
      text.match(/add_header x-frame-options "DENY" always;/gu),
    ).toHaveLength(4)
    expect(
      text.match(/add_header cache-control "no-cache" always;/gu),
    ).toHaveLength(3)
    expect(text).toContain(
      'add_header cache-control "public, max-age=31536000, immutable" always;',
    )
  })

  it('writes a Caddyfile that removes the server header', () => {
    const found = adaptersOf(SET, CACHE).find(
      ({ name }) => name === 'Caddyfile',
    )

    expect(found?.text).toContain('    -server\n')
    expect(found?.text).toContain('    x-frame-options "DENY"\n')
    expect(found?.text).toContain('respond @hidden 404\nheader {')
    expect(found?.text).toContain(
      '    not path *.map\n}\nheader @asset cache-control "public, max-age=31536000, immutable"',
    )
  })

  it('gives four adapters, in alphabetical sequence', () => {
    expect(adaptersOf(SET, CACHE).map(({ name }) => name)).toStrictEqual([
      'Caddyfile',
      '_headers',
      'nginx.conf',
      'vercel.json',
    ])
  })
})

describe('adapterProblems', () => {
  const wanted = [{ name: '_headers', text: 'a\n' }]

  it('gives no problem when the file equals the generated text', () => {
    expect(
      adapterProblems(wanted, new Map([['_headers', 'a\n']])),
    ).toStrictEqual([])
  })

  it.each([
    [
      new Map<string, string>(),
      'exposure/adapters/_headers is missing. Do: Run pnpm exposure write. Rule RED-02.',
    ],
    [
      new Map([['_headers', 'a\n# edited\n']]),
      'exposure/adapters/_headers is different from the generated text. Do: Run pnpm exposure write, and do not edit the file by hand. Rule RED-02.',
    ],
  ])('names the defect of %o', (onDisk, line) => {
    expect(adapterProblems(wanted, onDisk)).toStrictEqual([line])
  })
})
