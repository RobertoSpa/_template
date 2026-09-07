const denyCall = (label: string) => {
  if (label.length === 0) {
    throw new Error('denyCall needs a label')
  }

  return () => {
    throw new Error(
      `${label} ran in a component test. A component takes its API client from createNull(), and the test gives it the responses. See .claude/skills/testing/SKILL.md`,
    )
  }
}

const blockBrowserNetwork = () => {
  if (typeof globalThis.fetch !== 'function') {
    throw new TypeError('fetch is missing from this browser')
  }

  globalThis.fetch = denyCall('fetch')
  XMLHttpRequest.prototype.open = denyCall('XMLHttpRequest.open')

  if (globalThis.fetch.name !== '') {
    throw new Error('fetch was not replaced')
  }
}

blockBrowserNetwork()
