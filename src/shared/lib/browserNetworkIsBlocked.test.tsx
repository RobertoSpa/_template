import { expect, it } from 'vitest'

it('refuses a fetch call in a component test', () => {
  expect(() => fetch('http://127.0.0.1:1/')).toThrow('ran in a component test')
})
