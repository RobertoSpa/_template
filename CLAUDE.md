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
