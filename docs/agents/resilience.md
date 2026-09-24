# Resilience pipeline

This file holds the rules of the resilience pipeline. The file `resilience/policy.yaml` holds each number, each list, and each path. A rule names a key of that file and not a value. If a rule and the policy file disagree, the policy file wins. Then correct the rule.

The other pipelines stop a defect before the merge and give the response after a failure. This pipeline holds a different part. It says what the software does while one part of it is broken. The rules come from the industries where one failure kills a person or costs millions. Aviation, nuclear power, space flight, medical devices, rail, and finance are the sources. The strictest programming communities give the error model. Go, Rust, Erlang, Elm, and Zig are the sources. The last section names each document.

Each source states one principle in its own words. Count each single part as a part that fails, and do not read its probability. Keep the failure in one region. Detect the failure. Go to a safe state that the failed part does not touch. Simulate the failure in a test, or count the failure as present.

## What this file does not own

- `docs/agents/security.md` owns the revert, the bake time, the postmortem, the deviation machinery, and the conduct of the agent.
- `docs/agents/accessibility.md` owns the class of a route, the error text that a form shows, and the key map of the boundary. The boundary lives in `src/shared/ui/`, and `a11y/patterns.yaml` holds no pattern for it at this time.
- `tiger-style` owns the assertions and the shape of the code.
- `penno` owns the tests and the shape of `src/shared/infrastructure/`.

If a rule here and one of these files disagree, the other file wins. Then correct the rule here.

## How to read a rule

The section "How to read a rule" of `docs/agents/security.md` gives the identifier, the category, the layer, the cause, and the test. The three categories are M, R, and A. The three layers are impossible, proven, and attested. A rule of this file uses the same names. That section also gives the rule that no answer is no-go.

## Three words

This file uses three words for three things, and it does not interchange them.

- An error is a value. It has the shape that `error.file` gives.
- A failure is an operation that did not give its result. A failure makes an error.
- A fault is a failure that a test makes on purpose.

## 1 Source of truth

- **RSOT-01 (M, proven).** Each number, each list, and each path of the pipeline lives in `resilience/policy.yaml`. Cause: two copies of a number become different. Test: `pnpm resilience:policy` reads each tool configuration and refuses a value that disagrees with the policy file.
- **RSOT-02 (M, proven).** The command `pnpm resilience` is the one entry point. It runs each gate in the sequence that `gates` gives. Cause: a gate that CI runs and the laptop does not is a gate that no person sees before the push. Test: the workflow file has one resilience step, and it is `pnpm resilience`. The pre-push hook runs only the gates `policy` and `routes`, because the gate `fault` starts a browser and runs for minutes. CI runs each gate.
- **RSOT-03 (M, proven).** A change to `resilience/policy.yaml` is its own pull request. It touches no other file. Cause: a limit that moves in the same commit as the code that broke it hides the break. Test: `.githooks/pre-push` refuses a branch that changes the policy file and one more file.
- **RSOT-04 (R, proven).** A number in the policy file moves only in the safe direction with no deviation record. A shorter timeout, fewer retries, and fewer resets are safe. The other direction must have a record. Cause: a control that loosens when the deadline is near is not a control. Test: `pnpm resilience:policy` compares the new file with the file on `origin/main`.

## 2 The error model

- **ERR-01 (M, proven).** Two classes of failure exist. An expected failure is a returned `Result`. A bug is a thrown `Error`, and no code below a boundary catches it. Cause: Duffy, the error model of Midori. A bug that becomes a recoverable error continues with a broken invariant. In `src/`, `assert` is `src/shared/lib/assert.ts`. In `scripts/`, it is `node:assert`. Test: `eslint` refuses a `throw` that is not `assert` and is not in a file of `error.throw_allowed_in`.
- **ERR-02 (M, impossible).** The type `Result` lives in `error.result_file`. It is `{ ok: true, value }` or `{ ok: false, error }`. No other shape of a result exists. Cause: Go, errors are values. Test: the type. A second shape does not compile against a caller that reads the first.
- **ERR-03 (M, impossible).** One error type exists, in `error.file`. Its field `code` is a closed union. A code does not get a new name, and no one removes a code. Cause: the Azure REST guidelines. A code is the contract, because the callers compare against it. Test: `pnpm resilience:policy` compares the codes with the codes on `origin/main` and refuses a missing code.
- **ERR-04 (M, proven).** Each code has one message for the user in `error.file`. The message has two sentences. The first names what failed, and the second is the action of the user. Cause: Therac-25 showed `MALFUNCTION 54`, and the operator continued. Test: `pnpm resilience:policy` refuses a code with no message and a message that is not two sentences.
- **ERR-05 (M, proven).** A caught value goes through the one parser in `error.parser`. That parser is the only place that reads the type `unknown`. No other code reads a caught value. Cause: rule CODE-05 of the security rules. A parser makes a named type from a hole. Test: `eslint` refuses a `catch` clause that does not start with a call of the parser.
- **ERR-06 (M, proven).** Each promise is awaited or returned. No promise floats. Cause: PEP 20, an error does not pass with no report. A floating promise makes a rejected result into nothing. Test: `no-floating-promises` with the option `ignoreVoid` set to false.
- **ERR-07 (M, proven).** The value of a `Result` is used. A call that returns a `Result` and drops it is a refusal. Cause: Go, do not discard an error. Zig makes it a compile error. Test: `eslint-rules/mustUseResult.js`.
- **ERR-08 (M, proven).** A code branches on `code`, and not on the text of a message. Cause: RFC 9457. A message changes, and a code does not. Test: `eslint` refuses a comparison against the field `message`.
- **ERR-09 (M, proven).** An asynchronous state is one union with the four members `idle`, `loading`, `failed`, and `done`. No component holds three flags for one request. Cause: Elm, errors are data. Three flags give eight states, and four of them are not possible. Test: `eslint` refuses a state variable with a name that ends with `Loading` or `Error`.

## 3 The boundary tree

- **BND-01 (M, proven).** The boundary tree has three levels. The root, each route, and each widget. The component of a route is the one file of `boundary.route_files` in its page folder, and it holds `<Boundary level="route">`. The component of a widget is a file of `boundary.widget_files`, and it holds `<Boundary level="widget">`. Cause: INSAG-10 gives levels of defense that do not depend on each other. When one level fails, the next level acts. Test: `eslint-rules/requireBoundary.js` refuses such a file with no boundary of its level, and `pnpm resilience:routes` refuses a page folder with no route component or with two.
- **BND-02 (M, proven).** One boundary component exists, in `boundary.file`. It resets only its own subtree. Cause: OTP, `one_for_one`. A supervisor restarts the child that died and no other child. Test: the unit test of the boundary.
- **BND-03 (M, proven).** A boundary lets its subtree reset `boundary.max_resets` times in one mount. Past that count, it throws to its parent, and the root renders the static fallback. Cause: OTP, `MaxR`. A child that dies in a loop is a parent problem. Test: the unit test of the boundary.
- **BND-04 (M, proven).** The root fallback is static markup in `index.html`. It has no script and no network call. Cause: NASA-HDBK-1002. The safe mode does not depend on the part that failed. Test: `pnpm resilience:fault` blocks each script and each request, then asserts the fallback text.
- **BND-05 (M, proven).** A `try` statement lives only in the files of `error.catch_allowed_in`. A component and a function of the logic layer have none. Cause: Armstrong, "let it crash" and "do not program defensively". Recovery is the job of one other process. Test: `eslint` refuses a `try` statement in a file that is not in that list.
- **BND-06 (M, proven).** A boundary reports each error one time, then renders the message of its code. It does not render the stack. Cause: RFC 9457 keeps the stack out of the interface. Test: the unit test of the boundary.

## 4 The network

- **NET-01 (M, proven).** Each call of `fetch` passes `AbortSignal.timeout(network.timeout_ms)`. Cause: AWS, a timeout on each remote call. A call with no timeout keeps a connection open until the user closes the tab. Test: `eslint-rules/requireFetchTimeout.js`.
- **NET-02 (M, proven).** One client exists, in `network.client`. Only that client retries. A retry uses exponential backoff with full jitter, at most `network.retry_max` times, and only for a method in `network.retry_methods`. Cause: SRE chapter 22, and the AWS retry storm of 243 times the load. Test: the unit test of the client, and `eslint` refuses the word `retry` in a file that is not the client.
- **NET-03 (M, proven).** The client gives each response body to a parser of `src/shared/parse/`. A body that the parser refuses is an error with the code `malformed`. Cause: NASA NPR 7150.2, integrity checks on each input. Test: the unit test of the client with a parser that refuses the body.
- **NET-04 (M, proven).** A degraded mode is simpler than the primary path. It calls no second backend. It hides the widget, or it keeps the last good data with the mark `stale`. Cause: AWS, the fallback that made a full outage from an outage of one widget. Ariane 5, keep the best-effort data. Test: `pnpm resilience:fault` asserts the core function of the route with each fault.
- **NET-05 (M, proven).** A request has a tier, `critical` or `sheddable`. When the retry budget of the tab is empty, the client drops each `sheddable` request first. Cause: SRE chapter 21, criticality. Test: the unit test of the client.

## 5 The safe state

- **SAFE-01 (M, proven).** Each route has a record in `routes.file` with its core text, its safe mode, and its dependencies. The core text is the visible text that proves the core function. A route is a folder of `src/pages/`. Cause: NASA NPR 7150.2 SWE-134. Software starts in a known safe state and returns to it. Test: `pnpm resilience:routes` compares the records with the folders of `src/pages/`.
- **SAFE-02 (M, proven).** The safe mode of a route is one of `routes.modes`, and it is not `normal`. A route with no record gets the mode `routes.default_mode` and each infrastructure module as a dependency. Cause: IEC 62304 gives the strictest class to software with no documented class. A record that is missing costs the project. Test: `pnpm resilience:routes`.
- **SAFE-03 (M, proven).** A flag or a permission that the code cannot read is off. This rule applies when `src/shared/infrastructure/flags.ts` exists. No flag reader exists at this time. Cause: 49 CFR 236.5, the closed-circuit principle. A signal with no power shows the most restrictive aspect. Test: the unit test of the flag reader with a `createNull()` that fails.
- **SAFE-04 (M, proven).** A route that rendered keeps its content when a refresh fails. A failed refresh clears no state that renders. Cause: AWS, a design that is stable with no action. The system keeps the work that it did before the dependency failed. Test: `pnpm resilience:fault` opens the route, makes a fault, presses the `refresh` control of the record, and asserts the core text.
- **SAFE-05 (M, attested).** An automatic action that the user cannot undo must have two signals that agree. It fires one time, and it does not fire in a loop. Cause: the 737 MAX, one sensor and a command that came again. Test: the user reads the diff.
- **SAFE-06 (M, attested).** A feature that writes to the world has a kill switch external to the bundle. When the switch is on, the feature refuses a new write and lets the user cancel. Cause: Knight Capital ¶42, no person knew when to disconnect. FIA 2024 §1.5. Test: the user reads the diff.

## 6 Detection

- **DET-01 (M, proven).** One reporter exists, in `detection.reporter`. The handler of `window.onerror`, the handler of `unhandledrejection`, and the boundary call it. No other code writes to the console. Cause: OpenBSD `style(9)`, use `err(3)` and do not roll your own. Test: `no-console`, and the unit test of the three handlers.
- **DET-02 (M, proven).** A report holds the fields of `detection.fields`. Cause: Ariane 5 recommendation R7, give more data to the telemetry on a failure. Test: the unit test of the reporter refuses a report with a missing field.
- **DET-03 (M, proven).** The reporter is infrastructure. Its `createNull()` records each report in memory, and a test reads that list. The real sink is the console until a telemetry endpoint exists, so the reporter has no integration test at this time. When the endpoint exists, write `report.integration.ts`. Cause: Therac-25, the audit trail is a design input. Test: `local/require-create-null`.

## 7 Fault injection

- **FIT-01 (M, proven).** `pnpm resilience:fault` makes each fault of `fault.cases` on each dependency of a route. Then it asserts the core function of the route. Cause: IEC 60601-1 §4.7 simulates each single fault condition. FAA AC 25.1309 counts each single failure as possible, and it does not read the probability. Test: `pnpm resilience:fault`.
- **FIT-02 (M, proven).** A dependency with no fault case is a failed dependency. When `src/pages/` has one page or more, each module of `src/shared/infrastructure/` is in one record or more. Cause: IEC 60601-1, a fault that nothing detects is present. Test: `pnpm resilience:routes` lists each module that no record names.
- **FIT-03 (M, proven).** The fault suite runs in CI on each pull request and in the weekly run. Cause: the principles of chaos engineering. An experiment that does not run continuously tests the past. Test: the workflow file.

## 8 Agent conduct

Section 10 of `docs/agents/security.md` holds the behavior of the agent. Its rule HPT-03 stops the work on a result that is not the expected result. Its rule HPT-09 refuses a weaker control near a deadline. Each one applies here with no change. These two rules are the ones that it does not have.

- **RACT-01 (M, attested).** The sign-in names the safe mode of each route that the task touches. Cause: NASA-HDBK-1002, the safing strategy names the safe mode before the flight. Test: the user reads the first message.
- **RACT-02 (M, attested).** The agent does not add a `catch` to make a test pass. If a test fails on a thrown error, the fix is a `Result` at the source of the error. Cause: rule HPT-09. A `catch` that hides a failure is a weaker control. Test: the user reads the diff.

## 9 Incidents and never-events

A never-event opens an incident on the same day, and the outcome does not change that. The list is `incident.never_events`. Section 11 of `docs/agents/security.md` holds the postmortem, its deadline, and its file name. Rule AINC-02 of `docs/agents/accessibility.md` adds a test for each defect that a user reports. Each one applies here with no change. Here that test is a fault case, a route record, or a code. This section adds no rule.

## 10 Deviations

Section 12 of `docs/agents/security.md` holds the deviation machinery. A mandatory rule has no record. An expired record is a refusal. Each one applies to `deviation.file` with no change. This rule is the one that it does not have.

- **RDEV-01 (M, proven).** A deviation from a rule of this file is a record in `deviation.file`. Rules DEV-01 to DEV-03 of `docs/agents/security.md` give its seven fields, its approval, and its expiry. The field `place` names one route. Cause: a resilience deviation holds for one route and not for the whole project. Test: `pnpm resilience:policy`.

## Sources

The section "The resilience rules" of `docs/agents/sources.md` names the document behind each cause.
