# LEARN.md — The Engineer's Companion to Stash

A teaching document for someone learning to think like a senior software
engineer, using this codebase as the running case study. Every chapter
references real decisions made while building the project — the wins,
the bugs, the things we almost did but talked ourselves out of.

> **Why this document exists.** Junior engineers often only see the
> finished code. The reasoning, the rejected alternatives, the bugs
> that shaped the design — those usually live only in the heads of
> the people who were there. This document tries to capture them.

> **Companion:** [`BUILD_LOG.md`](BUILD_LOG.md) is the chronological
> "what we did and when" — read both. They overlap a little; that's
> intentional.

---

## Table of contents

**Part 1 — The work that happens before any code**
1. Understanding what's actually being asked
2. Researching prior art
3. Architecture decisions and ADRs
4. Designing the data model
5. Building a backlog

**Part 2 — Writing the code**
6. Iteration: walking skeleton over perfect first try
7. Reading errors
8. Debugging
9. Refactoring without breaking things

**Part 3 — Shipping it**
10. Testing strategy
11. CI, type checking, linting
12. Containers, nginx, deployment
13. Observability

**Part 4 — The work that's actually about other humans**
14. Asking better questions of stakeholders
15. Reviewing code
16. Documenting for the right audience
17. Agile in practice

**Part 5 — Codebase tour**
18+. (Project-specific)

**Appendices**
- A. Glossary
- B. ADR template
- C. Recommended reading

---

# Part 1 — The work that happens before any code

[Fill in chapters 1–5 as the project develops, capturing real
decisions and reasoning.]

---

# Part 2 — Writing the code

[Fill in chapters 6–9.]

---

# Part 3 — Shipping it

[Fill in chapters 10–13.]

---

# Part 4 — The work that's actually about other humans

[Fill in chapters 14–17.]

---

# Part 5 — Codebase tour

[Project-specific reference. Add a chapter per major area of the
codebase — types, state, rendering, exports, etc.]

---

# Appendix A: Glossary

| Term | Meaning |
|---|---|
| ADR | Architecture Decision Record. Markdown file documenting one decision, its context, alternatives, and consequences. |
| Composable | A function (convention: `useX`) that encapsulates reactive logic in Vue 3 / Composition API. |

---

# Appendix B: ADR template

Copy into `docs/adr/NNN-title.md`:

```markdown
# ADR-NNN: [Decision title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXX

## Context
What's the situation that requires a decision?

## Decision
What did we decide to do?

## Consequences
What gets better? What gets worse? What new questions arise?

## Alternatives considered
Bulleted list with one-line reasoning for each.
```

---

# Appendix C: Recommended reading

- *A Philosophy of Software Design* — John Ousterhout
- *The Pragmatic Programmer* — Hunt & Thomas
- *Refactoring* — Martin Fowler
- *Effective TypeScript* — Dan Vanderkam (if using TS)
- *Staff Engineer* — Will Larson
- *No Silver Bullet* — Fred Brooks (free essay online)
