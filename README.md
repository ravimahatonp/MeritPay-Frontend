# MeritPay Frontend

**Next.js frontend for MeritPay — privacy-preserving, merit-based payroll with private KPI proofs and selective auditor disclosure on Stellar.**

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue?logo=stellar)](https://developers.stellar.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What this app does

This is the browser client for MeritPay. It generates Groth16 zero-knowledge proofs entirely client-side (via `snarkjs` + WASM), then submits them to Soroban smart contracts on Stellar Testnet through a connected Freighter wallet. Employee KPI data (hours worked, sales flags) and salary figures never leave the browser as plaintext — only commitments, nullifiers, and boolean outcomes are sent on-chain.

The corresponding Circom circuits and Soroban contracts live in a separate repository; this repo only ships the **compiled** circuit artifacts (`.wasm` + `.zkey`) needed to prove in the browser, under `public/circuits/`.

---

## Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Landing page — explains the three-step private payroll flow |
| `/employer` | `app/employer/page.tsx` | Configure employees (manually or via CSV upload), fund the on-chain payroll pool |
| `/verify` | `app/verify/page.tsx` | Generate per-employee KPI proofs, generate the aggregated payroll proof, execute payroll on Stellar |
| `/employee` | `app/employee/page.tsx` | Generate an individual KPI proof, or claim salary from an executed payroll batch |
| `/auditor` | `app/auditor/page.tsx` | Generate a budget-compliance disclosure proof without revealing individual salaries |

---

## Library code (`lib/`)

- **`proof.ts`** — `snarkjs.groth16.fullProve` wrappers for all four circuits (KPI, PayrollAggregator, ClaimPayout, AuditorDisclosure), Poseidon commitment/nullifier generation, and Groth16 proof/verification-key serialization to the byte layout expected by the Soroban verifier contract.
- **`stellar.ts`** — Soroban RPC + Freighter integration: builds, simulates, signs, and submits `execute_payroll`, `claim_payout`, `fund_pool`, and read-only calls (`get_pool_balance`, `get_epoch`, `verify_auditor`); maps on-chain contract error codes to readable messages.
- **`claim.ts`** — Post-payroll claim bundle persistence (`localStorage`) and claimed-nullifier tracking so employees can claim once payroll has been executed.
- **`types.ts`** — Shared `Employee`, `KPIResult`, `ClaimBundle`, `MockProof` interfaces plus the demo `MOCK_EMPLOYEES` roster.
- **`declarations.d.ts`** — Ambient module declarations for the untyped `snarkjs` and `circomlibjs` packages.

## Components (`components/`)

- **`Navbar.tsx`** — Sticky nav with active-route highlighting and a mobile menu.
- **`WalletConnect.tsx`** — Freighter connect button with auto-reconnect and an install prompt when the extension is missing.
- **`EmployeeCard.tsx`** — Displays an employee's salary, hours threshold, bonus rate, and live proof status.
- **`ProofBadge.tsx`** — Animated notarial-seal SVG badge for verified vs. pending proof states.

---

## Tech stack

| Component | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Styling | Tailwind CSS 4 |
| Proof generation | `snarkjs` 0.7 (Groth16, browser WASM) |
| Hashing | `circomlibjs` (Poseidon, for commitments and nullifiers) |
| Stellar SDK | `@stellar/stellar-sdk` 14 (Soroban RPC) |
| Wallet | `@stellar/freighter-api` 4 |
| Language | TypeScript 5 |

---

## Getting started

### Prerequisites

- Node.js 18+
- [Freighter wallet extension](https://freighter.app) configured for Stellar Testnet
- Deployed contract IDs for the payroll, claim, and verifier contracts (from the companion circuits/contracts repo)

### Install and configure

```bash
npm install
```

Create `.env.local` with the deployed contract addresses:

```bash
NEXT_PUBLIC_PAYROLL_CONTRACT_ID=CD...
NEXT_PUBLIC_CLAIM_CONTRACT_ID=CD...
NEXT_PUBLIC_VERIFIER_CONTRACT_ID=CB...
NEXT_PUBLIC_ADMIN_ADDRESS=GA...
NEXT_PUBLIC_DEPLOYER_ADDRESS=GA...
```

### Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

### Other scripts

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

---

## Demo flow

1. **Employer** (`/employer`) — add employees (base salary in XLM, hours threshold, bonuses) manually or via CSV, save the config, fund the on-chain pool from a connected Freighter wallet.
2. **Verify** (`/verify`) — generate each employee's KPI proof, generate the aggregated PayrollAggregator proof, then **Execute Payroll on Stellar** (requires the contract admin wallet). A claim bundle is saved to `localStorage` for step 3.
3. **Employee** (`/employee`) — pick a name, connect or paste a receive address, and **Claim Salary**. A ClaimPayout proof is generated in-browser and submitted on-chain.
4. **Auditor** (`/auditor`) — set a budget and generate an AuditorDisclosure proof showing total payroll is within budget, with individual payouts kept private.

---

## Project structure

```
app/
  page.tsx                 Landing page
  layout.tsx                Root layout (fonts, navbar)
  globals.css                Tailwind base + theme tokens
  employer/page.tsx         Employer dashboard
  verify/page.tsx            Proof generation + payroll execution
  employee/page.tsx         Individual KPI proof + salary claim
  auditor/page.tsx           Budget-compliance disclosure proof

components/
  Navbar.tsx
  WalletConnect.tsx
  EmployeeCard.tsx
  ProofBadge.tsx

lib/
  proof.ts                  snarkjs wrappers for all 4 circuits
  stellar.ts                  Soroban SDK + Freighter integration
  claim.ts                    Claim bundle persistence
  types.ts                    Shared interfaces + mock data
  declarations.d.ts           Untyped module declarations

public/
  circuits/
    kpi/                     kpi.wasm, kpi_final.zkey
    payroll/                 payroll_aggregator.wasm, payroll_aggregator_final.zkey
    claim/                   claim.wasm, claim_final.zkey
    auditor/                 auditor_disclosure.wasm, auditor_disclosure_final.zkey
  *.svg                       Next.js default icon assets
```

---

## Limitations (MVP)

- **Simulated KPI performance data**: employee names, salaries, and thresholds are employer-configurable, but the actual per-epoch hours/sales inputs are randomly generated in the browser at proof time (`app/verify/page.tsx`). A production system would source these from a real HR system or a signed off-chain attestation.
- **5 employees fixed**: the circuits this frontend proves against are compiled for a fixed batch size of 5. Scaling requires recompiling with larger circuit parameters or recursive proofs.
- **Browser proof generation**: Groth16 WASM proving takes roughly 5–30s depending on circuit size and device. A production deployment would likely offload this to a native proving service.

---

## Contributing

Contributions are welcome. Start with:

- [CONTRIBUTING.md](CONTRIBUTING.md) — setup, workflow, branch/commit conventions, coding standards
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — community expectations
- [SECURITY.md](SECURITY.md) — how to report a vulnerability privately
- [CHANGELOG.md](CHANGELOG.md) — notable changes

Copy [.env.local.example](.env.local.example) to `.env.local` before running any on-chain flow.

---

## License

MIT — see [LICENSE](LICENSE).
