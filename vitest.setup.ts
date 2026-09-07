import assert from 'node:assert'
import net from 'node:net'

const denyCall = (label: string) => {
  assert(typeof label === 'string')
  assert(label.length > 0)

  return () => {
    throw new Error(
      `${label} ran in a unit test. A unit test must not touch the network. Build the dependency with createNull(). See .claude/skills/penno/SKILL.md`,
    )
  }
}

const blockNodeNetwork = () => {
  assert(typeof net.Socket === 'function')
  assert(typeof globalThis.fetch === 'function')

  net.Socket.prototype.connect = denyCall('net.Socket.connect')
  globalThis.fetch = denyCall('fetch')

  assert(net.Socket.prototype.connect.name === '')
  assert(globalThis.fetch.name === '')
}

blockNodeNetwork()
