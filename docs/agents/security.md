# Security pipeline

This file holds the rules of the security pipeline. The file `security/policy.yaml` holds each number, each list, and each deadline. A rule names a key of that file and not a value. If a rule and the policy file disagree, the policy file wins. Then correct the rule.

The rules come from industries where an error kills a person or costs millions. The sources are aviation checklists, nuclear human performance tools, the NASA flight rules, and the WHO surgical checklist. More sources are the SEC market access rule, MISRA compliance, and the OpenBSD, qmail, SQLite, and TigerBeetle projects. The last section lists them.

The pipeline runs on a private repository with a free GitHub plan. Each gate is a file in the repository, a git hook, or a Claude Code hook. No gate is a GitHub setting. A rule that applies to a public repository only says so.

## What this file does not own

Four skills own the shape of other things. This file names what must exist. It does not say how to word it.

- `bulletproof-pr` owns the text of a commit message and a pull request.
- `bulletproof-issue` owns the text of an issue and an issue comment.
- `tiger-style` owns the shape of the code.
- `penno` owns the tests.

If a rule here and one of these skills disagree, the skill wins. Then correct the rule here.

## How to read a rule

Each rule has an identifier, a category, a layer, a rule sentence, a cause, and a test. The test names the tool or the person that refuses the change.

The categories come from MISRA Compliance:2020.

- **M, mandatory.** No deviation exists. A change that breaks the rule does not merge.
- **R, required.** A deviation is possible. It must have a record in `security/deviations.yaml`, with a rationale, the approval of the user, and an expiry date. The key `deviation.max_days` gives the longest life of a deviation.
- **A, advisory.** The agent can skip the rule. The skip must have one line in the chat that names the rule and the cause.

The layer names what refuses the violation. The three layers are in the section "The three layers" of `docs/agents/accessibility.md`. A rule of this file uses the same three names.

No answer is no-go. If a test gives no answer, the answer is no.

## The sign-in, before the first change to a file

The WHO surgical checklist stops the work before the first cut. The person that reads the list is not the person that does the work. Here the agent writes the list, and the user reads it. The answer to each item is the state that the agent sees, and not the word "done".

The agent writes these five answers in its first message of the task.

1. Make sure that the task has a written goal and a test command. If not, put the question to the user.
2. Make sure that the branch is not `main`. If it is, make a branch.
3. Make sure that `git status` is clean. If not, stop and put the question to the user.
4. Name the files that the task will touch. Name the worst outcome if the change is incorrect.
5. Name the stop condition. This is the observation that makes the agent stop and put a question to the user.

The time-out before the merge is the command `pnpm security`. Its output is one line per gate, with the word `go` or `no-go`. The user reads that output in the proof paragraph of the pull request. No other list exists.

## 1 Source of truth

- **SOT-01 (M, proven).** Each number, each list, and each deadline of the pipeline lives in `security/policy.yaml`. Cause: two copies of a number become different. Test: `pnpm security:policy` reads each tool configuration and refuses a value that disagrees with the policy file.
- **SOT-02 (M, proven).** The command `pnpm security` is the one entry point. It runs each gate in the sequence that `gates` in `security/policy.yaml` gives. CI, the pre-push hook, and the proof paragraph of the pull request all run this one command. Cause: a gate that CI runs and the laptop does not is a gate that no person sees before the push. Test: the workflow file has one security step, and it is `pnpm security`.
- **SOT-03 (M, proven).** Each tool has its native configuration file at the path that its documentation gives. The policy file does not replace the native file. The policy file is the test of the native file. Cause: a tool that cannot read the policy file must have a file that it can read. Test: `pnpm security:policy`.
- **SOT-04 (M, proven).** A change to `security/policy.yaml` is its own pull request. It touches no other file. Cause: a threshold that moves in the same commit as the code that broke it hides the break. Test: the pre-push hook refuses a branch that changes the policy file and one more file.
- **SOT-05 (R, proven).** A number in the policy file moves only in the safe direction with no deviation record. A longer release age, a shorter deadline, and a smaller allowlist are safe. The other direction must have a deviation. Cause: SEC Rule 15c3-5 keeps the controls in the exclusive control of the firm. A threshold that loosens when the deadline is near is not a control. Test: `pnpm security:policy` compares the new file with the file on `main`.
- **DOC-01 (M, proven).** Each rule line of this file names one layer. Cause: a rule with no layer is a rule with no owner. Test: `pnpm security:policy` refuses a rule line that it cannot parse.
- **DOC-02 (M, proven).** A citation of a rule in a tracked file names a rule of one of the three rule files. The three are this file, `docs/agents/accessibility.md`, and `docs/agents/resilience.md`. A citation is the word `Rule` and an identifier. Cause: a renumber makes a citation that sends the reader to no rule. Test: `pnpm security:policy` reads each tracked file and refuses a citation that names no rule.

## 2 Repository and branch

- **REPO-01 (M, proven).** No push goes to `main`. Each change goes through a branch and a pull request. Cause: a private repository on a free plan has no ruleset, so the hook is the ruleset. Test: `.githooks/pre-push` refuses a push with the target `main`.
- **REPO-02 (M, proven).** The agent merges only when the user writes the word "merge" in the same turn. The merge command is the one that `bulletproof-pr` gives. Cause: the two-person concept of nuclear surety. One person makes the change, and a different person lets it in. Test: a Claude Code hook refuses `gh pr merge` when a check on the pull request head failed. It also refuses when a check is not complete. The user reads the diff before the word.
- **REPO-03 (M, proven).** Each commit is signed. Cause: an impostor commit in a tag was the vector of the `tj-actions` and the Trivy compromises. Test: `commit.gpgsign` is on in the git configuration, and `.githooks/pre-push` runs `git verify-commit` on each new commit. The setup list of `README.md` holds the step that turns signing on.
- **REPO-04 (M, proven).** The repository does not hold a binary artifact. Cause: Scorecard `Binary-Artifacts`. A binary has no readable diff. Test: `pnpm security` lists each file with an extension of `repository.binary_extensions` and refuses one that is not in `repository.binary_allowlist`.
- **REPO-05 (A, proven, public only).** When the repository becomes public, turn on secret scanning, push protection, and private vulnerability reporting. Turn on immutable releases and a ruleset on `main`. Write `SECURITY.md` with the deadlines of `vulnerability.deadline_days`. Cause: these are free on a public repository and paid on a private one. Test: `gh api` in the weekly `Security` run, when the repository is public.

## 3 Dependencies

- **DEP-01 (M, proven).** A new dependency must have a record in `security/dependencies.yaml` before the install. The record has the name, the cause, the code that the project writes without it, the count of lines of that code, and the date. Cause: Dan McKinley's boring technology rule, and the Go proverb that prefers a small copy to a small dependency. Test: `pnpm security:deps` compares `package.json` with the records and refuses a dependency with no record.
- **DEP-02 (M, proven).** A dependency that replaces fewer lines than `dependency.min_lines_replaced` is not added. The project writes the code. Cause: each dependency is code that no one in the project read. Test: the record of DEP-01 holds the count.
- **DEP-03 (M, proven).** The install refuses a version that is younger than `dependency.minimum_release_age_days`. Cause: the axios, chalk, and Shai-Hulud compromises were live for hours to days. A cooldown of days makes the window close before the install. Test: `minimumReleaseAge` in `pnpm-workspace.yaml`, and `pnpm security:policy` compares it with the policy.
- **DEP-04 (M, proven).** Dependabot has the same cooldown as the install. Cause: an update bot that opens a pull request for a one-hour-old version undoes DEP-03. Test: `pnpm security:policy` compares `cooldown` in `.github/dependabot.yml` with `dependency.minimum_release_age_days`.
- **DEP-05 (M, proven).** Only the packages in `dependency.allow_builds` can run a lifecycle script. Each package in that list has a rationale in `security/dependencies.yaml`. Cause: Shai-Hulud spread through `postinstall`. Test: `strictDepBuilds` and `allowBuilds` in `pnpm-workspace.yaml`.
- **DEP-06 (M, proven).** A transitive dependency from a git URL or a tarball URL is refused. Cause: a URL is not a version, and no registry signs it. Test: `blockExoticSubdeps` in `pnpm-workspace.yaml`.
- **DEP-07 (M, proven).** A dependency that had provenance in one version and has none in the next version is refused. The same applies to a trusted publisher. Only the packages in `dependency.trust_policy_exclude` can stay. Each package in that list has a rationale in `security/dependencies.yaml`. Cause: a provenance that goes away is the first sign of an account takeover. Test: `trustPolicy: no-downgrade` and `trustPolicyExclude` in `pnpm-workspace.yaml`.
- **DEP-08 (M, proven).** The install uses only the registries in `dependency.registries_allowed`. Cause: a second registry is a second trust root. Test: `pnpm security:policy` reads the lockfile.
- **DEP-09 (M, proven).** CI installs with `--frozen-lockfile`. A pull request that changes the lockfile with no change in `package.json` is a dependency update and nothing else. Cause: the lockfile is the record of what runs. Test: the workflow, and `pnpm security:deps` on the diff.
- **DEP-10 (M, proven).** Each dependency has a license in `dependency.licenses_allowed`. Cause: a license that the list does not hold is a legal risk that no test finds after the merge. Test: `osv-scanner --licenses` with the list from the policy.
- **DEP-11 (M, proven).** No dependency in the lockfile has a known vulnerability in the OSV database. Only a dependency with an entry in `osv-scanner.toml` can stay. An entry has a reason that starts with its severity, and an `ignoreUntil` date. The date is not after the deadline in `vulnerability.deadline_days` for that severity. Cause: the minimum equipment list of aviation. A broken item flies only if it is on the list, with a repair deadline. Test: `osv-scanner` reads the file, and `pnpm security:policy` refuses an expired entry.
- **DEP-12 (R, proven).** A dependency with no release in `dependency.max_unmaintained_days` is replaced or removed. Cause: Scorecard `Maintained`. Test: `pnpm security:deps` reads the release date from the registry.
- **DEP-13 (R, proven).** A dependency with an OpenSSF Scorecard score less than `dependency.scorecard_min` is not added. Cause: the score is the one number that a third party calculates. Test: `pnpm security:deps` reads the score from the deps.dev API.
- **DEP-14 (M, proven).** A dependency is removed when its use is removed. A dependency with no import in `src/`, in `scripts/`, or in a configuration file is refused. Cause: dead code is attack area with no owner. Test: `knip`.
- **DEP-15 (A, proven).** A dependency is pinned to one version in `package.json`, with no range. The lockfile pins the transitive versions. Cause: a range is a promise that the author of the dependency keeps and not the project. Test: `pnpm security:deps` reads `package.json`.

## 4 Workflows

- **CI-01 (M, proven).** Each `uses:` line pins the action to a full commit SHA, with the version in a comment. Cause: the `tj-actions` compromise moved each tag to a malicious commit. Test: `pinact run --check`, and `zizmor` with the `unpinned-uses` audit.
- **CI-02 (M, proven).** Each workflow has `permissions: {}` at the top. A job gets the one permission that it must have, at the job level. Cause: Scorecard `Token-Permissions`. Test: `zizmor` with the `excessive-permissions` audit.
- **CI-03 (M, proven).** No workflow uses `pull_request_target` or `workflow_run` with a checkout of the pull request head. Cause: the nx compromise started with a `pull_request_target` injection. Test: `zizmor` with the `dangerous-triggers` audit.
- **CI-04 (M, proven).** No expression of the form `${{ github.event... }}` goes into a `run:` step. The value goes into an environment variable first. Cause: template injection. Test: `zizmor` with the `template-injection` audit.
- **CI-05 (M, proven).** Each job starts with `step-security/harden-runner` and `egress-policy: block`. The permitted endpoints are `actions.egress_allowed`. Cause: harden-runner caught the `tj-actions` and the Trivy compromises at the network. Test: `pnpm security:policy` reads each workflow, and `zizmor`.
- **CI-06 (M, proven).** Only the action owners in `actions.owners_allowed` are permitted. Cause: each action owner is a trust root. Test: `zizmor` with the `forbidden-uses` audit, with the list from the policy.
- **CI-07 (M, proven).** No long-lived secret exists in the repository settings. A deploy or a publish uses OIDC with `id-token: write`. Cause: a stolen long-lived token was the vector of the nx and the Shai-Hulud compromises. Test: `pnpm security:actions` refuses a workflow that reads a secret other than `GITHUB_TOKEN`.
- **CI-08 (M, proven).** `zizmor` runs with the persona `actions.zizmor_persona`. Each finding is a refusal. Cause: the pedantic persona finds the cache poisoning and the artifact leaks. Test: `zizmor --persona`.
- **CI-09 (M, proven).** `actionlint` passes with no finding. Cause: a workflow with a type error is a workflow that fails at the worst time. Test: `actionlint`.
- **CI-10 (M, proven).** The `Security` workflow runs on each pull request, on each push to `main`, and one time each week. The day is `schedule.weekly_day`. Cause: a vulnerability database changes without a commit. Test: the workflow triggers.
- **CI-11 (M, proven).** A scanner is a dependency. It obeys the rules of section 3. Its version is pinned. Cause: Trivy was compromised two times in 2026. Test: `pnpm security:deps`.

## 5 Source code

The shape of the code is the domain of `tiger-style`. These rules name the security sinks only.

- **CODE-01 (M, proven).** Input goes into the code in one place, through one parse function, and comes out as a typed value. No other place tests the shape of that input. Cause: langsec, and the rule "parse, do not validate". Two parsers of one format are one exploit. Test: `eslint` with the project rule that limits `JSON.parse`, `URLSearchParams`, and `fetch` responses to `src/shared/parse/`.
- **CODE-02 (M, proven).** The code does not use `eval`, `new Function`, `innerHTML`, `outerHTML`, `document.write`, or `insertAdjacentHTML`. Cause: each one is a script sink. Test: `eslint-plugin-no-unsanitized` and `eslint-plugin-security`. These two plugins are the static analysis of the project.
- **CODE-03 (M, proven).** `dangerouslySetInnerHTML` accepts only a value from the one sanitize function in `src/shared/sanitize/`. That function uses DOMPurify with a Trusted Types policy. Cause: React has one DOM sink, and this is it. Test: `eslint` with the project rule.
- **CODE-04 (R, proven).** When the project deploys, the page ships a Content Security Policy with a nonce and `strict-dynamic`, and `require-trusted-types-for 'script'`. Cause: OWASP ASVS chapter V3. Test: `pnpm security:code` reads the host configuration file and refuses a missing directive.
- **CODE-05 (M, proven).** The code does not use `any`, `unknown`, `@ts-ignore`, `@ts-expect-error`, or a non-null `!`. Only a parser in `src/shared/parse/` reads `unknown`, as its input. Cause: the Google TypeScript style guide. Each one is a hole in the type proof, and a parser is the one place that closes the hole. Test: `eslint` and `tsc --strict`.
- **CODE-06 (M, proven).** An illegal state has no type. A record of optional fields with invalid combinations becomes a union with one variant per state. Cause: Jane Street, make illegal states unrepresentable. Test: code review, and `@typescript-eslint/switch-exhaustiveness-check`.
- **CODE-07 (M, proven).** A feature flag is deleted with its dead branch in the same pull request that ends the feature. A flag name is not used a second time. Cause: Knight Capital paid 460 million dollars in 45 minutes. A new feature used a dead flag again. Test: `knip` finds the dead branch. The user reads the diff for the name.
- **CODE-08 (M, proven).** The build has no warnings. A warning is an error. Cause: Power of Ten rule 10. Test: `tsc` and `eslint` with `--max-warnings 0`.

## 6 Secrets

- **SEC-01 (M, proven).** No secret, token, key, or password is in a commit, in a file, in a log, or in a screenshot. Cause: a leaked secret is a never-event of section 11. Test: `gitleaks protect` in the pre-commit hook, and `gitleaks detect` on the full history in CI. On a private repository, `gitleaks` is the secret scanning.
- **SEC-02 (M, attested).** A secret that touched git is rotated the same day. A deleted commit is not a rotation. The history of a repository is copied in minutes. Cause: the tokens in the chalk compromise were live in hours. Test: the never-event record of section 11 names the rotation time.
- **SEC-03 (M, proven).** A local secret lives in a `.env` file that `.gitignore` lists. The pre-commit hook refuses a file with the name pattern `secrets.filename_patterns`. Cause: the file is the trap. Test: `gitleaks` and the hook.
- **SEC-04 (M, attested).** The agent does not print a secret in the chat, and does not paste one into a command. If a command must have a secret, the agent tells the user to run the command. Cause: the chat transcript is a log. Test: the user reads the chat.

## 7 Build and release

This section applies when the project ships an artifact or a deploy. A private repository on a free plan has no artifact attestation, so no rule has one.

- **REL-01 (R, proven).** Each release has an SBOM in the format `release.sbom_format`, made by `pnpm sbom`, as a release asset. Cause: the CISA 2026 minimum elements. Test: the release workflow.
- **REL-02 (M, proven).** The build is reproducible. The release workflow builds two times, in two clean directories, and compares the hash of `dist/`. A different hash is a refusal. Cause: a build that gives two outputs from one input has a hidden input. Test: the release workflow.
- **REL-03 (M, proven).** A published version does not change. A bad version gets a new version and a deprecation note. Cause: Semantic Versioning, and the npm registry refuses a re-publish. Test: the registry.
- **REL-04 (M, proven).** A publish uses trusted publishing with OIDC. No npm token exists. Cause: CI-07. Test: `zizmor` with the `use-trusted-publishing` audit.
- **REL-05 (M, proven).** A deploy goes to one target first, waits `release.bake_minutes`, and reads the alarms. Only then it goes to the rest. An alarm rolls the deploy back with no person in the loop. Cause: the AWS one-box deploy. Test: the deploy workflow.

## 8 Vulnerability response

- **VULN-01 (M, proven).** Each finding gets a severity S1 to S4, as `bulletproof-issue` rule B25b defines it. The severity gives the deadline from `vulnerability.deadline_days`. The clock starts at the finding. Cause: the MEL repair categories A, B, C, and D. Test: the weekly run lists each open finding and its age, and refuses one past its deadline.
- **VULN-02 (M, proven).** A finding with no fix before its deadline gets a `security` ticket, in the shape that `bulletproof-issue` gives. Cause: a finding with no ticket has no owner. Test: the weekly run compares the open findings with the open tickets.
- **VULN-03 (M, proven).** The one file that accepts a finding is `osv-scanner.toml`, the key `vulnerability.accept_file`. No other ignore file exists. Cause: two ignore files are two places to look. Test: `pnpm security:policy` refuses each of these files. `.trivyignore`, `.snyk`, `.grype.yaml`, `.gitleaksignore`, and `.semgrepignore`.
- **VULN-04 (M, proven).** An entry in the accept file has an `id`, an `ignoreUntil` date, and a `reason`. The reason starts with `S1`, `S2`, `S3`, or `S4`. Cause: the deviation record of MISRA. Test: `pnpm security:policy` reads the file.

## 9 Change control

The text of a pull request is the domain of `bulletproof-pr`. That skill already gives one problem per commit and the proof paragraph. These rules are the ones that it does not have.

- **CHG-01 (M, proven).** No regression. If a behavior worked for a user and a change breaks it, the fix is a revert, and the rethink comes after. Cause: the first rule of the Linux kernel. Test: a failed test on `main` is a revert in `change.revert_hours` or fewer.
- **CHG-02 (M, attested).** An API change is not atomic. The change adds the new API, moves each caller in small pull requests, then deletes the previous API. Cause: Titus Winters on non-atomic refactoring. Test: code review.
- **CHG-03 (M, attested).** The agent deletes a guard, a fence, or a test only after it names two things. The commit that added it, and the bug that it fixed. The cause paragraph of the pull request holds the two. Cause: Chesterton's fence. Test: the user reads the paragraph.
- **CHG-04 (M, attested).** The agent does not rewrite a file from scratch. Cause: the code in production has fixed bugs that no one remembers. Test: the user reads the diff.

## 10 Agent conduct

These are the human performance tools of the nuclear industry, applied to the agent.

- **HPT-01 (M, attested).** Before a command that deletes, rewrites, force pushes, or changes a setting, the agent does STAR. Stop. Think, and write the expected result. Act on the one target. Review, and compare the result with the expected result. The four lines go in the message. Cause: the DOE human performance handbook. Test: the user reads the message.
- **HPT-02 (M, attested).** A command that the user must run goes through a three-way repeat-back. The agent writes the command. The user pastes the output. The agent writes what the output shows. A command with no pasted output did not run. Cause: a message with no repeat-back was not sent. Test: the agent does not continue without the output.
- **HPT-03 (M, attested).** When a result is not the expected result, the agent stops. It puts the work in a safe state, and it puts the question to the user. It does not continue on an assumption. Cause: stop when unsure. Test: the message ends with a question.
- **HPT-04 (M, attested).** When two readings disagree, the agent acts on the worse one. A passing test and a failing test are a failing test. Cause: conservative decision making. Test: the user reads the message.
- **HPT-05 (M, attested).** Before a merge, the agent runs `pnpm security` and pastes its output in the chat. One `no-go` stops the merge. No answer is no-go. Cause: the launch status check. Test: the proof paragraph of the pull request holds the same output.
- **HPT-06 (M, attested).** During a deploy or a release, the agent does nothing else. No unrelated file, no unrelated question. Cause: the sterile flight deck rule. Test: the diff of the release pull request holds only the release.
- **HPT-07 (M, attested).** Any person stops the line. If the user or the agent sees a defect, the work stops, and the defect goes first. A stop is not a fault. Cause: the andon cord. Test: the count of stops is a health number, and a count of 0 is a problem.
- **HPT-08 (M, attested).** An alert with no owner and no action is deleted. Cause: Knight Capital got 97 emails before the open and no one acted. Test: each alert in the workflows names an owner and an action.
- **HPT-09 (M, attested).** The agent does not weaken a security measure to make a test pass, a build pass, or a task shorter. If a measure stops the task, the agent stops and reports the measure. Cause: a control that loosens when the deadline is near is not a control. Test: the user reads the message.

## 11 Incidents and never-events

A never-event is reportable regardless of the outcome. The list is `incident.never_events`. Each one opens an incident on the same day. The incident is a `bug` or a `security` ticket, in the shape that `bulletproof-issue` gives.

- **INC-01 (M, attested).** Each never-event and each production failure gets a postmortem in `incident.postmortem_days` or fewer. The postmortem is a file in `incident.postmortems`, with the name `YYYY-MM-DD-<slug>.md`. It has a timeline with timestamps, the impact in numbers, the five whys, and the action items with an owner and a date. It ends with two lines. How the team detected it. How the team must detect it the next time. Cause: the Amazon correction of error format. Test: the ticket closes with a link to the file.
- **INC-02 (M, attested).** A postmortem names no person. It names a cause. Cause: the Google blameless postmortem. Test: the user reads the file.
- **INC-03 (M, attested).** Each postmortem action item that changes a rule changes this file and `security/policy.yaml`. The rule gets a link to the postmortem. Cause: a flight rule has its rationale, so that the next crew knows why it exists. Test: the pull request that closes the ticket.
- **INC-04 (M, attested).** After a compromise of a dependency or of an action, each CI cache is cleared, and each secret is rotated. Cause: Shai-Hulud 2.0 lived in caches. Test: the postmortem holds the commands and their output.

## 12 Deviations

- **DEV-01 (M, proven).** A deviation record in `security/deviations.yaml` has six fields. The rule identifier, the rationale, the risk, the name of the user as approver, the date, and the expiry. Cause: MISRA Compliance:2020. Test: `pnpm security:policy` reads the file and refuses a record with a missing field or a past expiry.
- **DEV-02 (M, proven).** A mandatory rule has no deviation record. A record that names a mandatory rule is a refusal. Test: `pnpm security:policy`.
- **DEV-03 (M, proven).** A deviation that expires is a refusal on the next run. The cure is a fix or a new record with a new approval. Cause: an MEL item past its deadline grounds the aircraft. Test: `pnpm security:policy`.

## Sources

The source of each rule is in `docs/agents/sources.md`. Read that file before you change a rule, or when you must know if a cause stays correct.
