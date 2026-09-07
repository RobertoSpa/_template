---
name: testing
description: Rules for tests in this project. Use before you write a test, before you write the code that a test covers, and when you must give a module a dependency that talks to the network, the disk, the clock, or a database.
---

# Testing rules

The lint rules and the hooks refuse the mechanical errors. This file holds the
rules that no tool can test. Read it before the first test of a task.

## Three layers

The code has three layers.

- The logic layer holds pure functions. It imports no infrastructure.
- The infrastructure layer is `src/shared/infrastructure/`. Only this layer
  speaks to the network, the disk, the clock, a random number, or a database.
- The app layer connects the two. It builds the infrastructure and gives it to
  the logic.

A test of the logic layer uses no test double.

## Nullables, not mocks

A mock records how the code speaks to a collaborator. It does not record what
the code did. A mock is green after the real collaborator stops working. A
mock is also red after a refactor that changes no behavior. For these two
reasons this project uses no mock.

A fake is a second copy of the code. The copy and the real module move apart
with time. This project uses no fake.

A Nullable is the real module with a second factory. The stub sits at the
lowest point, at the client of the external service. All the lines above the stub
run for real in the test.

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

Each Nullable module must have one narrow test against the real service. Give that
test the name `<module>.integration.ts`. It runs in the `integration` project
and in a CI job of its own. Without that test, `createNull()` is a mock with
more steps.

## What a unit test must not do

1. A test must not fail after a refactor that changes no behavior.
2. A test must not stay green after the behavior is broken.
3. A test must not touch the network, the disk, the clock, a random number, or
   an environment variable.
4. A test must not send the reader to the source file to understand it.

Rule 3 has three guards. The lint rules refuse `Date.now`, `new Date()`,
`Math.random`, `process.env`, and an import of `node:fs`. `vitest.setup.ts`
stops a real socket and a real `fetch` at run time. The `integration` project
loads no setup file, because those tests must have the network.

## The public API

Test the public API. The public API is what the module exports. These are not
public.

- A private member, a `#` field, or a member marked `@internal`.
- A name that the module exports only for a test.
- The DOM structure of a component. The role, the label, and the visible text
  are the API of a component.

`createNull()` is public on purpose.

A unit is a unit of behavior, not a class. One test can run through five
classes. Call the code as the production code calls it. If you must
go around that point, the design is incorrect, and the rule is correct.

## Style

A test must be readable alone. The reader must not open a helper file.
Repetition in a test is correct.

- Write the table with `it.each`. Name the case in the title.
- Use a factory such as `createNull()` or a data builder. Write no nested
  setup helper.
- Write the assertion so that the test holds the value that you got and the
  value that you want.
- Test the correct data, the incorrect data, and the correct data that becomes
  incorrect. Test each limit and one step after it.

## The development loop

1. Write no production code before a test fails.
2. Write only sufficient test code to fail.
3. Write only sufficient production code to make the test green.

The hook `.claude/hooks/threeLawsGate.py` refuses a write to `src/` until a
test failed after the last write to `src/`.

A bug report is a failing test. Write the test that reproduces the bug, make sure that
it fails, and then correct the code. The test stays after the correction. Do
not delete it and do not make it more general.

## A green suite that lies

A mock is one cause of a false green suite. These are the others.

- A test with `it.skip` or `it.only`.
- A test with no assertion.
- A `try` block that turns a thrown error into a green test.
- A deleted test.
- An assertion of `toBeDefined()`, `toBeTruthy()`, or `not.toThrow()`. Name the
  value that you want.

The lint rules and `scripts/checkTestCount.ts` refuse the first four.

## The mutation score

Line coverage counts the lines that ran. It counts no assertion. Stryker
changes the code on purpose and counts the changes that a test finds. Run
`pnpm test:mutation`.

The stub of a Nullable has no behavior of its own, so a mutant in it is
noise. Mark the body of `createNull()` and the embedded stub with
`// Stryker disable next-line all`.

An equivalent mutant is a change that no test can find, because the behavior is
the same. A score of 100% is not reachable.

## Property tests are parked

A property test gives the code many generated inputs and asserts one invariant.
`fast-check` does this. Do not start it at this time.

Start it after a bug in a pure function goes around a table test. Then two rules
apply. Give `fast-check` a fixed seed. When a property test finds a case, add
that case as a usual example test.
