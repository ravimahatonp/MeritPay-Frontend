# Security Policy

MeritPay handles payroll data and generates zero-knowledge proofs that settle real
value on Stellar. We take security seriously and appreciate responsible disclosure.

> **Note:** This repository is the **frontend client only**. The Circom circuits and
> Soroban smart contracts live in a separate repository. Vulnerabilities in circuit
> logic, the trusted setup, or on-chain contract code should be reported to that
> project. Report here for anything in the browser client: proof serialization,
> wallet integration, input handling, dependency issues, data leakage, or the
> compiled circuit artifacts shipped under `public/circuits/`.

## Supported versions

This project is pre-1.0 and moves fast. Only the latest `main` is supported.
Security fixes are applied to `main` and not backported.

| Version | Supported |
|---------|-----------|
| `main` (latest) | ✅ |
| older commits / tags | ❌ |

## Reporting a vulnerability

**Please do not open a public GitHub issue, pull request, or discussion for a
security vulnerability.**

Instead, use one of the following private channels:

1. **GitHub Security Advisories (preferred).** Go to the repository's
   **Security → Advisories → Report a vulnerability** tab and submit a private
   report. This keeps the discussion private until a fix is ready.
2. **Email.** Contact the maintainers at
   **[INSERT SECURITY CONTACT EMAIL]** with the details below.

Please include:

- A description of the issue and its impact.
- Steps to reproduce, or a proof-of-concept.
- Affected files / routes / dependencies and the commit hash you tested.
- Browser and Freighter version if relevant.
- Whether the issue has been disclosed anywhere else.

## What to expect

- **Acknowledgement** within 3 business days.
- An initial assessment and severity rating within 7 business days.
- Regular updates on remediation progress.
- Credit in the release notes / advisory once a fix ships, unless you prefer to
  remain anonymous.

We ask that you give us a reasonable window (typically up to 90 days) to release a
fix before any public disclosure, and that you avoid privacy violations, data
destruction, or service disruption while researching.

## Scope

**In scope**

- Leakage of private KPI inputs, salaries, salts, or nullifiers (console, network,
  storage, error reports).
- Incorrect proof / verification-key serialization that could let an invalid proof
  verify, or a valid proof fail.
- Wallet-integration flaws (wrong network, transaction tampering, signature reuse).
- Client-side injection (XSS) via CSV import, address fields, or URL params.
- Dependency vulnerabilities with a realistic exploit path in this app.
- Integrity of the compiled `.wasm` / `.zkey` artifacts in `public/circuits/`.

**Out of scope**

- Circuit soundness / completeness and the Groth16 trusted setup (companion repo).
- Soroban contract logic (companion repo).
- Issues requiring a already-compromised machine or a malicious browser extension.
- Testnet-only fund loss, rate limiting, or clickjacking on non-sensitive pages.
- Automated scanner output without a demonstrated impact.

## Known limitations (by design, MVP)

The README documents several intentional MVP simplifications (simulated KPI data,
fixed 5-employee batch, in-browser proving, `localStorage` claim bundle). These are
tracked as normal issues, not vulnerabilities — but if you find a way to turn one
into a real security or privacy breach, we want to hear it.
