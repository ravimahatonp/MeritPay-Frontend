# Contributing to MeritPay Frontend

Thanks for your interest in contributing! This repository is the **Next.js browser
client** for MeritPay — privacy-preserving, merit-based payroll with client-side
Groth16 proofs and selective auditor disclosure on Stellar. The Circom circuits and
Soroban contracts live in a separate repository; this repo only ships the compiled
circuit artifacts under `public/circuits/`.

By participating you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Project setup](#project-setup)
- [Development workflow](#development-workflow)
- [Branch and commit conventions](#branch-and-commit-conventions)
- [Opening a pull request](#opening-a-pull-request)
- [Coding standards](#coding-standards)
- [Working with ZK proofs and Stellar](#working-with-zk-proofs-and-stellar)
- [Reporting bugs and requesting features](#reporting-bugs-and-requesting-features)
- [Security issues](#security-issues)

---

## Ways to contribute

- **Pick up an open issue.** Issues labelled `good first issue` are a gentle start.
  Comment on the issue to claim it before you begin so work isn't duplicated.
- **Improve documentation** — the README, this guide, code comments, JSDoc.
- **Add tests.** The codebase currently has no automated tests; the pure helpers in
  `lib/` (proof serialization, payout math, CSV parsing, error mapping) are the
  highest-value place to start.
- **Fix a bug or build a feature** you have a concrete use for.

If your change is large or changes architecture, **open an issue first** to discuss
the approach before writing code.

---

## Project setup

### Prerequisites

- **Node.js 18.18+** (or 20+). Use `nvm` / `fnm` if you juggle versions.
- **npm** (the repo ships a `package-lock.json`; please don't switch package managers).
- The **[Freighter wallet extension](https://freighter.app)** set to **Stellar Testnet**,
  for anything that touches the chain.
- Deployed contract IDs for the payroll, claim, and verifier contracts (from the
  companion circuits/contracts repo) if you want to exercise on-chain flows.

### Install

```bash
git clone git@github.com:MeritPay/MeritPay-Frontend.git
cd MeritPay-Frontend
npm install
```

### Configure

Copy the example environment file and fill in the values:

```bash
cp .env.local.example .env.local
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_PAYROLL_CONTRACT_ID` | Payroll Soroban contract (`C…`) |
| `NEXT_PUBLIC_CLAIM_CONTRACT_ID` | Claim Soroban contract (`C…`) |
| `NEXT_PUBLIC_VERIFIER_CONTRACT_ID` | Groth16 verifier contract (`C…`) |
| `NEXT_PUBLIC_ADMIN_ADDRESS` | Contract admin wallet (`G…`), required to execute payroll |
| `NEXT_PUBLIC_DEPLOYER_ADDRESS` | Source account used for read-only simulations (`G…`) |

The landing page and the local-only proof demos work without any of these; on-chain
actions (fund pool, execute payroll, claim) do not.

### Run

```bash
npm run dev      # Turbopack dev server at http://localhost:3000
npm run build    # production build (webpack)
npm run start    # serve the production build
npm run lint     # ESLint
```

Please run **`npm run lint` and `npm run build`** before opening a PR — production
build uses a different bundler path than `dev` and catches issues `dev` doesn't.

---

## Development workflow

1. Fork the repo (external contributors) or create a branch (maintainers).
2. Create a topic branch off `main` (see [naming](#branch-and-commit-conventions)).
3. Make focused commits.
4. Run `npm run lint` and `npm run build`; run `npm test` once a test suite exists.
5. Push and open a pull request against `main`.
6. Address review feedback by pushing follow-up commits (don't force-push during
   review unless asked — it makes re-review harder).

---

## Branch and commit conventions

**Branch names:** `type/short-description`, e.g. `fix/csv-quoted-fields`,
`feat/proof-web-worker`, `docs/contributing-guide`.

**Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<optional scope>): <summary in the imperative mood>

<optional body explaining what and why, not how>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `perf`.

Examples from this repo's history:

```
feat: add auditor disclosure page proving total payroll is within budget
fix: remove sensitive console logging in payroll proof generation
chore: sync compiled ClaimPayout circuit WASM for individual payout proofs
```

Do **not** add authorship/attribution trailers (`Co-authored-by`, tool credits) to
commits or PR descriptions.

---

## Opening a pull request

- Fill out the PR template.
- Keep PRs **small and single-purpose**. Split unrelated changes.
- Reference the issue it closes: `Closes #123`.
- Describe **what changed and why**, and **how you tested it**.
- Include screenshots or a short clip for UI changes.
- Make sure CI is green (lint, typecheck, build; tests when present).
- New runtime dependencies need justification in the PR description — this is a
  client bundle and a wallet-adjacent app, so every dependency is a supply-chain
  and bundle-size cost.

A maintainer will review. We aim to give first feedback within a few days.

---

## Coding standards

- **TypeScript**, `strict` mode. Avoid `any`; prefer precise types and narrow with
  guards. The `snarkjs` / `circomlibjs` packages are untyped — keep their shims in
  `lib/declarations.d.ts` and wrap them behind typed helpers in `lib/`.
- **React 19 / Next.js App Router.** Client components must carry `'use client'`.
  Keep heavy work (proving, hashing) out of render.
- **Styling:** Tailwind CSS v4 with the theme tokens defined in `app/globals.css`.
  Reuse the existing `merit-*` / `btn-*` / `badge-*` classes and the "Quill" palette
  rather than introducing new ad-hoc colors.
- **Formatting:** follow the existing style (2-space indent, single quotes, trailing
  semicolons). `npm run lint` must pass with no new warnings.
- **Comments:** explain non-obvious cryptographic or on-chain reasoning. The
  byte-layout and unit-conversion code especially — a wrong offset produces a proof
  that silently fails on-chain.
- Keep functions in `lib/` **pure and framework-free** where possible so they can be
  unit-tested without a browser.

### Project layout

```
app/         Next.js routes (landing, employer, verify, employee, auditor) + layout
components/   Shared UI (Navbar, WalletConnect, EmployeeCard, ProofBadge)
lib/         proof.ts, stellar.ts, claim.ts, types.ts, declarations.d.ts
public/circuits/   Compiled .wasm + .zkey for the 4 circuits (kpi, payroll, claim, auditor)
```

---

## Working with ZK proofs and Stellar

- **Circuit artifacts** (`public/circuits/**`) are build outputs from the companion
  circuits repo. Don't hand-edit them. If a circuit changes, its `.wasm`, `.zkey`,
  **and** the verifier contract's verification key must all be updated together.
- **Byte serialization** (`lib/proof.ts`: `serializeProof`, `serializeVK`,
  `bigIntToBytes32`) must match exactly what the Soroban verifier expects, including
  the G2 coordinate ordering (imaginary part first). Add a fixture-based test with
  any change here.
- **Units:** `1 circuit unit = 0.001 XLM = 10 000 stroops`. Route conversions through
  named helpers, not inline `* 1000` / `* 1e7`.
- **Testnet only.** Never point the app at Mainnet. Never commit real secrets, seed
  phrases, or a funded account's key.
- Proof generation is slow (5–30 s) and currently blocks the main thread — be
  mindful of that when touching the proving flows.

---

## Reporting bugs and requesting features

Use the **Issues** tab and pick the matching template. A good bug report includes:

- what you did, what you expected, what happened;
- browser + Freighter version, and whether a wallet was connected;
- console output (with any private values redacted);
- whether it reproduces on a fresh `.env.local`.

---

## Security issues

**Do not open a public issue for a security vulnerability.** See
[SECURITY.md](./SECURITY.md) for how to report privately.

---

Thanks again for contributing! 🖋️
