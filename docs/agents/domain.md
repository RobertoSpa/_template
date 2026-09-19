# Domain docs

This file says how the engineering skills read the domain documentation of this repo before they examine the code.

## Read these files first

- `CONTEXT.md` at the repo root, or
- `CONTEXT-MAP.md` at the repo root, if it exists. It points at one `CONTEXT.md` for each context. Read each one that is related to the topic.
- `docs/adr/`. Read each ADR that touches the area of the task. In a repo with more than one context, also read `src/<context>/docs/adr/`.

If one of these files does not exist, continue with no message. Do not report the absence, and do not propose the file. The `/domain-modeling` skill makes the file when a term or a decision is resolved. The skills `/grill-with-docs` and `/improve-codebase-architecture` start it.

## File structure

A repo with one context, which is most repos:

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

A repo with more than one context has `CONTEXT-MAP.md` at the root:

```
/
├── CONTEXT-MAP.md
├── docs/adr/                          ← system-wide decisions
└── src/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/                  ← context-specific decisions
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

## Use the words of the glossary

When your output names a domain concept, use the term that `CONTEXT.md` gives. This applies to an issue title, a refactor proposal, a hypothesis, and a test name. Do not use a synonym that the glossary lists in its `_Avoid_` line.

If the concept is not in the glossary, one of two things is true. You invented a word that the project does not use, or the glossary has a gap. In the second case, write a note for `/domain-modeling`.

## Report an ADR conflict

If your output disagrees with an ADR, say so. Do not overrule the ADR with no message:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
