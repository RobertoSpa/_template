import { type Workflow, workflowProblems } from './actionsChecks.ts'
import { describe, expect, it } from 'vitest'

const SHA = 'a'.repeat(40)

const policy = {
  egress_allowed: ['github.com:443', 'registry.npmjs.org:443'],
  owners_allowed: ['actions', 'step-security'],
}

const workflow = (): Workflow => ({
  jobs: {
    checks: {
      steps: [
        {
          uses: `step-security/harden-runner@${SHA}`,
          with: {
            'allowed-endpoints': 'github.com:443\nregistry.npmjs.org:443\n',
            'egress-policy': 'block',
          },
        },
        { uses: `actions/checkout@${SHA}` },
        { run: 'pnpm install --frozen-lockfile' },
      ],
    },
  },
  on: { pull_request: null },
  permissions: {},
})

describe('workflowProblems', () => {
  it('accepts a workflow that obeys every rule', () => {
    expect(workflowProblems(policy, 'ci.yml', workflow())).toStrictEqual([])
  })

  it.each([
    [
      { permissions: { contents: 'read' } },
      'ci.yml: permissions at the top is not {}',
    ],
    [{ permissions: undefined }, 'ci.yml: permissions at the top is not {}'],
    [
      { on: { pull_request_target: null } },
      'ci.yml: uses the trigger pull_request_target',
    ],
  ])('refuses the top level %o', (change, problem) => {
    expect(
      workflowProblems(policy, 'ci.yml', { ...workflow(), ...change }),
    ).toStrictEqual([problem])
  })

  it.each([
    [
      [{ uses: `actions/checkout@${SHA}` }],
      'ci.yml job checks: the first step is not step-security/harden-runner',
    ],
    [
      [
        {
          uses: `step-security/harden-runner@${SHA}`,
          with: { 'egress-policy': 'audit' },
        },
      ],
      'ci.yml job checks: egress-policy is not block',
    ],
    [
      [
        {
          uses: `step-security/harden-runner@${SHA}`,
          with: {
            'allowed-endpoints': 'evil.example:443',
            'egress-policy': 'block',
          },
        },
      ],
      'ci.yml job checks: endpoint evil.example:443 is not in policy actions.egress_allowed',
    ],
    [
      [
        {
          uses: `step-security/harden-runner@${SHA}`,
          with: { 'egress-policy': 'block' },
        },
        { uses: 'actions/checkout@v7' },
      ],
      'ci.yml job checks: actions/checkout@v7 is not pinned to a SHA',
    ],
    [
      [
        {
          uses: `step-security/harden-runner@${SHA}`,
          with: { 'egress-policy': 'block' },
        },
        { uses: `tj-actions/changed-files@${SHA}` },
      ],
      'ci.yml job checks: owner tj-actions is not in policy actions.owners_allowed',
    ],
    [
      [
        {
          uses: `step-security/harden-runner@${SHA}`,
          with: { 'egress-policy': 'block' },
        },
        { env: { TOKEN: '${{ secrets.NPM_TOKEN }}' }, run: 'npm publish' },
      ],
      'ci.yml job checks: uses the long-lived secret NPM_TOKEN',
    ],
  ])('refuses the steps %o', (steps, problem) => {
    const changed = { ...workflow(), jobs: { checks: { steps } } }

    expect(workflowProblems(policy, 'ci.yml', changed)).toStrictEqual([problem])
  })

  it('lets a step read secrets.GITHUB_TOKEN', () => {
    const steps = [
      {
        uses: `step-security/harden-runner@${SHA}`,
        with: { 'egress-policy': 'block' },
      },
      { env: { GH_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }, run: 'gh api' },
    ]
    const changed = { ...workflow(), jobs: { checks: { steps } } }

    expect(workflowProblems(policy, 'ci.yml', changed)).toStrictEqual([])
  })
})
