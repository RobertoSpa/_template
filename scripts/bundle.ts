import { checkPolicy } from './bundle/policy.ts'
import { type Gate, readPolicy } from './bundle/shared.ts'
import { checkSize } from './bundle/size.ts'
import { writeSizes } from './bundle/write.ts'
import { report, runGates } from './gates.ts'

const GATES: Record<string, Gate> = {
  policy: checkPolicy,
  size: checkSize,
}
// write is a command and not a gate, the one writer of bundle/sizes.json. Rule BSOT-05.
const WRITE = 'write'

const argv = process.argv.slice(2)
const policy = readPolicy()

process.exitCode =
  argv[0] === WRITE
    ? Number(!report(WRITE, await writeSizes(policy)))
    : await runGates(GATES, policy, argv)
