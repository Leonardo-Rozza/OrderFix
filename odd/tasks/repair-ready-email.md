# Send a safe customer email when a repair is completed

Status: authorized local implementation; E1 preparation complete, no source changes or delivery yet.

## Outcome and authorization

Send one automatic transactional email when an existing repair changes to `COMPLETADO`. Reuse the existing `/seguimiento/{codigoSeguimiento}` link, where the customer can view the latest budget and repair status. Keep customer email optional and preserve manual WhatsApp. A transport failure must not roll back the repair.

User approval: “Dale, eso ... tenemos el link del presupuesto ... vamos a hacerlo así” after approving an initial completed-repair email. This feature does not authorize real sends, provider access, setting changes, payment activation, push, PRs, merge, or deployment. Paid PRO and cancellation at the paid-period end remain a separate product decision/workstream, not part of these units.

## Design and boundaries

- One durable event per workshop, repair, and `COMPLETADO`, captured in the same transaction as an actual PUT/PATCH transition. Preserve no-op behavior; no historical backfill, direct completed-repair creation event, budget email, or `LISTO_SIN_REPARAR` email.
- Share the existing repair row lock across completion entry points and retain a database uniqueness constraint. A persistence failure may roll back the transaction; a later email transport failure must not.
- Store references and delivery metadata, not recipients, bodies, budget values, credentials, or the public tracking secret. Resolve and validate the current workshop/repair/customer before dispatch.
- Missing customer email records `SIN_EMAIL` without preventing completion. The first capability-specific flag is proposed as `ordenfix.reparaciones.email.enabled=false`; SMTP and scheduling stay off in this work.
- Dedicated delivery adapter/worker, independent of account closure. Do not change account verification/password-reset email behavior.
- SMTP acceptance is not inbox delivery. Known failures before `send` can retry; exceptions during `send`, an uncertain SQL ACK, or an expired sending lease must not trigger automatic resend. Do not promise exactly-once SMTP.
- Authenticated tenant-scoped status and safe retry must never accept an arbitrary recipient, resend an accepted/in-flight/uncertain event, or invoke SMTP synchronously from the repair request.
- Protect the reused tracking code as a bearer secret in logs and telemetry. No change to the public tracking authorization contract.

## Baseline and policy

| Control | Resolved value |
| --- | --- |
| Frontend baseline | `b3d7610bf227d7ab63db95d916dee2f42e3aa57e` |
| Backend baseline | `f2141f60f2023405ae7ddec5987f13784dd2e76b` |
| Local branches | `codex/repair-ready-email` in both repositories, created from the baselines |
| TDD | ON; explicit prior session choice in `odd/tasks/charge-session-expiry.md:15` |
| Backend runners | Installed Java 21/Maven wrapper; offline Surefire and PostgreSQL/Failsafe in secret-free temporary snapshots |
| Frontend runners | Installed Vitest/Node tooling and Playwright; lint, typecheck, technical build |
| Native RDD | ON, deciding source global; verified by `gentle-ai review mode status` on 2026-10-03 |
| Review boundaries | Frontend baseline above; backend baseline above for this new feature only; no inherited-feature approval claimed |
| Delivery | `ask-on-risk`; reuse the user's cached `feature-branch-chain` choice, no push/PR authorization |
| Forecast | 1,060–1,560 authored additions + deletions, including tests/docs; generated outputs excluded |

The line budget is a planning heuristic, not a code-golf target. E2 may naturally exceed 400 because persistence/transport certainty need cohesive tests. Make one honest slicing pass; do not omit tests or compress readable code. No PR slices are materialized yet; record exact committed boundaries before any authorized PR work.

Preserve both untracked `.atl/` directories and the pre-existing backend change in `odd/tasks/v38-deploy-fixes.md`. Do not load private property files, credentials, authenticated provider sessions, or the shared database. Temporary tests may use isolated local PostgreSQL and synthetic email observers only; downloads/provider calls are not authorized.

## Tasks

- [ ] **E1 Capture a durable completed-repair event.**
  - Route: delegated writer; mapping/preparation spans more than four source/contract/test files, and implementation touches multiple non-trivial files. Parent owns this tracker, its full Engram mirror, application of the allowlisted backend patch, commits, and native disposition.
  - Scope: next Flyway migration (verify V41 availability), dedicated persistence/enqueue code, default-off flag, both completion entry points, tests and bounded operation documentation. No dispatcher, SMTP transport, public status/retry API, or UI yet.
  - Acceptance: PUT/PATCH enqueue once after a real transition; disabled flag, other states, creation, and same-state replay enqueue nothing; missing email does not fail completion; rollback leaves neither completed state nor queued event; tenant isolation and concurrent replay hold.
  - Checks: observed RED before production edits, focused GREEN, related repair/subscription/transaction regression, PostgreSQL/Flyway rollback/deduplication/concurrency proof, compilation, migration configuration and diff checks. Full backend verification is required at coordinated feature closure and remains pending until observed; do not substitute H2 for physical-commit/migration proof.
  - Runtime boundary: isolated PostgreSQL service/API integration with recording transport; no real SMTP. Rollback: remove this event capture unit and its paired tests/docs without reverting prior release fixes or paid-subscription code.
  - Forecast: 280–390 authored lines; exact commands, counts, commit IDs, failures and native disposition pending.
- [ ] **E2 Deliver and recover without blind resend.**
  - Route: delegated writer; multiple non-trivial transport/persistence/API/test files and research/preparation boundaries.
  - Scope: text/HTML template containing the existing public link, dedicated SMTP result contract, independent worker/claim/lease/ACK, tenant-scoped GET status and safe POST retry, operational docs and tests.
  - Acceptance: no SMTP inside the repair transaction/row lock; honest accepted/not-delivered wording; known pre-send failure retry, uncertain send/ACK/lease never automatically resent; current tenant/recipient/state validated; missing email can recover after correction; disabled flags/recovery quarantine prevent sends; no arbitrary-recipient endpoint.
  - Checks: focused RED/GREEN and PostgreSQL worker/lease/ACK/concurrent-retry tests, synthetic MIME observer, API tenant/role regression, full backend gate at feature closure. No provider delivery proof or activation.
  - Forecast: 500–750 authored lines; cohesive delivery slices to be refined from actual code without size-only rework.
- [ ] **E3 Show notification status and protect its public link.**
  - Route: delegated writer; multiple non-trivial React/API/test files, with a bounded telemetry regression.
  - Scope: completion-detail notification status/retry, DTO/hooks/query keys and tests, redact tracking code/link from Sentry payloads. Keep manual WhatsApp unchanged.
  - Acceptance: missing email/failure does not block repair; only safe retry is offered and never auto-retried; stale/foreign workshop responses cannot update the current view; bearer link does not leak through telemetry; public budget view remains compatible.
  - Checks: focused RED/GREEN, complete Vitest/tooling, lint/typecheck/technical build, simulated browser completion/status/retry/WhatsApp flow; coordinated backend full gate and isolated end-to-end proof before feature closure. Public build/provider/deployed proof remain separate release gates.
  - Forecast: 280–420 authored lines. Rollback this UI/telemetry unit together with its tests, preserving the existing manual WhatsApp and public view contract.

## Progress and next step

Read-only mapping verified the existing budget/tracking link, both transactional completion routes, optional customer email, and the account SMTP adapter's inability to report delivery certainty. Local branches are created; source checks, work-unit commits, and feature review are not yet run.

Next: implement E1 with RED evidence in a new secret-free temporary snapshot, then apply only the authorized backend files after verification. Record concrete evidence before checking the task off. E1 alone does not send customer emails; E2/E3 and coordinated feature regression remain required.

Engram recovery topic: `odd/repair-ready-email/tasks`; repository-relative locator: `odd/tasks/repair-ready-email.md`. Mirror must contain the full current document, not a completion summary.
