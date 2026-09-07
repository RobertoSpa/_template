---
name: penno
description: Penno's Axioms, the five test rules of this project. Use before you write a test, before you write the code that a test covers, and when a module needs a dependency that talks to the network, the disk, the clock, or a database.
---

# Penno's Axioms

Five rules. All the other test rules in this project come from one of them. Read
this file before the first test of a task.

The lint rules and the hooks refuse the mechanical errors. This file holds the
rules that no tool can measure.

## The five axioms

| # | Axiom | What enforces it |
| --- | --- | --- |
| 1 | A test asserts behavior and not structure. | ESLint `no-restricted-syntax` |
| 2 | Only infrastructure touches the world. It exports `create()` and `createNull()`. | `local/require-create-null`, the two `vitest.setup` files |
| 3 | A green test shows something, or it does not count. | `expect.requireAssertions`, the `vitest` plugin, Stryker |
| 4 | The failing test comes first. | `.claude/hooks/threeLawsGate.py` |
| 5 | A test is read alone. | No tool. You. |

Each section that follows holds one axiom.

## Axiom 1: a test asserts behavior and not structure

A mock records how the code speaks to a collaborator. It does not record what
the code did. A mock is green after the real collaborator stops working. A
mock is also red after a refactor that changes no behavior. For these two
reasons this project uses no mock.

A fake is a second copy of the code. The copy and the real module move apart
with time. This project uses no fake.

These four things are structure. A test must not assert them.

- A private member, a `#` field, or a member marked `@internal`.
- A name that the module exports only for a test.
- The DOM structure of a component. The role, the label, and the visible text
  are the API of a component.
- The order of the calls that a module makes to a collaborator.

Test the public API, which is what the module exports. `createNull()` is
public on purpose.

A unit is a unit of behavior, not a class. One test can run through five
classes. Call the code as the production code calls it. If you must go around
that point, the design is incorrect, and the axiom is correct.

The lint rules refuse `vi.mock`, `vi.spyOn`, `getByTestId`, and
`toMatchSnapshot` in a test file.

## Axiom 2: only infrastructure touches the world

The code has three layers.

- The logic layer holds pure functions. It imports no infrastructure.
- The infrastructure layer is `src/shared/infrastructure/`. Only this layer
  speaks to the network, the disk, the clock, a random number, or a database.
- The app layer connects the two. It builds the infrastructure and gives it to
  the logic.

A test of the logic layer uses no test double.

A Nullable is the real module with a second factory. The stub sits at the
lowest point, at the client of the external service. All the lines above the
stub run for real in the test.

Each module in `src/shared/infrastructure/` exports two names. The lint rule
`local/require-create-null` refuses the module that exports one name.

- `create()` builds the real thing.
- `createNull()` builds the same thing with the external client replaced.

### The six patterns

1. **Embedded stub.** The stub lives in the production file, next to the real
   client. It is small. It parses nothing and it selects nothing.
2. **Configurable responses.** You give `createNull()` the responses that the
   test must have. The test reads as data.
3. **Output tracking.** The module gives an event or a list of the calls that
   went out. The test asserts on that record, not on a mock.
4. **Behavior simulation.** The stub answers as the real service answers,
   and also the error answers.
5. **Thin wrappers.** The wrapper adds no logic of its own. Logic in a wrapper
   is logic that the stub hides.
6. **`Fake It Once You Make It`.** Write the stub after the real client works.
   The real client is the specification of the stub.

### One example

```ts
// src/shared/infrastructure/rateClient.ts
type Rates = Record<string, number>

const nullFetch = (responses: Rates) => async () => ({
	json: async () => responses,
})

export const create = () => build(globalThis.fetch)

export const createNull = (responses: Rates = {}) => build(nullFetch(responses))

const build = (get: typeof globalThis.fetch) => ({
	async rateOf(currency: string) {
		const answer = await get(`https://rates.example/${currency}`)
		const rates = (await answer.json()) as Rates

		return rates[currency] ?? 0
	},
})
```

`rateOf` runs for real in every test. Only `get` changes.

Each Nullable module must have one narrow test against the real service. Give
that test the name `<module>.integration.ts`. It runs in the `integration`
project and in a CI job of its own. Without that test, `createNull()` is a
mock with more steps.

Three guards hold this axiom. The lint rules refuse `Date.now`, `new Date()`,
`Math.random`, `process.env`, and an import of `node:fs`. `vitest.setup.ts`
stops a real socket and a real `fetch` at run time. The `integration` project
loads no setup file, because those tests must have the network.

## Axiom 3: a green test shows something, or it does not count

A mock is one cause of a false green suite. These are the others.

- A test with `it.skip` or `it.only`.
- A test with no assertion.
- A `try` block that turns a thrown error into a green test.
- A deleted test.
- An assertion of `toBeDefined()`, `toBeTruthy()`, or `not.toThrow()`. Name the
  value that you want.

The lint rules refuse `it.skip`, `it.only`, and an empty `catch` block.
`expect.requireAssertions` refuses a test with no assertion.
`vitest/no-conditional-expect` refuses an assertion in a `catch` block. No tool
finds a deleted test, and the diff shows it.

Line coverage counts the lines that ran. It counts no assertion. Stryker
changes the code on purpose and counts the changes that a test finds. Run
`pnpm test:mutation`.

The stub of a Nullable has no behavior of its own, so a mutant in it is
noise. Mark the body of `createNull()` and the embedded stub with
`// Stryker disable next-line all`.

An equivalent mutant is a change that no test can find, because the behavior
is the same. A score of 100% is not reachable.

## Axiom 4: the failing test comes first

1. Write no production code before a test fails.
2. Write only sufficient test code to fail.
3. Write only sufficient production code to make the test green.

The hook `.claude/hooks/threeLawsGate.py` refuses a write to `src/` until a
test failed after the last write to `src/`.

A bug report is a failing test. Write the test that reproduces the bug, make
sure that it fails, and then correct the code. The test stays after the
correction. Do not delete it and do not make it more general.

## Axiom 5: a test is read alone

No tool enforces this axiom. The reader must not open a helper file.
Repetition in a test is correct.

- Write the table with `it.each`. Name the case in the title.
- Use a factory such as `createNull()` or a data builder. Write no nested
  setup helper.
- Write the assertion so that the test holds the value that you got and the
  value that you want.
- Test the correct data, the incorrect data, and the correct data that becomes
  incorrect. Test each limit and one step after it.

## When two axioms disagree

Give each option a score on these four pillars.

1. Protection against regressions. The test goes red when the behavior breaks.
2. Resistance to refactoring. The test stays green when only the structure
   changes.
3. Fast feedback. The test runs in milliseconds.
4. Maintainability. One reader understands the test in one read.

Select the option that wins three of the four pillars.

## Property tests are parked

A property test gives the code many generated inputs and asserts one invariant.
`fast-check` does this. Do not start it at this time.

Start it after a bug in a pure function goes around a table test. Then two rules
apply. Give `fast-check` a fixed seed. When a property test finds a case, add
that case as a usual example test.

## Sources

Penno is the name of this ruleset. It is the name of this project and of no
book. The rules come from four places.

- Axioms 1 and 2, and the six patterns: James Shore, *Testing Without Mocks: A
  Pattern Language*.
- Axiom 1 and the four pillars: Vladimir Khorikov, *Unit Testing Principles,
  Practices, and Patterns*.
- Axiom 4: Robert C. Martin, the Three Laws of TDD.
- Axiom 5: *Software Engineering at Google*, chapter 11, DAMP and not DRY.
