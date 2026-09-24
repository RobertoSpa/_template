# Project rules

## Folder rules

The folder `src/` obeys Feature-Sliced Design (FSD). The command `pnpm lint:fsd` starts `steiger`, which does the test.

- The layers are `app`, `pages`, `widgets`, `features`, `entities`, and `shared`. Do not make a different top-level folder in `src/`.
- A file imports only from a layer that is lower than its own layer. The sequence from top to bottom is `app`, `pages`, `widgets`, `features`, `entities`, `shared`.
- A slice does not import from a different slice on the same layer.
- A slice does not have an `index` file. Each caller imports from the file that holds the code. The `steiger` rule `fsd/public-api` is off for this reason.
- If a layer is empty, delete the folder.

## Commands

| Command | Effect |
| --- | --- |
| `pnpm dev` | Starts the Vite dev server. |
| `pnpm lint` | Does the Prettier test and the ESLint test. |
| `pnpm lint:fsd` | Does the FSD test on `src/`. |
| `pnpm check` | Does the TypeScript test. |
| `pnpm test` | Does the unit tests and the end-to-end tests. |
| `pnpm test:integration` | Does the narrow tests against the real services. |
| `pnpm test:mutation` | Does the Stryker mutation run. |
| `pnpm gate:flaky` | Runs the changed tests 10 times, in a random sequence. |
| `pnpm gates` | Runs the accessibility, security, resilience, and bundle pipelines. Run it before each merge. |
| `pnpm bundle` | Does the bundle pipeline. |
| `pnpm bundle:write` | Writes `bundle/sizes.json` and each smaller budget. |
| `pnpm explain <RULE-ID>` | Prints the rule that has this identifier. |
| `pnpm shot` | Screenshots the routes into `reports/shots/`. |
| `pnpm format` | Writes the Prettier and ESLint corrections. |

## Browser checks

To look at the app, run `pnpm shot`. The script starts the Vite dev server,
opens each route in Chromium at 1280 by 800, writes a PNG to
`reports/shots/`, and prints the console errors of each page. Then stop the
server.

- `pnpm shot` shoots the route `/`.
- `pnpm shot / /about` shoots two routes.
- `pnpm shot --url http://localhost:5173 /` uses a server that already runs.

This script uses the Playwright in `devDependencies`. Give it first place.
The Playwright MCP server is a different install, and this project does not
depend on it. Use the MCP server to click, to type, and to read a page while it
runs. Use `pnpm shot` to make a file that a person or a CI job can read.

## An MCP server or this project

If a tool says that the code is correct or incorrect, put the tool in this
project. If a tool only helps the agent read, an MCP server is sufficient.

Three questions make the decision.

1. Must a CI job run it? A CI job has no MCP server.
2. Does it make a file that is necessary to this repository?
3. Is it necessary to a person who has no agent?

One answer of yes puts the tool in `package.json`. Three answers of no let the
tool stay in MCP. `pnpm-lock.yaml` holds a version for each tool in this
project. It holds no version for an MCP server.

## Penno's Axioms

The test rules of this project are five axioms. All the other test rules come
from one of them.

1. A test asserts behavior and not structure.
2. Only infrastructure touches the world. It exports `create()` and
   `createNull()`.
3. A green test shows something, or it does not count.
4. The failing test comes first.
5. A test is read alone.

Read `.claude/skills/penno/SKILL.md` before the first test of a task. That
file holds the rules that no tool can measure.

Two hooks enforce this. `.claude/hooks/pennoSkillGate.py` refuses a write to a
test file until the `penno` skill is loaded.
`.claude/hooks/threeLawsGate.py` refuses a write to `src/` until a test failed
after the last write to `src/`.

The git hooks are in `.githooks/`. The `prepare` script of `package.json`
points git at that directory.

## Agent skills

### Issue tracker

Issues live in the GitHub Issues of this repo, through the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels, each label string equal to its role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Security pipeline

The rules are in `docs/agents/security.md`. The numbers are in `security/policy.yaml`. Each rule has a layer. A tool refuses each rule of the proven layer, and each no-go line names its rule. Read the rules of the attested layer before a dependency, a workflow, a secret, a release, or a merge. The command `grep attested docs/agents/security.md` lists them. To read one rule, run `pnpm explain <RULE-ID>`. Write the sign-in of that file in the first message of each task.

### Resilience pipeline

The rules are in `docs/agents/resilience.md`. The numbers are in `resilience/policy.yaml`. The rules say what the software does while one part is broken. An expected failure is a returned `Result`, and a bug is a thrown `Error`. A `try` lives only in `src/shared/infrastructure/` and in the boundary. Only the client in `src/shared/infrastructure/httpClient.ts` calls `fetch`. Each route has a record in `resilience/routes.yaml` with its core text, its safe mode, and its dependencies.

### Bundle pipeline

The rules are in `docs/agents/bundle.md`. The numbers are in `bundle/policy.yaml`. The rules put a byte limit on each route, each file, and each branch. The branch that adds a page also adds its record in `routes`. Only `pnpm bundle:write` writes `bundle/sizes.json` or makes a budget smaller. If a rule of that file and the skills `vercel-react-best-practices` or `impeccable` disagree about bundle size, the rule wins.

<important if="a step in the setup list of README.md has no check">

`README.md` holds the setup list of this project. Each step is a checkbox, and
that checkbox is the record of the step. This file holds no copy of the list.

A step with no check has a condition. Read the condition and test it against
the repo. If the condition is true, do the step, or make an issue for it.
Then write the check. If the condition is false, keep the step with no check.

A `SessionStart` hook runs `.claude/hooks/setupChecklist.py` and prints each
step that applies at this time.
</important>
