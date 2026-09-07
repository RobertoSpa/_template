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
| `pnpm gate:tests` | Makes sure that no test count went down. |
| `pnpm gate:journeys` | Compares `e2e/journeys.txt` to the end-to-end spec files. |
| `pnpm gate:flaky` | Runs the changed tests 10 times, in a random sequence. |
| `pnpm format` | Writes the Prettier and ESLint corrections. |

## Testing rules

Read `.claude/skills/testing/SKILL.md` before the first test of a task. That
file holds the rules that no tool tests.

- Only a module in `src/shared/infrastructure/` speaks to the network, the
  disk, the clock, a random number, or a database. Each such module exports
  `create()` and `createNull()`.
- This project uses no mock and no fake.
- The hook `.claude/hooks/threeLawsGate.py` refuses a write to `src/` until a
  test failed after the last write to `src/`.
- The git hooks are in `.githooks/`. The `prepare` script of `package.json`
  points git at that directory.
