# Timing pipeline

This file holds the rules of the timing pipeline. The file `timing/policy.yaml` holds each number, each list, and each path. A rule names a key of that file and not a value. If a rule and the policy file disagree, the policy file wins. Then correct the rule.

The pipeline controls two times of a route. The time until the route paints its largest content, and the time from a press to the next paint. The bundle pipeline limits the bytes of a route, and a byte limit does not see a render that blocks the main thread. The definitions come from the Core Web Vitals of web.dev. The method of the lab run comes from Lighthouse CI, where the author of a page writes the interaction to measure.

## What this file does not own

- `docs/agents/security.md` owns the deviation machinery, the change control, and the conduct of the agent.
- `docs/agents/accessibility.md` owns the test of the words of each rule file. It also owns the layout shift of a route, Rule SIZE-08, and the answer to a keystroke, Rule MOT-08.
- `docs/agents/bundle.md` owns the list of the routes. Each route of `bundle/policy.yaml` has a record in this pipeline.
- `docs/agents/resilience.md` owns the core text of each route, which its fault suite asserts.
- `bulletproof-pr` owns the text of a commit message and a pull request. `bulletproof-issue` owns the text of an issue.
- `tiger-style` owns the shape of the code. `penno` owns the tests.

If a rule here and one of these files disagree, the other file wins. Then correct the rule here.

## How to read a rule

The section "How to read a rule" of `docs/agents/security.md` gives the identifier, the category, the layer, the cause, and the test. It also gives the rule that no answer is no-go. A rule of this file uses the same names.

## Four words

This file uses four words for four things, and it does not interchange them.

- LCP, the Largest Contentful Paint, is the time from the start of the navigation to the paint of the largest text or image. The unit is milliseconds.
- INP, the Interaction to Next Paint, is the time in milliseconds from a press to the next paint of the route. In a lab run, the slowest press is the INP.
- A lab run is a load of the production build in the Chromium of the end-to-end suite, with no real user.
- A sample is the LCP and the INP of one load. The gate compares the median of `lab.runs` samples with a limit.

## 1 Source of truth

- **TSOT-01 (M, proven).** Each number, each list, and each path of the pipeline lives in `timing/policy.yaml`. Each number is a positive integer. Cause: two copies of a number become different. Test: `pnpm timing:policy` refuses a number that is not a positive integer, and a path that names no file.
- **TSOT-02 (M, proven).** The command `pnpm timing` is the one entry point. It runs each gate in the sequence that `gates` gives, and `gates` holds `policy` and `lab`. CI runs this one command, with no `continue-on-error`. The pre-push hook runs only the gate `policy`, because the gate `lab` starts a browser. Cause: a gate that CI runs and the laptop does not is a gate that no person sees before the push. Test: `pnpm timing:policy` reads the workflow file. It has one timing step, and that step is `pnpm timing`.
- **TSOT-03 (R, proven).** A number of the policy file moves only in the safe direction with no deviation record. A smaller limit, more runs, a smaller interaction threshold, and fewer deviation days are safe. Cause: SEC Rule 15c3-5. A control that loosens near a deadline is not a control. Test: `pnpm timing:policy` compares the policy file with the file on `origin/main`.
- **TSOT-04 (M, proven).** A change to `timing/policy.yaml` is its own pull request. It touches no other file. A new route record goes in `routes.file`, so it can go with the page that it names. Cause: a limit that moves in the same commit as the code that broke it hides the break. Test: `.githooks/pre-push` refuses a branch that changes the policy file and one more file.

## 2 The lab run

- **LAB-01 (M, proven).** The suite `lab.suite` loads each route of `routes` `lab.runs` times, against the production build, in the Chromium of the end-to-end suite. Each load starts with an empty cache. The suite writes one sample per load to `lab.report`. The gate `lab` compares the median of the samples of each route with the limits. A suite that fails and a report that is missing are no-go. A route with fewer samples than `lab.runs`, and a route that paints content in some loads only, are no-go too. Cause: Power of Ten Rule 2. A limit that no tool can prove counts as violated. The median removes the noise of one slow load on the CI runner. Test: `pnpm timing:lab`.
- **LAB-02 (M, proven).** Each route of `bundle/policy.yaml` has one record in `routes.file`. The path of a record starts with `/`, and no path has two records. The branch that adds a page adds its record. Cause: a route with no record has no timing. Test: `pnpm timing:policy`.
- **LAB-03 (M, proven).** The suite makes one interaction on each load, after the paint. If the record has a `control`, the suite clicks the control with that visible text. If not, the suite presses the Tab key and clicks the body. Chrome reports an interaction of `lab.interaction_threshold_ms` or more, and the smallest value that Chrome accepts is 16. A load with no reported interaction has an INP of 0 ms. Cause: the user flows of Lighthouse CI. The author of the page names the press that is important. Test: `pnpm timing:policy` refuses a threshold below 16 and an empty `control`.

## 3 Limits

- **LCP-01 (R, proven).** The median LCP of a route is not more than `limits.lcp_ms`. A route that paints no content in each load has no LCP. The gate gives a note and no refusal for such a route, because the fault suite of `docs/agents/resilience.md` asserts the core text of each route. Cause: web.dev calls 2500 ms or less good. Test: `pnpm timing:lab`.
- **INP-01 (R, proven).** The median INP of a route is not more than `limits.inp_ms`. Cause: web.dev calls 200 ms or less good. Test: `pnpm timing:lab`.

## 4 Deviations

- **TDEV-01 (M, proven).** A deviation from a rule of this file is a record in `timing/deviations.yaml`. Rules DEV-01 to DEV-03 of `docs/agents/security.md` give its seven fields, its approval, and its expiry. The field `place` names one route, or one key of the policy file. Cause: GSFC-STD-1000 gives a waiver for the named elements only. Test: `pnpm timing:policy` refuses a record with a missing field, a pattern in `place`, a past expiry, or a mandatory rule.

## Sources

The section "The timing rules" of `docs/agents/sources.md` gives each source with its link.
