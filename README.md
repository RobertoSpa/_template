# Project name

One sentence that says what the project does.

## Start

1. Install the dependencies with `pnpm install`.
2. Start the dev server with `pnpm dev`.

## On each new machine

These two steps configure the machine and not the project. A new machine must
have them again, and a clone of this template must have them again. They have
no checkbox on purpose. A checkbox here travels to the next machine and reports
work that no person did on that machine.

1. Install `mise` with the package manager of the machine. Run `mise trust`,
   then `mise install`, which gets the five tools of `mise.toml`. Add
   `mise activate` to the shell configuration, so that `pnpm security` finds
   the tools. The git hooks call `mise exec` and work without the activation.
2. Turn on commit signing with an SSH key. Run the four commands below. Then
   write one line with your email, a space, and the public key in
   `~/.ssh/allowed_signers`. The pre-push hook refuses an unsigned commit.

   ```
   git config --global gpg.format ssh
   git config --global user.signingkey ~/.ssh/id_ed25519.pub
   git config --global commit.gpgsign true
   git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
   ```

## Setup list

Code or a domain is necessary for these steps. Each step is a milestone of
this project, and it occurs one time. Each step has a condition before it. Do
a step when its condition is true, then write its check. A `SessionStart` hook
prints the steps that apply at this time.

- [ ] The walking skeleton shows a name: write that name at the top of this file, in the place of `# Project name`. Then write one sentence below it.
- [ ] The domain has a name: run the `domain-modeling` skill, which writes `CONTEXT.md` and `docs/adr/`.
- [ ] The first feature has code: do the `graphify` setup.
- [ ] The first screen renders: do the `impeccable` setup.
- [ ] The first route renders: write its record in `a11y/routes.yaml` with the three axes, then write the golden files that `a11y/policy.yaml` names. Read `docs/agents/accessibility.md` first.
- [ ] The first interactive component exists: add `axe-core`, `@axe-core/playwright` and `html-validate`. Then turn on the axe run and the markup run in `pnpm a11y:tree` and `pnpm a11y:static`.
- [ ] The palette is complete: add `apca-w3`, then turn on the APCA note of rule COLOR-07 in `pnpm a11y:tokens`.
- [ ] `src/shared/ui/` holds a primitive: add `@guidepup/virtual-screen-reader` and write the announce golden files. Rule EV-07 makes the result a note and not a statement about a real screen reader.
- [ ] The folder `apps/api` exists: add `dependency-cruiser` with the Clean Architecture layers.
- [ ] The first module in `src/` has logic: run `pnpm test:mutation`. Then increase the Stryker floor in `stryker.config.json` from 60 to the score that this project holds. The `Mutation` workflow runs on each pull request with `--incremental`, and each Monday with `--force`.
- [ ] The folder `src/shared/infrastructure/` holds a module: make sure that the `Integration` workflow starts on the pull request.

Note: `pnpm test:mutation` stops with an error while `src/` has no module to mutate. The CI job finds this condition and does not run Stryker.
