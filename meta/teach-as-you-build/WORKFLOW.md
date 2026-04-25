# WORKFLOW.md — Using teach-as-you-build in real projects

A wiki-style how-to. Pick the section that matches your project type
and follow the steps. Every command is real — paste it into your
terminal as written (substituting your project name where indicated).

---

## Table of contents

- [Quick reference card](#quick-reference-card)
- [Part A — Setup (do once)](#part-a--setup-do-once)
  - [A.1 Install the skill globally](#a1-install-the-skill-globally)
  - [A.2 Confirm the skill is registered](#a2-confirm-the-skill-is-registered)
- [Part B — Starting a brand-new project](#part-b--starting-a-brand-new-project)
  - [B.1 Universal pre-flight (any language)](#b1-universal-pre-flight-any-language)
  - [B.2 Activate teaching docs](#b2-activate-teaching-docs)
  - [B.3 Wire up auto-maintenance](#b3-wire-up-auto-maintenance)
- [Part C — Adding to an existing project](#part-c--adding-to-an-existing-project)
- [Part D — Per-language playbooks](#part-d--per-language-playbooks)
  - [D.1 JavaScript / TypeScript (Node, Vue, React, etc.)](#d1-javascript--typescript)
  - [D.2 Python (CLI, web, data, ML)](#d2-python)
  - [D.3 React Native + Expo (cross-platform mobile)](#d3-react-native--expo)
  - [D.4 Native iOS (Swift / SwiftUI)](#d4-native-ios-swift--swiftui)
  - [D.5 Native Android (Kotlin / Jetpack Compose)](#d5-native-android-kotlin--jetpack-compose)
  - [D.6 Go](#d6-go)
  - [D.7 Rust](#d7-rust)
- [Part E — IDE-specific tips](#part-e--ide-specific-tips)
  - [E.1 VS Code / Cursor / Windsurf](#e1-vs-code--cursor--windsurf)
  - [E.2 JetBrains IDEs (PyCharm, IntelliJ, WebStorm, Android Studio)](#e2-jetbrains-ides)
  - [E.3 Xcode](#e3-xcode)
  - [E.4 Standalone terminal](#e4-standalone-terminal)
- [Part F — The daily loop](#part-f--the-daily-loop)
- [Part G — Troubleshooting](#part-g--troubleshooting)
- [Part H — Deploy and actually use the project](#part-h--deploy-and-actually-use-the-project)
  - [H.1 The three "circles" of deployment](#h1-the-three-circles-of-deployment)
  - [H.2 Web app (Vue, React, Next, SvelteKit, FastAPI, Flask, Django)](#h2-web-app)
  - [H.3 CLI tool (Node, Python, Go, Rust)](#h3-cli-tool)
  - [H.4 Mobile app (Expo, native iOS, native Android)](#h4-mobile-app)
  - [H.5 Server / API](#h5-server--api)
  - [H.6 Databases — where your project's data lives](#h6-databases--where-your-projects-data-lives)
  - [H.7 Pointing a domain at your home server (Namecheap + NPM)](#h7-pointing-a-domain-at-your-home-server-namecheap--npm)
  - [H.8 "Just send them the source" — for any project](#h8-just-send-them-the-source--for-any-project)
  - [H.9 Pushing to GitHub the first time](#h9-pushing-to-github-the-first-time)

---

## Quick reference card

| Situation | What to type |
|---|---|
| Set up docs in a fresh project | `> /teach-as-you-build` (Claude Code prompt) |
| Append a chapter for what you just did | `> add a build-log chapter for what we just shipped` |
| Update the topical reference | `> add a section to LEARN.md about [topic]` |
| Backfill a chapter for an old commit | `> backfill BUILD_LOG for commit abc123` |
| Invoke the skill explicitly | `> /teach-as-you-build` |

The `>` represents the Claude Code prompt. You type after it.

---

# Part A — Setup (do once)

You only need to do this once per machine. After that, the skill is
available in every project.

## A.1 Install the skill globally

If you got the kit from this repo (LabelGen Pro), the skill is
already at `~/.claude/skills/teach-as-you-build/`. Skip to A.2.

Otherwise, copy the kit into your global Claude Code skills folder:

**macOS / Linux:**
```bash
mkdir -p ~/.claude/skills/teach-as-you-build/templates
cp meta/teach-as-you-build/SKILL.md ~/.claude/skills/teach-as-you-build/
cp meta/teach-as-you-build/BUILD_LOG.template.md ~/.claude/skills/teach-as-you-build/templates/
cp meta/teach-as-you-build/LEARN.template.md ~/.claude/skills/teach-as-you-build/templates/
```

**Windows (PowerShell):**
```powershell
$dst = "$HOME\.claude\skills\teach-as-you-build\templates"
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item meta\teach-as-you-build\SKILL.md "$HOME\.claude\skills\teach-as-you-build\"
Copy-Item meta\teach-as-you-build\BUILD_LOG.template.md $dst
Copy-Item meta\teach-as-you-build\LEARN.template.md $dst
```

**Windows (Git Bash / WSL):** use the macOS/Linux commands.

## A.2 Confirm the skill is registered

Open Claude Code in any folder:

```bash
cd ~
claude
```

Inside Claude Code, type:

```
/help
```

If you see `teach-as-you-build` listed (or you can call
`/teach-as-you-build` and Claude responds), you're set.

> 💡 If it doesn't appear, restart Claude Code (`/exit` then `claude`
> again) so it re-reads the skills folder.

---

# Part B — Starting a brand-new project

You have an empty folder and an idea. Here's the universal flow,
followed by language-specific deviations in [Part D](#part-d--per-language-playbooks).

## B.1 Universal pre-flight (any language)

```bash
mkdir my-cool-thing
cd my-cool-thing
git init
echo "# my-cool-thing" > README.md
git add README.md
git commit -m "chore: initial commit"
```

You're now in an initialised git repo with one file. **Initialise git
before doing anything else** — even before you've decided what to
build. The first commit captures "what I started with."

Then start Claude Code:

```bash
claude
```

## B.2 Activate teaching docs

In Claude Code, run:

```
> /teach-as-you-build
```

Claude will:

1. Notice `BUILD_LOG.md` and `LEARN.md` don't exist yet.
2. Copy them from the skill's templates into your project root.
3. Replace `[PROJECT NAME]` with your actual project name (it'll
   read from `package.json`, `pyproject.toml`, or just ask you).
4. Write Chapter 0 ("Before any code — understanding the ask")
   based on what you tell it the project is for.

To make Chapter 0 useful, **answer Claude when it asks**:

- Who's the user?
- What's the success criterion?
- What's explicitly out of scope?
- Is there a reference project / prior art?

Those answers become the spine of every decision after.

## B.3 Wire up auto-maintenance

This is the magic step that makes Claude proactively update the docs
as you work, instead of you having to ask every time.

Create or open `CLAUDE.md` in your project root and paste:

```markdown
## Teaching docs

This project maintains two companion documents for learning purposes:

- **`BUILD_LOG.md`** — chronological build journal. One chapter per
  version, walking through what was built, decisions made, bugs hit,
  and lessons learned.
- **`LEARN.md`** — topical engineering reference.

**Always update both** whenever:
- A feature lands → append a BUILD_LOG chapter.
- A bug is fixed → append a debugging-walkthrough chapter.
- An architectural decision is made → add an ADR-style entry to LEARN.md.

**Voice:** conversational, peer-to-peer. Real examples from this
codebase, not invented hypotheticals. For every notable decision,
name the alternatives we *didn't* take and why. Include Big-O for
non-trivial algorithms. Plain English first, code blocks second.
```

(This is identical to `meta/teach-as-you-build/CLAUDE.md.snippet`. You
can also just copy that file's contents.)

Now Claude reads `CLAUDE.md` on every conversation startup and follows
the rules without being told.

> ✅ **You're done with setup.** Skip to your language section below.

---

# Part C — Adding to an existing project

Same idea, slightly different first step. In your existing project's
root:

```bash
cd /path/to/existing-project
claude
```

Then:

```
> /teach-as-you-build
> Backfill BUILD_LOG.md based on the existing git history. Use git log to
  identify the major commits and write a chapter for each meaningful one.
```

Claude will:
1. Run `git log` to see what's already happened.
2. Group commits into logical "version" chapters.
3. Write Chapter 0 (the project's intent, derived from README +
   git history).
4. Write a chapter per major commit / feature / fix it can identify.

The backfill will be best-effort — older commits may have less context
than recent ones. Give Claude any extra context you can recall as
it works.

After backfill, paste the `CLAUDE.md` snippet from B.3 to enable
ongoing auto-maintenance.

---

# Part D — Per-language playbooks

Each playbook covers:
- **Project skeleton** (the standard initialisation commands)
- **What to put in `CLAUDE.md`** beyond the universal teaching-docs section
- **Language-specific things the BUILD_LOG should call out**
- **A typical Chapter 0 starter** for that ecosystem

## D.1 JavaScript / TypeScript

For: web frontends (Vue, React, Svelte, plain), Node CLI tools, Node servers, Electron apps.

### Project skeleton

**Vue + Vite + TS** (like LabelGen Pro):
```bash
npm create vue@latest my-app
cd my-app
npm install
git init
git add . && git commit -m "chore: scaffold Vue + Vite + TS"
claude
> /teach-as-you-build
```

**React + Vite + TS:**
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app && npm install && git init
git add . && git commit -m "chore: scaffold React + Vite + TS"
claude
> /teach-as-you-build
```

**Plain Node TS CLI:**
```bash
mkdir my-cli && cd my-cli
npm init -y
npm install -D typescript @types/node tsx
npx tsc --init
git init
git add . && git commit -m "chore: scaffold Node TS"
claude
> /teach-as-you-build
```

### Add to `CLAUDE.md`

In addition to the universal teaching-docs section:

```markdown
## Stack

- Runtime: Node 22
- Language: TypeScript (strict mode)
- Package manager: npm
- Build: Vite (or your build tool)

## Conventions

- All source under `src/`
- Tests under `src/**/*.test.ts` (Vitest)
- Format: Prettier + ESLint (when added)
```

### What BUILD_LOG should call out for JS/TS projects

- **Type errors as bugs.** Strict-mode TS catches things at compile
  time that other languages catch at runtime. Each TS error fix is a
  bug story worth a paragraph.
- **Bundle size deltas.** When you add a dependency, mention what it
  cost in KB — and the alternatives you didn't choose.
- **Hydration / reactivity gotchas.** SSR mismatches in Next/Nuxt;
  Vue's same-component provide/inject limitation; React's stale
  closure trap. These are all worth chapters.

### Chapter 0 starter

```markdown
# Chapter 0 — Before any code

## The ask
[What you're building, in plain language]

## The stack and why
- Vue 3 + TypeScript + Vite — chose this because [reason: ecosystem,
  team familiarity, bundle size, etc.]
- No state management library yet — single piece of state, will reach
  for Pinia only if it grows.
- No CSS framework — plain CSS with custom properties.

## The reference
[Did you find an existing tool that does ~80% of what you want?
Link it. Read its source. Note what you'll keep and what you'll
change.]
```

---

## D.2 Python

For: CLI tools, web APIs (FastAPI, Flask, Django), data science notebooks, ML training scripts, automation scripts.

### Project skeleton

**Modern (recommended) — `uv` for dep management:**
```bash
mkdir my-py-thing && cd my-py-thing
uv init
uv add --dev pytest ruff mypy
git init
git add . && git commit -m "chore: scaffold Python with uv"
claude
> /teach-as-you-build
```

**Traditional — venv + pip:**
```bash
mkdir my-py-thing && cd my-py-thing
python -m venv .venv
source .venv/bin/activate          # macOS/Linux
.venv\Scripts\activate             # Windows
echo "pytest" > requirements-dev.txt
pip install -r requirements-dev.txt
pip freeze > requirements.txt
git init
echo ".venv/" >> .gitignore
git add . && git commit -m "chore: scaffold Python venv"
claude
> /teach-as-you-build
```

### Project layout most pythonistas expect

```
my-py-thing/
├── pyproject.toml         # project metadata + deps (with uv/poetry)
├── README.md
├── BUILD_LOG.md           # ← teach-as-you-build adds these
├── LEARN.md
├── CLAUDE.md
├── src/
│   └── my_py_thing/
│       ├── __init__.py
│       └── core.py
└── tests/
    └── test_core.py
```

### Add to `CLAUDE.md`

```markdown
## Stack

- Python 3.12+
- Package manager: uv (or pip + venv)
- Type checker: mypy
- Linter / formatter: ruff
- Tests: pytest

## Conventions

- Source layout: `src/<package>/`
- Tests in `tests/`, mirror the source layout
- All public functions get type hints; mypy in strict mode
- Run `pytest` before every commit; CI enforces
```

### What BUILD_LOG should call out for Python projects

- **Virtual env quirks.** Activation is the #1 source of "it works on
  my machine." Note venv setup in Chapter 0.
- **Async / sync boundaries.** Mixing `asyncio` and sync code is a
  classic bug source. Worth a chapter when you hit it.
- **Dependency conflicts.** "We pinned `pydantic==2.x` because v1
  broke our schema serialization in [way]" is exactly the kind of
  archeological note that saves future-you weeks.
- **Type-hint coverage.** mypy errors that took you a while to
  understand → BUILD_LOG-worthy.

### Chapter 0 starter

```markdown
# Chapter 0 — Before any code

## The ask
[Plain language]

## The stack and why
- Python 3.12 — chose because [reason: existing knowledge, library
  ecosystem for the domain, performance characteristics, etc.]
- uv for deps — fast, reproducible, replaces both pip and venv
  management with one tool.
- mypy strict — catches type bugs before runtime, similar to TS.
- pytest — de facto standard.

## The data model
[Sketch the main domain types as Python dataclasses or Pydantic
models — the "shape" of the thing you're building.]
```

---

## D.3 React Native + Expo

For: iOS + Android apps from a single TypeScript codebase.

### Project skeleton

```bash
npx create-expo-app@latest my-app
cd my-app
git init
git add . && git commit -m "chore: scaffold Expo app"
claude
> /teach-as-you-build
```

That's it. Expo handles the iOS/Android bootstrapping for you.

### Add to `CLAUDE.md`

```markdown
## Stack

- Expo SDK 52+
- React Native + TypeScript
- Navigation: expo-router (file-based)
- State: Zustand (if needed)
- Styling: NativeWind or StyleSheet (decide early)

## Targets

- iOS 15+ (iPhone, iPad)
- Android 7.0+ (API 24+)

## Build system

- Local dev: `npx expo start` → scan QR with Expo Go on your phone
- Native preview builds: `npx expo run:ios` / `npx expo run:android`
- Production: EAS Build (`npx eas build`)

## Platform-specific code

Use the `Platform.OS === 'ios'` check or `.ios.tsx` / `.android.tsx`
file suffixes when behaviour must differ. Document the divergence in
BUILD_LOG when it happens.
```

### Day-to-day commands

```bash
npx expo start              # dev server, opens dev tools
                            # press 'i' for iOS sim, 'a' for Android emulator
                            # or scan the QR with Expo Go on a real device

npx expo install <pkg>      # adds a dep with the right version for your SDK
npx expo run:ios            # native iOS build (for native modules)
npx expo run:android        # native Android build
```

### What BUILD_LOG should call out for Expo projects

- **Cross-platform bugs.** "Worked on iOS but Android did X." These
  are the most valuable bug stories because they're invisible until
  you actually test on both. Always include the *why* (the platform
  difference that caused it).
- **Native module additions.** Adding `react-native-something-with-native-code`
  forces a "dev client" build. Worth a chapter on what changed.
- **EAS Build configuration.** Each platform has its own quirks
  (provisioning profiles, signing keys). Document each step.
- **Expo SDK upgrades.** Major-version upgrades sometimes require
  migration notes. Capture them.

### Chapter 0 starter

```markdown
# Chapter 0 — Before any code

## The ask
[What the app does in plain language. Who's the user? Free/paid?]

## Why Expo (not bare React Native)
- Faster setup, no Xcode/Android Studio dance to start
- OTA updates for free
- EAS Build handles the signing/upload complexity
- Trade-off: some native modules need a dev client build, slightly
  larger binary, slightly more locked into Expo's release cadence

## Targets
- iOS [versions]
- Android [API levels]
- Phone-only or tablet-aware?
- Offline-capable or always-online?

## State + persistence
- [Zustand for app state, AsyncStorage for persistence, etc.]
```

---

## D.4 Native iOS (Swift / SwiftUI)

For: when you need iOS-only, deep platform integration (HealthKit,
Metal, etc.), or want native performance.

### Project skeleton

```bash
mkdir MyApp && cd MyApp
git init
# Create the Xcode project via Xcode: File → New → Project →
# iOS → App → SwiftUI + Swift
# Save the project inside this folder.
git add . && git commit -m "chore: scaffold Xcode project"
claude
> /teach-as-you-build
```

> 📝 Xcode doesn't have a CLI for creating projects from scratch
> (other than `xcodegen`). It's a one-click GUI step.

### Project layout (Xcode default)

```
MyApp/
├── MyApp.xcodeproj/        # Xcode project metadata (don't hand-edit)
├── MyApp/
│   ├── MyAppApp.swift      # @main entry point
│   ├── ContentView.swift   # root view
│   ├── Assets.xcassets/    # images, colours
│   └── Info.plist          # app metadata, permissions
├── MyAppTests/             # unit tests
├── MyAppUITests/           # UI tests
├── BUILD_LOG.md            # ← teach-as-you-build adds these
├── LEARN.md
└── CLAUDE.md
```

### Add to `CLAUDE.md`

```markdown
## Stack

- Swift 5.10+
- SwiftUI for views, UIKit only when necessary
- Combine for reactive flows (or async/await)
- iOS 16+ deployment target

## Conventions

- One view per file, named after the view type
- Models in `Models/`, ViewModels in `ViewModels/`,
  Views in `Views/`, Services in `Services/`
- Async/await preferred over completion handlers in new code
- Tests via XCTest

## Build and run

- ⌘B in Xcode to build
- ⌘R to build + run on the selected target
- ⌘U to run tests
- Selected target = simulator or connected device
```

### Day-to-day commands

Most work happens in the Xcode UI. From the command line:

```bash
# Build (CI-friendly):
xcodebuild -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15' build

# Test:
xcodebuild -scheme MyApp -destination 'platform=iOS Simulator,name=iPhone 15' test

# Open in Xcode (handy from terminal):
open MyApp.xcodeproj
```

Claude Code can read/write Swift files directly — but for the project
build step, you usually run Xcode yourself.

### What BUILD_LOG should call out for iOS projects

- **Memory cycles.** Strong reference cycles between view controllers /
  closures are an iOS classic. Worth a chapter when you hit one.
- **Concurrency.** `@MainActor`, structured concurrency, actors —
  Swift's concurrency model has subtleties.
- **Provisioning + signing.** "I had to add the [capability] in the
  Signing & Capabilities tab." Future-you will thank you.
- **Deprecation warnings.** iOS APIs deprecate often. Each migration
  is a small chapter.

### Chapter 0 starter

```markdown
# Chapter 0 — Before any code

## The ask
[App name, what it does, who uses it]

## Why native iOS (vs Expo / Flutter)
- Need [HealthKit / WidgetKit / Live Activities / specific iOS-only API]
- Want App Store-quality UX with no compromises
- Team has Swift / iOS expertise
- Trade-off: no Android, more code per feature, slower iteration than RN

## Targets
- iOS 16+ — chose because [...]
- iPhone only / iPad too?
- macOS Catalyst?

## Architecture
- MVVM with SwiftUI + Combine, or
- TCA (The Composable Architecture), or
- Vanilla SwiftUI with @Observable
[State which and why]
```

---

## D.5 Native Android (Kotlin / Jetpack Compose)

For: when you need Android-only, deep platform integration, or want
native performance.

### Project skeleton

```bash
mkdir MyApp && cd MyApp
git init
# Create the project via Android Studio:
# File → New → New Project → Empty Activity → Kotlin
# Save inside this folder.
git add . && git commit -m "chore: scaffold Android project"
claude
> /teach-as-you-build
```

### Project layout (Android Studio default)

```
MyApp/
├── app/                       # main application module
│   ├── src/main/
│   │   ├── java/com/example/  # Kotlin source
│   │   ├── res/               # layouts, drawables, strings
│   │   └── AndroidManifest.xml
│   ├── build.gradle.kts       # module build config
│   └── proguard-rules.pro
├── build.gradle.kts           # project build config
├── gradle/
├── settings.gradle.kts
├── BUILD_LOG.md               # ← teach-as-you-build adds these
├── LEARN.md
└── CLAUDE.md
```

### Add to `CLAUDE.md`

```markdown
## Stack

- Kotlin 2.0+
- Jetpack Compose for UI
- Hilt for dependency injection
- Coroutines + Flow for async
- minSdk 24 (Android 7.0+), targetSdk 34

## Conventions

- Single-activity architecture
- Composables in `ui/`, view models in `viewmodel/`,
  data layer in `data/`, domain in `domain/`
- One composable per file when complex; small composables can share
- Tests: JUnit 4 (unit), Espresso (UI), Compose UI tests

## Build and run

- ⌃R (Mac) / ⇧F10 (Win/Linux) in Android Studio to build + run
- Pick AVD (Android Virtual Device) or connected device from the
  device dropdown
- ./gradlew test for unit tests
- ./gradlew connectedAndroidTest for instrumented tests
```

### Day-to-day commands

```bash
# From the project root:
./gradlew build                       # full build
./gradlew assembleDebug               # debug APK
./gradlew installDebug                # install on connected device
./gradlew test                        # unit tests
./gradlew connectedAndroidTest        # instrumented tests on device

# List connected devices/emulators:
adb devices

# Open in Android Studio:
studio .                              # if studio CLI is on PATH
```

### What BUILD_LOG should call out for Android projects

- **Configuration changes** (rotation, dark mode). Activity recreation
  is a perennial gotcha source.
- **Background work limits.** Doze mode, JobScheduler, WorkManager
  — Android's battery rules change between versions.
- **Permissions.** Runtime permissions are stateful and version-
  dependent. Each capability you add gets a chapter.
- **Compose performance.** Recomposition surprises. Worth a chapter
  the first time `Stable`/`Immutable` annotations bite.

### Chapter 0 starter

```markdown
# Chapter 0 — Before any code

## The ask
[App name, what it does, who uses it]

## Why native Android (vs Expo / Flutter)
- Need [BLE / NFC / Foreground Services / specific Android API]
- Want best-in-class Material Design integration
- Team has Kotlin expertise
- Trade-off: no iOS without separate Swift codebase

## Targets
- minSdk 24 (Android 7.0) — covers ~99% of active devices
- targetSdk 34 — required by Play Store for new submissions
- Phone, tablet, foldable? Wear OS / Auto?

## Architecture
- Single Activity + Compose
- ViewModel + StateFlow for state
- Hilt for DI, or Koin?
- Repository pattern for data
```

---

## D.6 Go

```bash
mkdir my-go-thing && cd my-go-thing
go mod init github.com/you/my-go-thing
git init
echo 'package main; import "fmt"; func main() { fmt.Println("hi") }' > main.go
go fmt ./...
git add . && git commit -m "chore: scaffold Go module"
claude
> /teach-as-you-build
```

`CLAUDE.md` additions:

```markdown
## Stack
- Go 1.22+
- stdlib-first; deps only when stdlib doesn't cut it
- Tests: built-in `testing` + table tests

## Conventions
- One package per directory
- `cmd/<binary>/main.go` for executables
- `internal/` for non-public packages
- Run `go fmt ./... && go vet ./... && go test ./...` before every commit
```

What BUILD_LOG should call out: error-handling decisions (wrapped
errors, sentinel errors, custom types), goroutine lifetime / context
plumbing, generics tradeoffs.

---

## D.7 Rust

```bash
cargo new --bin my-rust-thing
cd my-rust-thing
git init
git add . && git commit -m "chore: scaffold Rust binary"
claude
> /teach-as-you-build
```

`CLAUDE.md` additions:

```markdown
## Stack
- Rust 2024 edition
- async runtime: tokio (or none if sync-only)
- Tests: built-in #[test] + integration tests in tests/

## Conventions
- `cargo fmt && cargo clippy && cargo test` before every commit
- Public APIs documented with `///` doc comments + `cargo doc` examples
- Prefer Result + thiserror over panicking
```

What BUILD_LOG should call out: lifetime / borrow-checker fights and
how you resolved them, async/sync interop, unsafe blocks (rare and
always with justification).

---

# Part E — IDE-specific tips

## E.1 VS Code / Cursor / Windsurf

**Open the project:**
```bash
code .              # VS Code
cursor .            # Cursor
windsurf .          # Windsurf
```

**Open the integrated terminal:** `` Ctrl+` `` (backtick).

**Start Claude Code in the terminal:**
```bash
claude
```

**Useful Claude Code commands inside the prompt:**

| Command | What it does |
|---|---|
| `/teach-as-you-build` | Activate the doc-maintenance skill |
| `/init` | Generate a `CLAUDE.md` for the current project |
| `/help` | Show all available commands and skills |
| `/clear` | Clear the conversation context |
| `/exit` | Close Claude Code |

**Keep both panels open:** Source files in the editor, terminal at the
bottom with Claude Code running. As Claude edits files, you see the
diffs in your editor's gutter. As you click around the codebase to
understand, Claude can read the same files.

**File-explorer note:** when Claude creates `BUILD_LOG.md` and
`LEARN.md`, they'll appear in your Explorer pane (left sidebar) at
the project root. Pin them open in the editor while you work.

## E.2 JetBrains IDEs

(PyCharm, IntelliJ, WebStorm, GoLand, RustRover, Android Studio)

**Open the integrated terminal:** `Alt+F12` (Win/Linux), `⌥F12` (Mac).

**Start Claude Code:** `claude` in the terminal panel.

**Markdown preview:** these IDEs render Markdown beautifully. After
Claude updates `BUILD_LOG.md`, hit the preview icon (top-right of the
editor tab) to see the formatted version.

**Project Tool Window:** look for `BUILD_LOG.md`, `LEARN.md`,
`CLAUDE.md` at the root in the Project view. Pin them.

## E.3 Xcode

Xcode doesn't have an integrated terminal you can launch Claude Code
in directly. Two workflows:

1. **Run Claude Code in Terminal.app (or iTerm)** in a separate
   window, navigated to your project root. Edit Swift files in Xcode;
   Claude reads/writes them and you reload them in Xcode.
2. **Use VS Code or Cursor as a "scratch IDE"** alongside Xcode for
   non-Swift work (BUILD_LOG editing, config files, scripts). Run
   the actual app in Xcode's simulator/device builder.

When Claude updates Swift files that are open in Xcode, Xcode will
detect the change and prompt you to reload — say yes.

## E.4 Standalone terminal

You don't need an IDE at all if you don't want one. From any terminal:

```bash
cd /path/to/your/project
claude
```

You can edit files in `vim` / `nano` / your editor of choice, and
Claude can read/write them. This is the "I'm just on a server" or
"I'm working on a tiny project" workflow.

---

# Part F — The daily loop

Once everything is wired up, here's what a normal day looks like.

## When you start work

1. Open your IDE in the project root.
2. `Ctrl+`` (or your IDE's terminal shortcut).
3. `claude` to start Claude Code.
4. (Optional) `> recap what we shipped last session` — Claude reads
   the latest BUILD_LOG chapter and reminds you.

## When you're working on a feature

Just talk to Claude normally. Code, ask questions, iterate. **Don't**
manually update BUILD_LOG.md while you work — it's noise.

## When you finish a feature

```
> ship this and add a build-log chapter
```

Claude will:
1. Run type checks / build / tests as appropriate.
2. Stage the changes.
3. Compose a CHANGELOG entry.
4. Compose a BUILD_LOG chapter with the format from the skill.
5. Commit.
6. (If LEARN.md needs updating because you introduced a new
   concept) update LEARN.md too.

You read the BUILD_LOG chapter in the diff, suggest tweaks if needed,
approve the commit.

## When you fix a bug

```
> debug this: [paste error / describe symptom]
```

Claude follows the 7-step debugging method documented in `LEARN.md`
(reproduce → read → hypothesise → test → confirm → prevent → record).
The "record" step writes a debugging-walkthrough chapter into
BUILD_LOG.md.

## When you make an architectural decision

```
> we're switching from REST to GraphQL because [reasons]
```

Claude will:
- Implement the change.
- Add an ADR-style entry to `LEARN.md` explaining the decision.
- Add a BUILD_LOG chapter walking through the migration.
- Update relevant code comments.

## When you onboard someone (or future-you)

Hand them three things:

1. `README.md` — what is this and how do I run it.
2. `BUILD_LOG.md` — read top to bottom to understand how it got
   built.
3. `LEARN.md` — reach for it when you need "how should I think
   about X?"

That's a complete onboarding path.

---

# Part G — Troubleshooting

### "I typed `/teach-as-you-build` but Claude says it doesn't know that command"

The skill file isn't where Claude expects. Check:

```bash
ls ~/.claude/skills/teach-as-you-build/SKILL.md
```

If that file doesn't exist, redo Part A.

### "The skill is there but Claude isn't proactively updating BUILD_LOG"

Add the snippet from `meta/teach-as-you-build/CLAUDE.md.snippet`
into your project's `CLAUDE.md`. Without that, Claude only updates
the docs when you ask. With it, Claude updates them every time a
feature/fix lands.

### "BUILD_LOG.md got too long to read in one sitting"

That's the point — it grows over time. Use the Table of Contents at
the top to jump to the chapter you want. If a single chapter is too
long, that's a sign it should be split: ask Claude to break it into
sub-chapters.

### "I want different doc names than BUILD_LOG.md / LEARN.md"

Edit `~/.claude/skills/teach-as-you-build/SKILL.md` and change the
file names everywhere. The skill is your skill; modify it.

### "I want this for a team, not just personal projects"

The skill works fine for teams. A few extra recommendations:

- Move the templates from `~/.claude/skills/` (per-user) into a
  shared repo and have everyone symlink.
- Add a CI check that fails the build if a feature commit doesn't
  include a BUILD_LOG update (you'd write a custom check; this is
  outside the skill's scope).
- Consider per-author byline in chapters for code review trails.

### "I'm using a non-English language for my docs"

The skill writes in the language of the surrounding context. If your
project comments and CLAUDE.md are in [your language], BUILD_LOG and
LEARN will follow. Add a note to `CLAUDE.md`: `Documentation language:
[language]`.

### "I want to see what other skills are available"

In Claude Code:
```
/help
```

Lists all built-in and user-installed skills.

### "Can the skill auto-commit too, or just write the docs?"

The skill itself doesn't auto-commit (that's a separate concern), but
you can tell Claude:

```
> after writing the chapter, commit it
```

And it will. Or just leave that as a manual `git commit` step at the
end of your session.

---

# Part H — Deploy and actually use the project

You've built the thing. Now you want people to actually use it. There
are three distinct levels of "use," each with different tools.

## H.1 The three "circles" of deployment

| Circle | Audience | Effort | Reach |
|---|---|---|---|
| **1. Local** | You | Zero (already there) | One person |
| **2. Trusted** | One friend / family / collaborator | 5–30 min one-time setup | Anyone you can text a link to |
| **3. Live** | The internet | 1 hour to 1 day setup | Anyone with the URL |

Most people skip from 1 to 3 and burn weeks on it. Going 1 → 2 → 3
in order is faster and surfaces the friction earlier.

Pick your project type below.

## H.2 Web app

(Vue, React, Next.js, SvelteKit, FastAPI, Flask, Django, etc.)

### Circle 1 — local

```bash
npm run dev          # JS/TS frameworks
poetry run uvicorn app:main --reload   # FastAPI
flask run --debug                       # Flask
python manage.py runserver              # Django
```

Open `http://localhost:5173` (or whatever port the framework picked).
That's circle 1. You can already use it.

### Circle 2 — share with one friend

You want your friend to click a link and see what you built. Three
options, easiest first:

**Option A — ngrok (5 minutes, friend uses for an hour).** A tunnel
from a public URL to your laptop's localhost. Free, no account
needed for short sessions.

```bash
# Install once:
brew install ngrok        # mac
choco install ngrok       # win
# or download from ngrok.com

# Run your dev server in one terminal:
npm run dev               # serving on :5173

# Tunnel from another terminal:
ngrok http 5173
# → outputs something like: https://abcd-12-34-56-78.ngrok.app
```

Send your friend that URL. They open it; the request tunnels through
ngrok back to your laptop. **Stays alive only while your laptop is
on and ngrok is running.** Perfect for "hey check this out for an
hour."

**Option B — Cloudflare Tunnel (5 min setup, free, persistent).**
Same idea but tied to a domain you control (or `*.trycloudflare.com`
for instant try-it links). More durable than ngrok.

```bash
cloudflared tunnel --url http://localhost:5173
# → gives you a https://random-words.trycloudflare.com URL
```

**Option C — push to a free hosting service** (10–30 min). See
Circle 3 — the same path; you just don't need a custom domain yet.

### Circle 3 — live, public, persistent

Three paths, in the order most home-lab-equipped builders should
consider them:

**Path A — self-host on your home server (Unraid, Synology, TrueNAS,
Linux box).** Free at scale, full control, you own everything.

```bash
# Build the production bundle locally:
npm run build

# Copy dist/ to your server's appdata folder
# (path will vary by distro — Unraid example):
scp -r dist/ root@your-server.local:/mnt/cache/appdata/your-app/html/

# On the server, run an nginx container pointed at that folder:
docker run -d \
  --name your-app \
  --network shottsproxy \
  --restart unless-stopped \
  -v /mnt/cache/appdata/your-app/html:/usr/share/nginx/html:ro \
  nginx:alpine
```

Then add a proxy host in **Nginx Proxy Manager** (admin panel
typically at `http://server-ip:7818`):

- Domain: `your-app.your-domain.com`
- Forward Hostname: `your-app` (the container name on the shared network)
- Forward Port: `80`
- SSL tab: request a new Let's Encrypt cert, force SSL, HTTP/2 on.

DNS for `your-app.your-domain.com` should point at your server's
public IP — see [H.7](#h7-pointing-a-domain-at-your-home-server-namecheap--npm).

> 📂 **Worked example:** this repo's `deploy/README.md` walks the
> same flow end to end with the actual values used to deploy
> LabelGen Pro to `labelgen.shottsserver.com`. Use it as a template
> for any new self-hosted Unraid + NPM deployment.

**Path B — managed static hosting (Cloudflare Pages, Netlify,
Vercel) — free for personal use.** Connect your GitHub repo, they
auto-build on every push. Zero infra to maintain.

```bash
# Push to GitHub first (see H.9).
# Then go to https://pages.cloudflare.com (or netlify.com / vercel.com),
# "Create project", "Connect Git", pick your repo. Build command:
#   npm run build      (output dir: dist)
# Click deploy. Done.
```

You get `https://your-project.pages.dev` in ~2 minutes. Custom
domain another 10 min. Best when you don't have a home server, or
want zero ops, or want global CDN for free.

**Path C — VPS / PaaS (Fly.io, Railway, Render, DigitalOcean,
AWS/GCP/Azure).** Paid (cheapest options ~$5/mo). Push a Dockerfile,
they run it. Good when you've outgrown a home server but don't want
to commit to your own VPS yet.

> 💡 **If you already have a home server, pick Path A.** It's the
> only $0/mo option that gives you root, your data stays at home, and
> the same Docker pattern works for the next 50 projects you ship.
> If you don't have a home server, Path B is the 2-minute path.

## H.3 CLI tool

(Things you run with `npx my-thing`, `python -m my_thing`, `my-thing`)

### Circle 1 — local

```bash
npx tsx src/cli.ts                    # Node TS
poetry run python -m my_pkg.cli       # Python
go run ./cmd/my-thing                  # Go
cargo run --bin my-thing               # Rust
```

### Circle 2 — share with one friend

**Option A — they clone and run.** Best when the friend has the
runtime installed.

```bash
# What you tell them:
git clone https://github.com/you/my-thing.git
cd my-thing
npm install      # or pip install -e ., go build, cargo build
npm start        # or whatever runs it
```

**Option B — pre-built binary.** Best when the friend doesn't have
the runtime. For Go and Rust, cross-compile:

```bash
# Go: build for friend's machine (Mac/Win/Linux)
GOOS=darwin GOARCH=arm64 go build -o my-thing-mac
GOOS=windows GOARCH=amd64 go build -o my-thing.exe
GOOS=linux GOARCH=amd64 go build -o my-thing-linux

# Rust:
cargo build --release --target x86_64-pc-windows-gnu
```

Send them the binary. They run it. No install required.

For Node CLIs, `pkg` or `bun build --compile` produces standalone
executables. For Python, `pyinstaller` does the same.

### Circle 3 — live (publish to a registry)

```bash
# Node CLI on npm:
npm version patch           # bump version in package.json
npm publish                 # uploads to npmjs.com
# Now anyone runs: npx your-cli-name

# Python on PyPI:
poetry build && poetry publish     # or twine
# Now anyone runs: pipx install your-cli-name

# Go: just push to GitHub. Anyone with Go installed runs:
go install github.com/you/my-thing/cmd/my-thing@latest

# Rust on crates.io:
cargo publish
# Now anyone runs: cargo install my-thing
```

Publishing is permanent (you can yank a version but not delete it).
Triple-check the package name and that no secrets are in the bundle
before hitting publish.

## H.4 Mobile app

(Expo cross-platform, native iOS, native Android)

### H.4 — Expo

**Circle 1 — local:**
```bash
npx expo start
# Press 'i' for iOS sim, 'a' for Android emulator,
# or scan the QR code with the Expo Go app on your phone.
```

**Circle 2 — share with one friend:**
- Send them the QR code from `npx expo start`. They install
  **Expo Go** (free, App Store + Play Store) and scan. Works
  while your laptop is running and on the same network as their
  phone (or via tunnel mode for cross-network).
- For cross-network: `npx expo start --tunnel` — runs through Expo's
  servers so they can scan from anywhere.

**Circle 3 — live (App Store + Play Store):**

```bash
# One-time:
npm install -g eas-cli
eas login
eas build:configure

# Build:
eas build --platform all       # builds iOS + Android in the cloud
# (you need an Apple Developer account for iOS — $99/yr)

# Submit:
eas submit --platform ios
eas submit --platform android
```

EAS Build handles the signing, provisioning, and uploads to the
stores. First store submission takes 1–7 days for review. Updates
after that are usually 24h.

For testing before public release: TestFlight (iOS) and Play Console
internal/closed/open testing (Android). Both let you invite specific
emails to install pre-release builds.

### H.4 — Native iOS

**Circle 1 — local:**
- Open `MyApp.xcodeproj` in Xcode.
- Pick a simulator from the toolbar. ⌘R to build and run.
- Or plug in your iPhone via USB, sign with your free Apple ID,
  ⌘R targets your device.

**Circle 2 — share with one friend (TestFlight):**
- You need an Apple Developer account ($99/yr).
- In Xcode: Product → Archive → Distribute App → App Store Connect.
- In App Store Connect, go to TestFlight tab.
- Add your friend's email to "Internal Testers" (no review required).
- They install **TestFlight** from the App Store, accept the
  invite, install your build.
- Builds expire after 90 days.

**Circle 3 — live (App Store):**
- Same Archive + upload, but submit for review instead of TestFlight-only.
- Fill in App Store metadata (description, screenshots, privacy
  policy URL).
- Review takes 1–7 days. Subsequent updates often <24h.

### H.4 — Native Android

**Circle 1 — local:**
- Open the project in Android Studio.
- Pick an AVD (Android Virtual Device) or USB-debug your phone.
- Run button (or ⇧F10).

**Circle 2 — share with one friend:**
- Build a debug APK: `./gradlew assembleDebug` — output at
  `app/build/outputs/apk/debug/app-debug.apk`.
- Send them the APK file. They install it on their phone (after
  enabling "Install unknown apps" for whatever app they used to
  receive it).
- Or use Play Console internal testing: 100 testers max, no review,
  invite by email.

**Circle 3 — live (Play Store):**
- Build a signed release: `./gradlew bundleRelease` (produces an AAB).
- Upload to Play Console.
- Fill in store metadata, content rating, target audience.
- First submission review: 1–7 days. Updates often within hours.

## H.5 Server / API

(Express, FastAPI, Flask, Django, Go HTTP, Axum, etc.)

### Circle 1 — local

```bash
npm run dev                                       # Node
uvicorn app:main --reload                         # FastAPI
flask run --debug                                 # Flask
python manage.py runserver                        # Django
go run ./cmd/server                                # Go
cargo run --bin server                             # Rust
```

### Circle 2 — share with one friend

Same as H.2 (web app) — ngrok or Cloudflare Tunnel. Send them the
public URL.

### Circle 3 — live

For APIs you want online persistently. Same paths as web apps but
the trade-offs shift because backends usually need a database
(see [H.6](#h6-databases--where-your-projects-data-lives)) and
persistent process management.

**Path A — self-host on your home server.** Docker container running
your API, behind Nginx Proxy Manager for SSL/routing, with the DB
container on the same shared network so they can talk by name.

```bash
# Example: Node API container talking to a MariaDB container,
# both on the shottsproxy network.
docker run -d \
  --name your-api \
  --network shottsproxy \
  --restart unless-stopped \
  -e DATABASE_URL="mysql://user:pass@mariadb:3306/your_db" \
  -v /mnt/cache/appdata/your-api/data:/data \
  your-org/your-api:latest
```

Then NPM proxy host pointing `api.your-domain.com → your-api:3000`
(or whatever port your API listens on inside the container). Same
SSL flow as Path A above.

**Path B — Fly.io / Railway / Render** — Dockerfile-based, auto-deploy
from GitHub, free tier exists, managed Postgres / MySQL add-ons one
click away. Best when you don't have home-server hosting *or* you
want fully managed DB backups without thinking about it.

**Path C — VPS** — DigitalOcean / Hetzner / Linode droplet, ~$5/mo,
install Docker, run your container. Self-managed but no home-network
quirks (router port-forwarding, dynamic IPs, residential ISP
restrictions on some ports).

**Path D — Cloud Functions / Workers / Lambda** — for stateless
event-driven APIs. Pay-per-request. Can be effectively free for
tiny apps. Cold-start latency is real; pick this when "spins up on
demand" is a feature, not a bug.

> 💡 **If you have home infra**, Path A. **Otherwise**, Path B is the
> easiest place to start, with the option to migrate to A or D later
> as costs or complexity push you.

## H.6 Databases — where your project's data lives

If your project needs persistence (user accounts, saved items,
search indexes, anything that must survive a restart), here's where
to put it.

### Three paths, same priority order

**Path A — self-hosted on your home server.** If you already run an
Unraid / Synology / Linux box with Docker, your DB lives there.
You own it. You back it up. You scale it.

The pattern: one DB container per "engine" you need (one MariaDB,
one Postgres, etc.), shared across multiple apps via a private
Docker network. Each app connects by container name.

```bash
# Example: spin up MariaDB once, reuse it for many apps.
docker run -d \
  --name mariadb \
  --network shottsproxy \
  --restart unless-stopped \
  -v /mnt/cache/appdata/mariadb:/var/lib/mysql \
  -e MARIADB_ROOT_PASSWORD="long-secret-here" \
  mariadb:11

# Create a DB + user for your new app:
docker exec -it mariadb mysql -uroot -p
> CREATE DATABASE your_app;
> CREATE USER 'your_app'@'%' IDENTIFIED BY 'app-password-here';
> GRANT ALL ON your_app.* TO 'your_app'@'%';
> FLUSH PRIVILEGES;
> EXIT

# Your app's connection string:
DATABASE_URL=mysql://your_app:app-password-here@mariadb:3306/your_app
```

Same shape for Postgres (`postgres:16`), MongoDB (`mongo:7`), Redis
(`redis:7`).

> 📂 **Worked example:** the homelab's running database lineup —
> `mariadb:3306` (primary), `mariadb-1:3307` (secondary),
> `PostgreSQL_Immich:5433`, `MongoDB:27018`, `redis:6379`. Pick the
> one that matches your data shape (relational vs document vs
> cache); the connection-string pattern is the same.

**Backup discipline:**
- The Unraid Appdata Backup plugin (or equivalent) snapshots
  `/mnt/cache/appdata/<dbname>/` nightly to your array. Set it up
  once.
- Test a restore at least once a year. Backups you've never restored
  aren't backups, they're hopes.
- For DBs you can't afford to lose, also push an off-site copy
  (Backblaze B2, S3, or just rsync to a friend's NAS).

**Path B — managed Postgres / MySQL.** Best when you don't have a
home server or you want fully-managed backups + scaling without
thinking about them.

| Provider | Best for | Free tier |
|---|---|---|
| **Supabase** | Postgres + auth + storage in one | 500 MB DB, 1 GB storage, 50k auth users |
| **Neon** | Postgres only, instant branches for dev | 0.5 GB storage |
| **PlanetScale** | MySQL with branching | Hobby tier (limited) |
| **Render** | Postgres alongside their hosting | $0 for 90 days, then $7+/mo |
| **Railway** | Postgres / MySQL / Mongo / Redis | $5 trial credit, then usage-based |

Connection string from the provider, paste into your app's `.env`,
done. Migrating off later is straightforward (`pg_dump` / `mysqldump`).

**Path C — embedded SQLite.** When the data fits in a single file
and you don't need concurrent writes from multiple processes (or
multiple servers).

```python
# Python example
import sqlite3
conn = sqlite3.connect('app.db')
```

Pros: zero ops, no DB server to run, file backups are trivial.
Cons: single-writer at a time, doesn't scale to multi-server. For
a CLI tool, a personal-use app, or anything single-tenant, often the
right choice.

If you eventually need to distribute SQLite across machines: LiteFS
(Fly.io's project) or Cloudflare D1 (managed SQLite at the edge).

### Picking a DB engine

| If your data is... | Use |
|---|---|
| Relational (users → orders → items) | Postgres or MariaDB |
| Document-shaped (deeply nested JSON) | MongoDB or Postgres JSONB |
| Key-value, ephemeral (sessions, caches) | Redis |
| Full-text search heavy | Postgres + tsvector, or Meilisearch |
| Time-series (metrics, logs) | TimescaleDB or InfluxDB |

When in doubt, **start with Postgres**. It does relational, JSON,
full-text search, and has the strongest tooling ecosystem. You can
migrate to a specialist DB later if needed; you almost never have
to.

---

## H.7 Pointing a domain at your home server (Namecheap + NPM)

You bought a domain on Namecheap (or any registrar) and you want
`thing.your-domain.com` resolving to a service running on your
home server, with HTTPS via Nginx Proxy Manager. Here's the wiring.

### Step 1 — find your public IP

```bash
curl ifconfig.io
# → 73.98.242.228 (example)
```

That's the IP your ISP gave your router. **Note: this can change**
if you don't have a static IP. If it changes, your DNS records have
to update too. Two mitigations:

- **Dynamic DNS** (DDNS) — a script on your server that updates the
  registrar when your IP changes. Namecheap supports this; the
  ddclient or similar tool runs in a container.
- **Tailscale** — if you don't need the service on the *open
  internet*, Tailscale gives you a stable VPN-only IP that doesn't
  care what your public IP does. Cheaper, simpler, more secure.

### Step 2 — port-forward 80 and 443 on your router

This varies wildly by router. The general path:

1. Log into your router's admin UI (usually `http://192.168.0.1` or
   `http://192.168.1.1`).
2. Find "Port Forwarding" or "Virtual Server."
3. Add two forwards:
   - External port `80` → internal IP `your-server-lan-ip`, internal
     port whatever NPM listens on for HTTP (often `8080`).
   - External port `443` → internal IP, internal port for HTTPS
     (often `4443`).
4. Save and reboot the router if it asks.

> 📂 **Worked example:** in this homelab, NPM listens on `8080` /
> `4443` internally on `192.168.1.153`, and the router forwards
> `80 → 8080` and `443 → 4443` to it.

### Step 3 — add DNS records at Namecheap

1. Log into Namecheap → Domain List → "Manage" next to your domain.
2. Go to the **Advanced DNS** tab.
3. Add an **A Record**:
   - **Type:** A Record
   - **Host:** `thing` (or `@` for the root domain, `*` for a
     wildcard)
   - **Value:** your public IP from Step 1
   - **TTL:** Automatic
4. Save.

For a wildcard (so any `*.your-domain.com` works), use `Host: *`.

> 💡 **Tip:** `thing.your-domain.com` will work in ~5 minutes on
> Namecheap's DNS. From other DNS providers it can take longer
> (TTL-dependent). Use `dig thing.your-domain.com @1.1.1.1` to
> verify resolution from outside your network.

### Step 4 — add the proxy host in NPM

1. Open NPM admin (typically `http://server-ip:7818`).
2. **Hosts → Proxy Hosts → Add Proxy Host**.
3. **Details tab:**
   - Domain Names: `thing.your-domain.com`
   - Scheme: `http`
   - Forward Hostname/IP: the container name (e.g., `your-app`) on
     the shared Docker network.
   - Forward Port: the container's internal port (usually `80` for
     a static site, `3000`/`8000`/etc. for an API).
   - Cache Assets: **on** (for static sites)
   - Block Common Exploits: **on**
4. **SSL tab:**
   - Certificate: **Request a new SSL Certificate**
   - Force SSL: **on**
   - HTTP/2 Support: **on**
   - HSTS Enabled: **on**
   - Email: yours, for renewal alerts
   - Agree to LE terms: yes
5. Save.

The Let's Encrypt cert issues in ~30 seconds. NPM auto-renews it
every 60 days.

### Step 5 — verify

```bash
# From outside your network (use your phone on cell, or a friend's wifi):
curl -I https://thing.your-domain.com
# Should respond with HTTP/2 200 and a valid cert.
```

If it fails: see Part G (Troubleshooting) — the most common issue is
DNS not propagated yet, or the container not actually being on the
NPM-shared Docker network.

### Avoiding common pitfalls

- **Hairpin NAT** — some consumer routers can't route traffic from
  inside your network *back* to your public IP. So
  `https://thing.your-domain.com` works on cell but not LAN. Fix:
  run a local DNS service (dnsmasq or Pi-hole) on your network that
  resolves `thing.your-domain.com` directly to the LAN IP for
  inside-the-network clients.
- **Dynamic public IP** — if your IP changes weekly, set up DDNS so
  the DNS records auto-update. Namecheap has a built-in "Dynamic DNS"
  setting per host — combine with `ddclient` running in a container.
- **ISP blocking ports 80/443** — some residential ISPs block
  inbound on these. Workaround: use Cloudflare in front (orange-cloud
  the DNS record) or run on non-standard ports + tell users.

---

## H.8 "Just send them the source" — for any project

Sometimes the friend is a developer who'd rather just clone and
poke. The minimum viable "give them the source":

```bash
# 1. Make sure your README has clear run instructions.
# 2. Push to GitHub (see H.7).
# 3. Send them the URL. They:

git clone https://github.com/you/your-project.git
cd your-project
# follow README
```

Make their life easier:

- **A working `README.md`** with the exact commands they should run.
- **A `.env.example` file** if you have secrets — they copy to `.env`
  and fill in their own values.
- **A `Makefile` or `npm script` for one-line setup** —
  `make setup` or `npm run setup` should install deps + create
  empty config. Less is more here.
- **No outstanding broken state in `main`** — if you committed broken
  code, they'll think the project is broken.

## H.9 Pushing to GitHub the first time

Two paths.

### Option A — via `gh` CLI (easiest, one command)

```bash
# One-time install + auth:
brew install gh                       # mac
choco install gh                      # windows
gh auth login                         # follow browser flow

# Per-project:
cd /path/to/your/project
gh repo create your-project-name --private --source=. --remote=origin --push
```

That single `gh repo create` command:
- Creates a new repo on GitHub (private by default with `--private`).
- Adds it as the `origin` remote in your local repo.
- Pushes the current branch.

You're done. Send the URL to people who should have access.

### Option B — via GitHub web UI

1. Go to https://github.com/new
2. Name the repo. Pick Private. **Do not** initialise with a README,
   .gitignore, or license — your local repo already has them.
3. Create.
4. GitHub shows you commands to copy-paste in your terminal:
   ```bash
   git remote add origin https://github.com/you/your-project.git
   git branch -M main
   git push -u origin main
   ```
5. Run those.

### Going public later

When you're ready to flip a private repo to public:

```bash
gh repo edit --visibility public --accept-visibility-change-consequences
```

Or in the web UI: Settings → General → "Change visibility" at the
bottom (Danger Zone).

**Before flipping public**, scan for:

- Hardcoded secrets, API keys, passwords (use `git log -p | grep -i
  password` and similar).
- Personal info (real names, addresses) in commits or comments you
  don't want public.
- Internal infrastructure details (server IPs, internal URLs).

Once it's public, the git history is public — even if you delete the
file in a later commit, the secret is in the history. The proper fix
is `git filter-repo` to rewrite history, but the easier fix is "don't
commit secrets in the first place." Use a `.env` file (gitignored)
for any sensitive values.

---

# What happens next in *this* repo

Going forward, every time we ship a feature in LabelGen Pro, the
commit will include:

1. The feature code itself.
2. A new chapter in `BUILD_LOG.md`.
3. (Sometimes) a new section in `LEARN.md`.
4. A `CHANGELOG.md` entry.

You can see the format in action by reading the existing chapters in
`BUILD_LOG.md`. When we ship STL export next, Chapter 8 will appear
following the same template.

If anything in this WORKFLOW is confusing or missing, that's a sign
the wiki needs an update — say so and we'll improve it.
