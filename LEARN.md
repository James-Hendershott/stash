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

## Chapter 1 — Understanding what's actually being asked

The most expensive bug is building the wrong thing. Stash's v1 was
designed for **a move** (origin house → destination house,
Keep/Sell/Donate/Trash). Five months later the real use was
**storage**: renting, unpacking into totes, a storage unit and garage
shelves. Same data, different product.

How that surfaced (BUILD_LOG ch. 25):

- **Describe what exists first, honestly** — screen by screen, from
  the code, not from memory. Gaps show up as broken *workflows*
  ("scan a tote → nothing happens"), not missing screens.
- **Ask about workflows and situations**, not screens: *Where are you
  in the move? What's the main phone job? Who uses it? How does a box
  live its life?*
- **Write it down where the user lives.** The spec went into the
  Obsidian vault (`stash-v2-spec.md`), not just chat — decisions
  survive the conversation.

## Chapter 3 — Architecture decisions and ADRs

Stash records decisions as short ADR-style entries (template in
Appendix B). Current ones, from the v2 design (BUILD_LOG ch. 25):

| ADR | Decision | Why | Rejected alternative |
|---|---|---|---|
| 001 | Container ID is a **plain number** (`12`) | 14/27-gal HDX totes share lids; an ID containing a color goes wrong when a lid swaps | `HDX27-12-Yellow`, `T27-0012` |
| 002 | Locations are a **tree** (`parentId`) | Unit › Rack 5 › Shelf 3 and Garage › Shelf 2 need different depths | Fixed `house` / `floor` / `room` columns |
| 003 | **One `Checkout` table** for items *and* containers | Containers are items; seasonal tote transfers and tool check-outs are the same shape | Separate transfer and checkout tables |
| 004 | **Additive migrations** for v2 | Old rows and the admin site keep working while the phone catches up | Big-bang schema rewrite |
| 005 | Labels go out through the **iPhone Share sheet** | Print (AirPrint), Mail, Files, Phomemo app — no SMTP, no Bluetooth native module | In-app email; direct Bluetooth printing (needs a custom native build) |
| 006 | Sold / Disposed = **hard delete** | User's choice; activity log keeps a one-line record | Soft-delete with history |
| 008 | Reference data ships as an **idempotent `.cjs` script** (`prisma/v2-reference-data.cjs`), shared by the seed; the seed **refuses to run on a populated DB** | Prod image has `node` but no `tsx`; re-runnable scripts are safe; the old seed wiped every table | Putting reference data in the seed (destructive) or in migration SQL (can't be re-run or edited easily) |
| 009 | Destructive data scripts are **dry-run by default** (`CONFIRM=yes` to act), abort on unexpected state, match deletions by id **and** name, and write an activity-log record | Deletes are irreversible without a restore. (Revised 2026-09-29: the prune became an *unpack* that keeps every item — BUILD_LOG ch. 29) | Interactive prompts (don't work over `docker exec`), or trusting a one-off SQL `DELETE` |
| 011 | Categories assigned **per item from a reviewed mapping file** (`v2-item-categories.json`), not per container | Per-tote rules mislabeled anything off-theme (*Bears vs Babies* ≠ RPG); a file is reviewable and re-runnable | Per-tote defaults; leaving it all to later manual edits |
| 010 | **Whereabouts resolved in memory** from per-request `Map`s of locations and containers | Constant 3 queries instead of N+1; both tables are small | Recursive SQL CTE per item; denormalizing a `path` column (goes stale on every move/rename) |
| 007 | **Spec + key docs mirrored** repo ↔ vault, with the sync rule written into both `CLAUDE.md` files | James plans in Obsidian; sessions code in the repo; both need the same truth | Single copy in one place (the other audience never sees it) |

## Chapter 4 — Designing the data model

The v2 model is one chain: **Item → Container → Location**. "Where is
it?" means following the chain; every feature (labels, check-out,
reminders) attaches to one link. Rules we followed:

- **Never encode mutable facts in identifiers** (ADR-001).
- **Prefer a catalog table over a growing enum** when users need to add
  values (`ContainerModel` instead of more `ContainerType` values) —
  enums need a migration per new value.
- **Self-relations for hierarchies** (`Location.parentId`,
  `Category.parentId`).
- **Index for the query you'll run most.** Duplicate detection will
  use `pg_trgm` trigram indexes instead of an O(n) scan per add.

// TODO when we have data: chapters 2 and 5.

---

# Part 2 — Writing the code

## Chapter 7 — Reading errors

Error messages are usually right about *what* failed and wrong about
*where*. Two real examples from this codebase:

**Example: "Cannot find module 'babel-preset-expo'"** (Chapter 23 in
BUILD_LOG)

The error said "package not installed." The package WAS installed —
at `packages/mobile/node_modules/babel-preset-expo`. The hint that
mattered was the **require stack**:

```
Require stack:
  - D:\Code\personal\stash\node_modules\@babel\core\lib\config\files\plugins.js
```

`@babel/core` was hoisted to the workspace root. From its location,
Node's hierarchical resolver walked up and never found the preset (it
lives a sibling-package down). The fix wasn't "install the package"
— it was "install it where the resolver actually looks."

**Lesson:** when an error says "X not found," check the **require
stack** to see WHERE the search is starting. Half the time it's a
location problem, not an existence problem.

**Example: `Invalid hook call. Cannot read property 'useContext' of null`**

Three bullet points in the error message:
1. Mismatched React + renderer versions
2. Breaking the Rules of Hooks
3. **More than one copy of React in the same app**

In a monorepo with hoisting, #3 is right ~99% of the time. The same
component file can resolve to React A on one render and React B on
the next, depending on which import path Metro chose. Fix is at the
bundler config level, not in your component code.

**Lesson:** when an error message lists multiple causes, the right
one is often the *least obvious* one. Frequency-of-occurrence in your
particular environment beats first-instinct.

## Chapter 8 — Debugging

Debugging in this codebase has had two shapes:

**Server-side:** add a `console.error('Unhandled error:', err)` to the
global Express handler (already there in `index.ts`), then `docker
logs --tail 30 stash-backend`. Real-world example: the books CSV
import returned `{"error":"Internal server error"}`; the docker logs
showed `Error: File type "application/octet-stream" not allowed.`
That pointed at the `uploadPhoto` middleware's image filter being
applied to a CSV upload. One-line fix.

**Client-side / build:** the iteration loop is `npx expo start --tunnel
--clear`, watch terminal, watch phone. Metro's `--clear` is the
"have you tried turning it off and on again" of the React Native
world: failed bundles get cached and replay forever until you wipe.

A pattern that's saved time: **add the error message itself to git
grep before fixing.** If the same error has hit before in this repo
or in a similar one (e.g., the open-source examples we cloned
patterns from), you've got a head start. Searching `"Invalid hook
call"` in our own BUILD_LOG.md found Chapter 23, which described the
exact fix for next time.

---

# Part 3 — Shipping it

## Chapter 12 — Containers, nginx, deployment

Stash deploys as three Docker containers: `stash-postgres`,
`stash-backend`, `stash-admin`. Compose orchestrates them on a
shared `shottsproxy` Docker network. Nginx Proxy Manager (a
fourth, pre-existing container on Unraid) terminates SSL and
proxies the public domains to container hostnames.

A handful of lessons that mattered:

**Match `@types/express` to your runtime Express major.** We
inherited `@types/express@5` while running `express@4`. The v5
typings widened `req.params[key]` from `string` to `string |
string[]`, generating ~30 unrelated TypeScript errors that
masqueraded as code bugs. Pinning the types to v4 + an `npm
overrides` block at the workspace root cleared all of them in one
move. (See BUILD_LOG ch. 21.)

**Match Postgres data path to direct NVMe on Unraid.** The user's
homelab docs were emphatic that database containers should never
write through Unraid's FUSE/shfs union layer (`/mnt/user/...`).
The original Stash setup pointed Postgres at exactly that. Fix
was a `POSTGRES_DATA_PATH` separate from `DATA_PATH`, with the
former pinned to `/mnt/cache/...` (cache pool, no FUSE). Saved
ourselves a Plex-style "70 seconds to render the home page"
disaster before the first byte was written. (Ch. 19.)

**Production builds need to actually build.** Stash's prod
Dockerfile had been written but never executed. When we tried,
five separate latent issues fell out: missing `composite: true` on
the shared TypeScript project, JSX not enabled on
`pdf.tsx`, the `@types/express` mismatch, a JWT expiresIn cast,
and `noImplicitAny` errors throughout. Lesson: a Dockerfile that
hasn't been run isn't a Dockerfile; it's a wish. Add a CI job
that runs the prod build per commit, even if you don't deploy.

**Nginx Proxy Manager forward port = container's INTERNAL port,
not the host port.** When the admin container is exposed as
`3002:80`, NPM should be configured with port `80`, not `3002`.
Got this wrong on first try and saw HTTP 502s from the proxy. The
user spotted the fix in a minute once the symptoms were laid out.
(Ch. 23-ish — happened during the iPhone-setup session.)

**Save the secrets to a real place.** JWT_SECRET, POSTGRES_PASSWORD,
seed user passwords — all generated server-side via `openssl rand`,
and immediately echoed once so they could be captured to the
obsidian vault's `shottsserver-logins-and-credentials.md`. They
don't exist anywhere else; if the vault entry is wrong, no
recovery path exists.

## Chapter 13 — Observability

Stash currently has no observability beyond `docker logs`. That's
deliberate for a personal-use app: the "alert" budget is "James
notices the page didn't load." But three small affordances were
worth adding:

- `GET /api/health` — single endpoint, returns `{status: 'ok',
  timestamp: ...}`. Used by docker compose's `healthcheck:` block.
- An ActivityLog table that records every CREATE/UPDATE on
  significant entities, with the user, before-value, and
  after-value. Doubles as both an audit trail and a debugging aid
  ("what happened just before the data went weird?").
- Per-row error reporting in CSV imports. Failing one row out of
  500 shouldn't abort the import; surfacing exactly *which* row +
  *why* tells the user where to look without spelunking logs.

If Stash were anything other than personal-use, the next things
to add would be: structured logs (pino), a Sentry-style error
tracker, and a per-route latency histogram. None of those are
needed today.

---

# Part 4 — The work that's actually about other humans

## Chapter 16 — Documenting for the right audience

Stash's docs have four audiences, each with a different entry point:

| Audience | Entry point | Needs |
|---|---|---|
| James, planning | Vault `stash.md` → `stash-v2-spec.md` | Direction, status, decisions |
| Savanah / phone users | `IPHONE-GUIDE.md`, `GUIDE.md` | Steps for features that exist *today* |
| James, learning | `BUILD_LOG.md`, `LEARN.md` | Why, alternatives, lessons |
| AI coding sessions | `CLAUDE.md` (repo and vault) | Direction + rules first, reference second |

Rules we follow (BUILD_LOG ch. 26):

- **Direction at the top of every entry point.** A reader who stops
  after one screen should still know what's being built now.
- **User guides describe what exists**, with banners for what's
  changing — not the future.
- **Back-burner, don't delete** docs for code that still runs.
- **Mirrors need a written sync rule** (ADR-007).

[Fill in chapters 14–17.]

---

# Part 5 — Codebase tour

## Chapter 18 — The data model

> **v2 update (Chapter 27):** the model is now centered on **Item → Container → Location**. `Location` is a tree (`parentId`, `kind` PLACE/AREA/SPOT, `shortCode`, `archivedAt`); `Category` has subcategories; `ContainerModel` is a catalog of tote types; `Container` gained `number` (the printed ID), colors, `status` (PACKING/STORED/AWAY), `locationId`, `labelStatus`; `Item` gained `status` (STORED/IN_USE/ARCHIVED), `locationId`, `upc`. New tables: `Checkout`, `Notification`, `Setting`. "Where is it?" is computed by `services/whereabouts.ts` (ADR-010). The v1 fields below (`fate`, `originLocationId`, ORIGIN/DESTINATION) still exist but are optional and back-burnered.

Stash's domain is *items*. Every meaningful thing is an Item: a sofa
is an Item, a tote that holds other items is an Item, a book is an
Item, a U-Box you packed at home is an Item. The thing that varies
between them is which **sidecar tables** they have:

```
Item ─┬─ (always) ─ category, originLocation, destinationLocation, etc.
      ├─ Container?       (1:1, only when Item.isContainer = true)
      ├─ BookDetails?     (1:1, only when Item is a book)
      └─ ItemPlacement[]  (history of which container the item lived in)
```

The sidecar pattern keeps the `items` table lean and uniformly
query-able. Adding a new specialization (say, `VehicleDetails` for
tracking VINs and plates) is a new sidecar — never a new column on
`items`.

**Container is also an Item.** This is the one design decision that
shapes everything. A U-Box has a fate (KEEP), a photo, a QR code, a
location — exactly like a sofa. It also has internal dimensions and a
type, which live in the Container sidecar. The `isContainer` flag on
Item is a hint, not the source of truth; the existence of a Container
row is.

**ItemPlacement is temporal.** When you take a book out of a tote,
you don't `DELETE FROM item_placements WHERE …`. You set
`removedAt = NOW()`. The history of where each item has lived is
queryable from this table. This matters for "I know that book was in
Tote #12 last month — when did it move?"

**Location is keyed by both house and floor.** Items have an origin
and an optional destination, so a single item can describe its full
journey: started in `Eagle Mountain, UT — Office`, will end up in
`NC Property — TBD — Primary Bedroom`. Querying "show me everything
that ends up in the new master bedroom" is a one-liner.

## Chapter 19 — The container code system

Every Container has a `label` of the form `{TYPE}-{NNNN}`:

```
T27-0012   HDX 27-Gal Tote, sequence 12
T35-0001   HDX 35-Gal Tote, first one
BXS-0001   Small Box (Pen+Gear), first one
UBX-0001   U-Haul U-Box, first one
CST-0003   Custom container, third one
```

The label is **unique** across the database (Postgres `UNIQUE`
constraint), **immutable** (QR codes encode it; the codes never
change after creation), and **auto-generated** by
`nextContainerCode(tx, type, preferredNumber?)`. Friendly text —
"Halloween box, red lid, taped corner" — lives on the associated
`Item.description`.

**Why two fields are wrong here.** First-pass design had
`Container.code` (the auto-gen) plus `Container.label` (the user's
pretty name). Two fields meant two questions on every UI screen, two
columns in every export, two strings per QR label. Collapsing to
`label = the code` and `Item.description = the friendly name` made
everything cleaner.

**The "honor the physical sharpie number" trick.** When a CSV row
says `Tote #12`, the import parses out `(TOTE_27GAL, 12)` and asks
the helper for code `T27-0012`. If that's free, it's assigned —
which is the common case in a clean DB. The user's physical tote
labels and the digital codes line up automatically. If `T27-0012`
were already taken, the helper falls through to next-available and
the import reports it as a warning. Either way, no manual
intervention.

## Chapter 20 — The mobile package's monorepo gotchas

The `packages/mobile` Expo project has three configuration files
that exist *only* because it's inside an npm-workspaces monorepo:

- **`metro.config.js`** — pins React + React Native to mobile's own
  copies via a custom `resolveRequest` (preventing duplicate React
  from the workspace root) and watches the workspace root so
  `@stash/shared` edits trigger reloads. **Hierarchical lookup stays
  ON** (`disableHierarchicalLookup: false`): SDK 57 nests
  `expo-modules-core` under `expo/node_modules`, which Metro can only
  find by walking up the tree (BUILD_LOG ch. 24). Without it: "Invalid hook call" + "Cannot read property
  'useContext' of null" at app launch. (See BUILD_LOG ch. 23.)
- **`index.js`** — explicit `registerRootComponent(App)`. Required
  in Expo SDK 50+; the older `"main": "App.tsx"` shortcut no longer
  registers the root.
- **`babel.config.js`** — references `babel-preset-expo`, which
  must be installed at the workspace **root** (not just in the
  mobile package's nested `node_modules`) because `@babel/core`
  hoists to root and resolves from there.

- **`@expo/ngrok` as a devDependency** — Expo's *global* package
  lookup fails on this Windows setup, so `--tunnel` loops on "install
  ngrok" unless it's installed locally.

**Expo Go and the SDK are coupled.** The App Store's Expo Go runs only
the newest SDK. Coming back after months away usually means
`npx expo install expo@^<latest>` + `npx expo install --fix` first.
Smoke-test without a phone: `npx expo export --platform ios`.

A standalone `expo init` project doesn't need any of these. They're
all monorepo tax. Documented in CHANGELOG v1.2.2 and BUILD_LOG ch.
23 so the next person doesn't rediscover.

---

# Appendix A: Glossary

| Term | Meaning |
|---|---|
| ADR | Architecture Decision Record. Markdown file documenting one decision, its context, alternatives, and consequences. |
| Expo Go SDK coupling | Expo Go only runs projects on its bundled (latest) SDK. |
| hierarchical lookup | Module resolution that walks up the directory tree checking each `node_modules/`. |
| pg_trgm | Postgres trigram extension for fuzzy text matching with an index. |
| self-relation | A foreign key from a table to itself; how trees are stored. |
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
