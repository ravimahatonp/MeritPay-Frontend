# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to adhere to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once it reaches a `1.0.0` release. Until then, expect breaking changes on `main`.

## [Unreleased]

### Added

- `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, and
  GitHub issue / pull-request templates.
- `.env.local.example` documenting the required `NEXT_PUBLIC_*` configuration.

### Changed

- _Nothing yet._

### Fixed

- _Nothing yet._

<!--
When cutting a release, move the Unreleased entries under a new heading:

## [0.1.0] - YYYY-MM-DD

and add a link reference at the bottom.
-->

## History (pre-changelog)

Earlier work is recorded only in the Git history. Highlights:

- Landing page explaining the three-step private payroll flow.
- Employer dashboard: configure employees (table or CSV) and fund the on-chain pool.
- Verify flow: per-employee KPI proofs, aggregated Groth16 proof, `execute_payroll`.
- Employee portal: individual KPI proof and Freighter-signed `claim_payout`.
- Auditor page: budget-compliance disclosure proof.
- Compiled circuit artifacts (KPI, PayrollAggregator, ClaimPayout, AuditorDisclosure)
  synced from the trusted setup.
- Security pass removing sensitive `console.log` statements from `lib/stellar.ts`
  and `lib/proof.ts`.

[Unreleased]: https://github.com/MeritPay/MeritPay-Frontend/commits/main
