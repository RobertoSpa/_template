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
| `pnpm format` | Writes the Prettier and ESLint corrections. |
