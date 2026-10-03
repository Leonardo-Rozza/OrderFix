# Send a safe customer email when a repair is completed

Status: E1 capture implemented and locally verified; native review awaits user consent. E2/E3 and actual delivery are pending.

## Outcome and authorization

Send one automatic transactional email when an existing repair changes to `COMPLETADO`. Reuse the existing `/seguimiento/{codigoSeguimiento}` link, where the customer can view the latest budget and repair status. Keep customer email optional and preserve manual WhatsApp. A transport failure must not roll back the repair.

User approval: “Dale, eso ... tenemos el link del presupuesto ... vamos a hacerlo así” after approving an initial completed-repair email. This feature does not authorize real sends, provider access, setting changes, payment activation, push, PRs, merge, or deployment. Paid PRO and cancellation at the paid-period end remain a separate product decision/workstream, not part of these units.

## Design and boundaries

- One durable event per workshop, repair, and `COMPLETADO`, captured in the same transaction as an actual PUT/PATCH transition. Preserve no-op behavior; no historical backfill, direct completed-repair creation event, budget email, or `LISTO_SIN_REPARAR` email.
- Share the existing repair row lock across completion entry points and retain a database uniqueness constraint. A persistence failure may roll back the transaction; a later email transport failure must not.
- Store references and delivery metadata, not recipients, bodies, budget values, credentials, or the public tracking secret. Resolve and validate the current workshop/repair/customer before dispatch.
- Missing customer email records `SIN_EMAIL` without preventing completion. The capture capability flag is `ordenfix.reparaciones.email.enabled=false`; SMTP and scheduling stay off in this work.
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
| Review boundaries | Frontend `2c8473732b0b69b2be2caa7d9ac55c5ccd1f94b6` after passive preparation; backend baseline above for this new feature only; no inherited-feature approval claimed |
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
  - Outcome: implementation and functional checks observed; source commit `d6d9da0d75f08f89f62eb6fb277b817611c5c0f8`. Keep the task open until the pending native disposition is resolved; this is not an email-delivery claim.
  - Actual: 402 additions + 4 deletions = 406 authored lines, including tests/docs. The migration, transaction capture, and physical-commit/concurrency tests form one coherent unit; retain readable coverage rather than shrink the six-line review-budget overage. No PR is created or authorized.
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

Read-only mapping verified the existing budget/tracking link, both transactional completion routes, optional customer email, and the account SMTP adapter's inability to report delivery certainty. E1 was implemented through the delegated writer in a secret-free snapshot, independently verified by the parent, and applied byte-for-byte to the backend.

### Work-unit boundaries

| Unit | Repository and committed boundary | Evidence / disposition |
| --- | --- | --- |
| Preparation | Frontend `b3d7610bf227d7ab63db95d916dee2f42e3aa57e..2c8473732b0b69b2be2caa7d9ac55c5ccd1f94b6` | 87 additions + 13 deletions = 100 authored; 15 local references and whitespace passed; native `passive`, `non_executable_only`, no functional approval |
| E1 capture | Backend `f2141f60f2023405ae7ddec5987f13784dd2e76b..d6d9da0d75f08f89f62eb6fb277b817611c5c0f8` | `feat(notifications): capture completed repair email events`; 7 files, 406 authored; native `medium`, `slice_budget_reached`, awaiting fresh user consent |

Running feature count through the source unit: 506 authored lines, plus this evidence-only tracker update. Delivery retains the cached `feature-branch-chain` choice; no push/PR/merge. Planned slices are the preparation unit, cohesive E1 capture, E2 delivery/API, and E3 UI/privacy; actual E2/E3 boundaries remain unset. Any future E1 PR would need explicit acceptance of its 406-line cohesive exception after this slicing pass; do not remove coverage to force the number under 400.

### E1 verification (2026-10-03)

Proof root: `/private/tmp/ordenfix-ready-email-e1.bSxxx2`; isolated Java 21/offline Maven with cached disposable PostgreSQL 16, synthetic mail observers, no provider calls or downloads. Exact launcher arguments are in `commands.json` at that root.

| Check | Observed result |
| --- | --- |
| RED before production changes | Compilation passed; 4 PostgreSQL assertions failed only because the event was absent, 0 errors/skips |
| Final focused/related Surefire | `reports/green-final-related`: 125 tests in 15 classes, 0 failures/errors/skips; command exit 0 |
| Final PostgreSQL/Failsafe | `reports/green-final-lock-pg`: 10 capture + 17 account post-commit = 27 tests, 0 failures/errors/skips; command exit 0 |
| Final compilation | 599 production and 471 test sources; exit 0 |
| Source transfer | Frozen patch SHA256 `b8c9821b78a5503bc150d9d8221f4a74a8a98473c020e4595404b9cf3579cf76`; allowlist manifest SHA256 `3a6838cd93afd80f2878b5a10149df863800dc585621aaa4033a09162a3009a8`; all 7 applied file hashes match the tested candidate |
| Safety / cleanup | No SMTP calls, recipient/body/tracking-secret storage, or activation. Existing 6 local containers and 2 cached images unchanged; temporary resources removed. Backend dirty release doc and both `.atl/` inventories preserved |
| Diff / migration | Allowlisted scope and whitespace passed; V41 migrated in real PostgreSQL, composite tenant FK and event uniqueness exercised |

Final count is **152 distinct tests**, not the sum of intermediate reruns. The physical-commit tests establish shared transaction identity, invisibility before commit, rollback/persistence-failure behavior, and both PUT/PATCH waiting on the same `SELECT ... FOR UPDATE`. Tests also cover no-op/other-state/direct-creation behavior, optional email, tenant isolation and replay uniqueness.

Preserved corrected failures: the first unit observer counted Spring's `JdbcTemplate` initialization (3 tests, 1 failure); clearing setup invocations before the operation fixed the observer, and final 5 unit tests passed within the 125. Proof-helper handling of expected `git diff --no-index` exit 1 and archive modes was corrected without production changes. Initial native assessment was unassessable until the canonical unrelated `.atl/` exclusion was declared; it was not treated as low risk.

### Pending native disposition and next step

Native assessment examined only the committed E1 boundary: 7 paths / 406 lines, `risk=medium`, `review_due=true`, `review_due_reason=slice_budget_reached`. The exact returned preflight STATUS ran, then excluded only `.atl/.skill-registry.cache.json` and `.atl/skill-registry.md` using its separately verified backend inventory `sha256:4425697ab74255760bb7c3b87dc13642263a59d4b65cc516abaa19765c94da71`.

Binding: target `sha256:b21b64b61f7784b83e2c110506c08bc9785fda8283d8b70da1328574ae073422`, lineage `review-f62b849907584842`; base tree `cbe0cc2787f932bd9010afc5d61c734ab6ecefa8`, candidate tree `53db367f6fea70a76c76fa58aabbb961044f5651`. The returned `review start --consent=relay` was rejected by auto-review before process creation because fresh user consent and potential review-service source disclosure were not authorized. **No reviewer ran and no approval exists.** Do not retry or bypass the rejection; ask the user once, then re-read current native STATUS after an explicit answer.

Next: resolve that consent, then continue E2 delivery/status/safe retry and E3 UI/link privacy. Full backend `clean verify`, frontend checks, joint browser proof, provider/deployed delivery, and paid-subscription work remain pending. E1 alone does not send customer emails; release T2 remains reopened for the coordinated candidate.

Engram recovery topic: `odd/repair-ready-email/tasks`; repository-relative locator: `odd/tasks/repair-ready-email.md`. Mirror must contain the full current document, not a completion summary.
