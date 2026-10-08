# Fieldrow Constitution

## Core Principles

### I. Field Workflow First
Every release MUST improve or protect the mobile Scan -> Find -> Update -> Photo -> Save
workflow. The product MUST remain a focused field client for Baserow, not a recreation of the
Baserow web application. Offline sync, accounts, analytics, extra data sources, and workflow
builders are excluded until an approved specification demonstrates a current user need.

### II. Service Boundary
Screens MUST call a single Baserow service boundary for remote operations. HTTP paths,
authentication headers, response normalization, upload mechanics, and Baserow-specific error
handling MUST NOT appear in screen components. A new abstraction is added only when a second
real implementation or caller needs it.

### III. Exact Matches and Explicit Outcomes
Barcode and QR lookup MUST use exact matching and return one of three explicit outcomes: no
match, one match, or duplicate matches. The app MUST NOT choose an arbitrary record when
duplicates exist. Update and photo operations MUST surface failure without implying that data
was saved.

### IV. Credential Safety
Database tokens MUST be stored in platform-backed secure storage and sent only to the configured
Baserow server. Tokens MUST NOT appear in source control, ordinary local storage, logs, crash
reports, analytics, test fixtures, or generated screenshots. Trust-boundary validation and error
handling MUST NOT be simplified away.

### V. Native Simplicity
The app MUST use native platform expectations, accessible controls, system back behavior,
safe-area handling, scalable text, dark mode, and minimum platform touch targets. Prefer Expo,
React Native, platform capabilities, standard APIs, and already-installed dependencies over
custom infrastructure. New dependencies and abstractions require a demonstrated v0 need.

## Product and Technical Constraints

- The supported platforms are iOS and Android through one adaptive Expo application.
- v0 connects directly to Baserow Cloud or a user-provided self-hosted Baserow base URL.
- v0 stores connection details locally; only the token requires secure storage.
- The user configures one table, one barcode field, optional editable fields, and an optional
  photo field.
- No backend proxy, Redux-style state layer, user account system, offline synchronization,
  push notifications, GPS, or product analytics belong in v0.
- Configuration, scan, lookup, update, and photo upload failures MUST have actionable user-facing
  states.

## Development Workflow and Quality Gates

Work MUST proceed through Spec Kit specification, plan, tasks, implementation, and convergence.
Each service contract and non-trivial decision branch MUST have the smallest runnable automated
check that proves its behavior. Critical vertical-slice behavior MUST also be verified against a
live Baserow test table before release. UI verification MUST cover an iOS simulator and Android
emulator, light and dark appearances, enlarged text, and token-safe screenshots. Changes MUST be
reviewed for constitution compliance and unjustified complexity before completion.

## Governance

This constitution governs all project specifications, plans, tasks, reviews, and implementation.
An amendment requires an explicit rationale, updated version and dates, and review of affected
artifacts. Semantic versioning applies: MAJOR for incompatible principle changes, MINOR for new or
materially expanded governance, and PATCH for clarifications. Every feature review MUST confirm
compliance; any exception MUST be documented in the feature plan with a removal or migration
path.

**Version**: 1.0.0 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
