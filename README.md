# Project name

One sentence that says what the project does.

## Start

1. Install the dependencies with `pnpm install`.
2. Start the dev server with `pnpm dev`.

## Setup list

Code or a domain is necessary for these steps. Each step has a condition
before it. Do a step when its condition is true, then write its check. A
`SessionStart` hook prints the steps that apply at this time.

- [ ] The walking skeleton shows a name: write that name at the top of this file, in the place of `# Project name`. Then write one sentence below it.
- [ ] The domain has a name: run the `domain-modeling` skill, which writes `CONTEXT.md` and `docs/adr/`.
- [ ] The first feature has code: do the `graphify` setup.
- [ ] The first screen renders: do the `impeccable` setup.
- [ ] The folder `apps/api` exists: add `dependency-cruiser` with the Clean Architecture layers.
- [ ] The first module in `src/` has logic: run `pnpm test:mutation`. Then increase the Stryker floor in `stryker.config.json` from 60 to the score that this project holds. The `Mutation` workflow runs on each pull request with `--incremental`, and each Monday with `--force`.
- [ ] The folder `src/shared/infrastructure/` holds a module: make sure that the `Integration` workflow starts on the pull request.

Note: `pnpm test:mutation` stops with an error while `src/` has no module to mutate. The CI job finds this condition and does not run Stryker.
