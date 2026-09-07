# Project name

One sentence that says what the project does.

## Start

1. Install the dependencies with `pnpm install`.
2. Start the dev server with `pnpm dev`.

## After the first feature

Code or a domain is necessary for these steps. Do them in this sequence.

1. When the domain has a name, do the Pocock setup.
2. When the first feature has code, do the `graphify` setup.
3. When the first screen renders, do the `impeccable` setup.
4. When the folder `apps/api` exists, add `dependency-cruiser` with the Clean Architecture layers.
5. When the first module in `src/` has logic, run `pnpm test:mutation`. Then increase the Stryker floor in `stryker.config.json` from 60 to the score that this project holds.
6. When the first module in `src/shared/infrastructure/` exists, make sure that the `Integration` workflow starts on the pull request. No pull request started this workflow.
7. When the first user journey exists, write its name in `e2e/journeys.txt`. While that file is empty, `pnpm gate:journeys` finds no error.

Note: `pnpm test:mutation` stops with an error while `src/` has no module to mutate. The CI job finds this condition and does not run Stryker.
