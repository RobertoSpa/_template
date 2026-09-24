# Bundle pipeline

This file holds the rules of the bundle pipeline. The file `bundle/policy.yaml` holds each number, each list, and each path. A rule names a key of that file and not a value. If a rule and the policy file disagree, the policy file wins. Then correct the rule.

The pipeline controls the bytes that a user downloads before a route can show its content. The rules come from the industries where one failure kills a person or costs millions. The NASA margin tables, the USAF mass margin standard, MISRA, the JPL rules, and the Google SRE budget policy are the sources. The strictest programming communities give the method. TigerBeetle, Reproducible Builds, the Linux kernel, and the Chromium size gate are the sources.

Each source states one principle in its own words. Put a limit on each resource. Keep a margin that decreases as the measurement becomes more accurate. Measure the same input two times and get the same answer. Count a result that no tool can prove as a failure.

## What this file does not own

- `docs/agents/security.md` owns the record and the fixed version of each dependency. It also owns the deviation machinery, the change control, the warnings of the build, and the conduct of the agent.
- `docs/agents/accessibility.md` owns the test of the words of each rule file.
- `docs/agents/resilience.md` owns the records of `resilience/routes.yaml`.
- `bulletproof-pr` owns the text of a commit message and a pull request. `bulletproof-issue` owns the text of an issue.
- `tiger-style` owns the shape of the code. `penno` owns the tests.

If a rule here and one of these files disagree, the other file wins. Then correct the rule here.

The skills `vercel-react-best-practices` and `impeccable` also give advice about bundle size. In this project, if that advice and a rule of this file disagree, the rule wins.

## How to read a rule

The section "How to read a rule" of `docs/agents/security.md` gives the identifier, the category, the layer, the cause, and the test. It also gives the rule that no answer is no-go. A rule of this file uses the same names.

## Five words

This file uses five words for five things, and it does not interchange them.

- A wire byte is a byte that the network sends. For a text file, it is the size of the file after Brotli compression. For an image or a font, it is the size of the file.
- A raw byte is a byte of the file before compression. The browser parses each raw byte of a script.
- A route is a path that the router names, such as `/` or `/settings`.
- A budget is the limit of one route, in wire bytes. It lives in `routes` of the policy file. It has four types. `js`, `css`, and `total` count the first load. `loaded` counts each file that the route can load, lazy chunks too.
- A stage is the maturity of the measurement of one route. The four stages are in `stage.order`.

## 1 Source of truth

- **BSOT-01 (M, proven).** Each number, each list, and each path of the pipeline lives in `bundle/policy.yaml`. `vite.config.ts` reads the policy file and holds no copy of a number. Cause: two copies of a number become different. Test: `pnpm bundle:policy` resolves the configuration of Vite and refuses a value that disagrees with the policy file.
- **BSOT-02 (M, proven).** The command `pnpm bundle` is the one entry point. It runs each gate in the sequence that `gates` gives, and `gates` holds `policy` and `size`. The command `pnpm bundle:write` is not a gate. CI and `.githooks/pre-push` run this one command. Cause: a gate that CI runs and the laptop does not is a gate that no person sees before the push. Test: `pnpm bundle:policy` reads the workflow file. It has one bundle step, and that step is `pnpm bundle` with no gate name.
- **BSOT-03 (M, proven).** A change to `bundle/policy.yaml` is its own pull request. Five changes can go with other files. They are a smaller budget, a new route record, a removed route record, a new page name, and a stage that moves forward. Cause: a limit that moves in the same commit as the code that broke it hides the break. Test: `pnpm bundle:policy` compares the branch with `origin/main`.
- **BSOT-04 (R, proven).** A number or a list of the policy file moves only in the safe direction with no deviation record. A smaller limit, a larger margin, and a longer list of denied packages are safe. BUD-04 controls a budget, and STG-03 controls a stage. Each other key has no safe direction, so each change to it must have a record. Cause: SEC Rule 15c3-5. A control that loosens near a deadline is not a control. Test: `pnpm bundle:policy` compares the policy file with the file on `origin/main`.
- **BSOT-05 (M, proven).** The file `bundle/sizes.json` holds the measurement of the last build. `pnpm bundle:write` writes it. No person edits it. A pull request of Dependabot that changes the output fails this rule. Check out its branch, run `pnpm bundle:write`, and push. Cause: a measurement that a person types is an estimate. Test: `pnpm bundle:size` measures the build and refuses a file that disagrees.

## 2 Build

- **BLD-01 (M, proven).** The build runs two times from the same commit. The SHA-256 of each file of the two outputs is the same. Cause: Reproducible Builds. A size change must come from a change of the source, and not from noise. Test: `pnpm bundle:size` compares the two outputs before it measures a byte.
- **BLD-02 (M, proven).** The gate sets `TZ` and `LC_ALL` to the values of `build.env` before each build. Cause: an input that the gate does not set is an input that changes the output. Test: `pnpm bundle:size` starts each build with only these values and the path.
- **BLD-04 (M, proven).** Rule CODE-08 of `docs/agents/security.md` holds for the build too. Each warning of Rolldown is an error. Cause: Power of Ten Rule 10 wants 0 warnings. Test: `rolldownOptions.onLog` in `vite.config.ts` stops the build, and `pnpm bundle:policy` refuses a configuration with no `onLog`.
- **BLD-05 (M, proven).** `build.target` of Vite is the value of `build.target` in the policy file. No package of `packages.denied` is a dependency, and the modulepreload polyfill of Vite is off. Cause: a second target is a second product to measure. Test: `pnpm bundle:policy` resolves the configuration of Vite and reads `packages.denied`.
- **BLD-06 (M, proven).** The gate measures the output of `vite build` in production mode only. Cause: the dev server sends code that no user gets. Test: `pnpm bundle:size` runs `vite build` itself.

## 3 Measurement

- **BYTE-01 (M, proven).** The gate compresses each text file with Brotli at the quality `measure.brotli_quality`. The result is the count of wire bytes of that file. Cause: the size before compression is not what the network sends. Test: `pnpm bundle:size`.
- **BYTE-02 (M, proven).** Each file of the output matches one group of `files`. A file that matches no group is a refusal. A file that matches two groups is a refusal. Cause: Tiger Style puts a limit on everything. Test: `pnpm bundle:size`.
- **BYTE-03 (M, proven).** Each count is an integer of bytes. The policy file and `bundle/sizes.json` use no unit such as kB or MiB. Cause: kB means 1000 or 1024, and two readers select different values. Test: `pnpm bundle:policy` refuses a number that is not an integer.
- **BYTE-04 (M, proven).** `bundle/sizes.json` names each file with no content hash. The keys are in alphabetical sequence. Cause: a hash in the name makes each change look like a new file. Test: `pnpm bundle:size`.
- **BYTE-05 (M, proven).** A change of one byte is a change. The gate has no noise floor. Cause: the builds are the same bit for bit, so a small change is a real change. Test: `pnpm bundle:size` compares each count.

## 4 Routes and stages

- **STG-01 (M, proven).** Each folder of `src/pages/` has one record in `routes`, and the field `page` of that record names the folder. Each record of `resilience/routes.yaml` has one record in `routes`. The branch that adds a page adds its record. Cause: a route with no record has no budget. Test: `pnpm bundle:policy`.
- **STG-02 (M, proven).** Each record of `routes` has a path, a stage, an owner, and a budget. The owner is a GitHub handle. Cause: a budget with no owner is a budget that no person defends. Test: `pnpm bundle:policy`.
- **STG-03 (M, proven).** A stage moves forward only, in the sequence of `stage.order`. Cause: GSFC-STD-1000 selects the margin from the method of the measurement. A method does not become less accurate. Test: `pnpm bundle:policy` compares the branch with `origin/main`.
- **STG-04 (M, proven).** Each type of a budget is not more than the same type of the ceiling, less the margin of its stage. The margins are in `stage.margin`, in percent of the ceiling. The division rounds down. Cause: GSFC-STD-1000 Table 3.07-1 and SMC-T-002 Table 2. Test: `pnpm bundle:policy`.

## 5 Budgets

- **BUD-01 (M, proven).** Each type of a route is not more than the same type of `ceiling`. Cause: the budgets of Alex Russell for a load in 3 seconds on the P75 phone of 2026. Test: `pnpm bundle:size`.
- **BUD-02 (R, proven).** Each type of a route is not more than the same type of its budget. Cause: MISRA. A required limit has a deviation record or no violation. Test: `pnpm bundle:size`.
- **BUD-03 (M, proven).** From the stage in `stage.lock_from`, each type of the budget is not more than the measured size plus `stage.slack_bytes`. If a route decreases, run `pnpm bundle:write`. Then commit the smaller budget. Cause: a budget with free space lets a subsequent change use the space and cause no alarm. Test: `pnpm bundle:size`.
- **BUD-04 (M, attested).** A larger budget is its own pull request, which changes only the policy file. Its body gives the cause and the alternatives that failed. Cause: NASA SWE-126 wants a rationale and a risk for each relief. Test: the user reads the body before the word "merge".
- **BUD-05 (R, proven).** One chunk is not more than `files.script.max_wire` wire bytes and `files.script.max_raw` raw bytes. Cause: the V8 team divides a script of more than 50 to 100 kB. The limits are larger, because React 19 does not divide. Test: `pnpm bundle:size`.
- **BUD-06 (R, proven).** Each file group of `files` has a limit per file. An image, a font, the HTML, and a JSON file each obey the limit of their group. Cause: a total can hide one large file. Test: `pnpm bundle:size`.

## 6 Growth

- **GROW-01 (R, proven).** A branch increases the total of wire bytes by not more than `growth.branch_max_bytes`, compared with `origin/main`. Cause: the Chromium size gate stops a commit that adds more than 16 KB. Test: `pnpm bundle:size` compares `bundle/sizes.json` with the file on `origin/main`.
- **GROW-02 (M, proven).** While `bundle/deviations.yaml` holds a record for BUD-02, a branch does not increase the total of wire bytes. Cause: the Google SRE budget policy stops each release while the budget is spent. Test: `pnpm bundle:size`.
- **GROW-03 (M, attested).** A branch that uses more than `growth.review_percent` percent of the free space of a route has an issue. The issue holds one action that decreases the route again. Cause: the SRE policy wants a postmortem when one incident uses 20% of the budget. Test: the user reads the link in the body of the pull request.

## 7 Packages

Rules DEP-01 and DEP-15 of `docs/agents/security.md` give the record and the fixed version of each dependency.

- **PKG-02 (M, proven).** No package of `packages.denied` is a dependency. Cause: each package on the list adds code for a browser that the target does not include. Test: `pnpm bundle:policy`.
- **PKG-03 (M, proven).** The output holds one version of each package. Cause: two versions send the same code two times. Test: `pnpm bundle:size` reads the list of modules of each chunk.
- **PKG-04 (M, proven).** `bundle/sizes.json` gives the bytes of each package in the output, before minification. Cause: the cost of a package that no person measured is an estimate. Test: `pnpm bundle:size`.

## 8 Code shape

- **SHAKE-01 (M, proven).** The field `sideEffects` of `package.json` is the list `shake.side_effects`. Cause: without this field, the bundler keeps each module that it cannot prove to be free of effects. The field also has a risk. The bundler removes a module that runs only for its effect, such as `import './register'`, with no warning. Test: `pnpm bundle:policy`.
- **SHAKE-02 (M, proven).** An `import()` call has one string literal as its argument. Cause: Power of Ten Rule 2. The bundler cannot put a limit on a path that it cannot read. Test: `eslint` refuses a different argument in each file of `src/`.
- **SHAKE-03 (M, proven).** No code in `src/` imports a module with `import * as`. Rule CODE-02 of `docs/agents/security.md` refuses `eval` and `new Function`. Cause: a namespace import stops the bundler from the removal of unused code. Test: `eslint`.
- **SHAKE-04 (M, proven).** No module of a test is in the output. A module that matches `shake.test_patterns` is a refusal. Cause: the Chromium size gate refuses a symbol for a test in a release. Test: `pnpm bundle:size` reads the list of modules of each chunk.

## 9 Split and load

- **SPLIT-01 (M, proven).** Each folder of `src/pages/` is its own chunk, and the router loads it with `import()`. Cause: one route must not send the code of a different route. Test: `pnpm bundle:size` finds one dynamic entry in the manifest for each page.
- **SPLIT-02 (M, proven).** Each chunk is in the tree of one route or more. A chunk that no route loads is a refusal. Cause: Power of Ten Rule 3. The set of code is fixed at build time. Test: `pnpm bundle:size` reads `.vite/manifest.json`.
- **SPLIT-03 (M, proven).** The output loads no script from a different origin. Cause: the gate cannot measure a byte that it does not build. Test: `pnpm bundle:size` refuses a URL that starts with `http` or `//` after `src=`, `href=`, `import(`, `importScripts(`, or `from` in the output.

## 10 Assets and source maps

- **ASSET-01 (M, proven).** `build.assetsInlineLimit` of Vite is `build.inline_max_bytes`. Cause: the V8 team does not inline a script of more than 1 kB. Test: `pnpm bundle:policy` resolves the configuration of Vite.
- **ASSET-02 (R, proven).** An image is AVIF, WebP, or SVG. Only the files of `files.image.allowed_other` can have a different format. Cause: the other formats send more bytes for the same picture. Test: `pnpm bundle:size` gives a BYTE-02 refusal for a different format, because no group of `files` holds its extension.
- **ASSET-03 (A, attested).** The text uses the system font stack. A web font is WOFF2, and it holds only the characters that the pages use. Cause: a font blocks the text until it loads. Test: the user reads the diff.
- **MAP-01 (M, proven).** The value of `build.sourcemap` of Vite is `hidden`. Each JavaScript file of the output has a map. No JavaScript file names its map. Cause: a map that the server sends is a copy of the source for each user. Test: `pnpm bundle:size`.
- **MAP-02 (M, attested).** The upload to a host holds no `.map` file and no file of `.vite/`. The folder `.vite/` holds the manifest and the list of modules, with the paths of this computer. Cause: the host sends each file that it holds. Test: the user reads the deploy step, which the setup list of `README.md` adds.

## 11 Failure behavior

- **FAIL-01 (M, proven).** A gate that cannot finish is no-go. A missing manifest, a build error, and a crash of a tool are each no-go. Cause: Power of Ten Rule 2. A limit that no tool can prove counts as violated. Test: `pnpm bundle` exits with a code that is not 0.
- **FAIL-02 (M, proven).** The bundle workflow has no `continue-on-error`. Cause: that key changes a red result to green with no change in the code. Test: `pnpm bundle:policy` reads the workflow file.
- **FAIL-03 (M, attested).** `pnpm bundle` gives the same result on the laptop and in CI for the same commit. The two compare with `origin/main`, and BLD-01 removes the noise of the build. `.githooks/pre-push` refuses a push from a working tree with changes that are not committed. Cause: a gate that is different in two places has two sources of truth. Test: the user compares the output of the two runs.

## 12 Deviations

- **BDEV-01 (M, proven).** A deviation from a rule of this file is a record in `bundle/deviations.yaml`. Rules DEV-01 to DEV-03 of `docs/agents/security.md` give its seven fields, its approval, and its expiry. The field `place` names one route, one file, or one key of the policy file. Cause: GSFC-STD-1000 gives a waiver for the named elements only. Test: `pnpm bundle:policy` refuses a record with a missing field, a pattern in `place`, a past expiry, or a mandatory rule.

## Sources

The section "The bundle rules" of `docs/agents/sources.md` names the document behind each cause.
