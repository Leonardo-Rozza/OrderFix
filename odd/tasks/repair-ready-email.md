# Send a safe customer email when a repair is completed

**Current status — 2026-10-04:** E1 capture, E1-C V41 compatibility, E2-S standalone transport, E2-M strictly accredited V42 delivery metadata, E2-W fenced delivery worker and E3-P telemetry privacy are implemented. The exact backend candidate through `e38bd4570f90915f26b7794bd7b9b34885215043` and frontend slice through `e5b5913ddb5869c584eedc5032a57b4a2b1e6205` have native approval and their actual acknowledgements, without findings or source corrections. Status/retry API, scheduler and status UI are still open. **Automatic sending, inbox delivery and production readiness are not established.**

## Quick path

1. Preserve the two acknowledged review boundaries below; do not repeat closed reviews or reuse consent for future candidates.
2. Resume **E2-A** from its read-only mapping after reconciling frozen E2-W source and this full mirror.
3. Complete **E2-A/E2-G/E3**, with observed checks and work-unit commits.
4. Run fresh coordinated backend/frontend/browser gates; real provider/deployed delivery needs separate authorization.

Historical detail: frontend `11ba24e`, proof roots below and `/private/tmp/repair-ready-email-tracker-pre-condense.md`. This remains the one feature document.

## Outcome, authorization and exclusions

Email the customer after a real existing-repair transition to `COMPLETADO`, reusing `/seguimiento/{codigoSeguimiento}` for latest budget/status. Optional email/manual WhatsApp preserved; transport failure never rolls back repair.

Original product approval and 2026-10-04 “Dale avanzemos con el envio de emails” authorize **local** implementation/synthetic checks only. No real SMTP/provider, activation, Railway/Vercel/shared DB/private config/payment/downloads/push/PR/merge/deploy. Paid PRO/paid-period cancellation is separate.

R1 was withdrawn on Oct3 and remains withdrawn. Later dedicated V41/Docker completion and local authorization supersede its blocker; new tests may use owned disposable PostgreSQL, never protected running backend/shared data. Pending checks are not waived.

## Current policy and recovery identity

Repositories: frontend `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`; backend `/Volumes/DiscoExtern/Desktop/mvrg-backend`. Both current branches: `codex/account-email-links`; historical feature branches: `codex/repair-ready-email`.

| Control | Current value |
| --- | --- |
| Resume baselines | Frontend `6330d8e5cded8678f6bfb19eb1be38aa7dcdc9e1`; backend `4c847abec4081c69094922b20ee4c3155b564074` |
| Original baselines | Frontend `b3d7610bf227d7ab63db95d916dee2f42e3aa57e`; backend `f2141f60f2023405ae7ddec5987f13784dd2e76b` |
| Evidence heads / reviewed boundaries | Frontend head and acknowledged boundary `e5b5913ddb5869c584eedc5032a57b4a2b1e6205`; backend head and acknowledged boundary `e38bd4570f90915f26b7794bd7b9b34885215043`. This subsequent documentary closure is outside those immutable candidates |
| TDD | **ON**, explicit prior choice in `odd/tasks/charge-session-expiry.md:15`; compilable assertion RED → GREEN → cleanup. Setup failures are not RED |
| Backend checks | Installed Java 21.0.10/Maven 3.9.11 directly, offline Surefire and real PostgreSQL/Failsafe in secret-free snapshots/settings; no wrapper bootstrap |
| Frontend checks | Installed Node 24.14.0/Vitest 3.2.6, Node tooling, lint/typecheck/technical build and Playwright; public-only snapshots/synthetic environment, no private `.env` loading |
| Native RDD | **ON/global**; new candidates require their own assessment, consent and exact lifecycle |
| Delivery | `ask-on-risk`, cached `feature-branch-chain`; no PR/push/merge authorized or materialized |
| Running count / forecast | **3,635 authored committed work-unit lines**, including source E2-M 736/privacy 151; separate V41/Docker features/generated outputs excluded. Remaining 820–1,340 after worker completion/API mapping; approximate feature 4,500–5,000 before future evidence revisions; re-estimate per unit |

About 400 authored additions plus deletions is a planning heuristic, not an acceptance cap. Preserve readable coverage and strict checks. Cohesive schema/admission exceeds it; a future PR size exception requires explicit acceptance. Record actual commit/slice boundaries.

## Fixed functional and safety contracts

### Capture, privacy and defaults

- One event per workshop/repair/`COMPLETADO`, in the same transaction as a real PUT/PATCH transition, with shared repair lock/database uniqueness. Disabled/no-op/other-state/direct completed creation capture nothing; no historical repair backfill, budget mail or `LISTO_SIN_REPARAR` mail.
- Missing email records `SIN_EMAIL` without blocking completion. Persistence failure can roll back repair/event; later transport failure cannot. Persist references/metadata only, never recipients/bodies/budgets/credentials/tracking secrets/raw provider errors.
- Resolve current workshop/repair/customer before dispatch. Dedicated transport/worker, independent of account closure; existing verification/reset mail unchanged. Bearer-code redaction preserves public tracking/budget and manual WhatsApp.
- Defaults: `ordenfix.reparaciones.email.enabled=false` and `ordenfix.reparaciones.email.delivery-enabled=false`; SMTP/scheduling remain off. Independent capture/mail/delivery/quarantine barriers precede provider resolution.
- Internal outcomes: `ACCEPTED`, `PRE_SEND_FAILURE`, `UNCERTAIN`, `DISABLED`; strict origin/single-address/header validation and transaction-active rejection. **Acceptance is not inbox delivery.** Pre-send failure can retry; uncertain send/SQL ACK, expired lease or in-flight attempt must never auto-resend. No exactly-once promise.

### Durable schema and fixed API

Immutable V42, not edits to existing migrations. States: `PENDIENTE`, `SIN_EMAIL`, `EN_CURSO`, `ACEPTADO`, `FALLO_PREVIO`, `INCIERTO`. Six fields: `attempt_count`, `available_at`, `lease_token`, `lease_until`, `accepted_at`, `updated_at`; attempts 0–10, lease/ACK/state consistency, bounded polling/expiry indexes. Backfill metadata on existing events only; old six-column enqueues remain valid.

Strict admission keeps frozen checksum/catalogs, ordered/latest history and sentinel 17; independent C/en_US migrated/restored profiles. Preserve historical target41/old constants and unknown V43/drift/downgrade rejection. Fingerprints omit physical `installed_rank`, so order checks remain independent; all read/row/trip/time/DML budgets stay unchanged.

GET `/api/reparaciones/{id}/notificacion-email`; POST `/api/reparaciones/{id}/notificacion-email/reintentos` with empty body. DTO only `estado`/`reintentable`, including derived `NO_EVENTO`/`DESHABILITADO`; verified current tenant and existing ADMIN/EMPLEADO permissions. No arbitrary recipient/sensitive payload/synchronous SMTP. UI offers server-authorized safe retry only, never automatic retry; stale/foreign-session responses cannot update the current view.

## Tasks and acceptance

Each source task uses **delegated mapping/preparation and a bounded writer**: 4+ files to understand, 2+ non-trivial files to implement. Parent owns decisions, task/mirror, allowlisted transfer, commits and native disposition. Fixed contracts above are acceptance criteria; observed checks below are evidence, not authorization.

- [x] **E1 Capture a durable completed-repair event.** V41/enqueuer/shared PUT/PATCH lock/default-off; commit `d6d9da0`, checked and native approved/acknowledged. Transaction, optional-email and replay checks below. Rollback capture with tests/docs only.
- [ ] **R1 Restore and verify the local Docker/Spring Boot runtime — withdrawn by user.** Historical native-PG health/JPA/41 migrations passed, but R1 Docker acceptance never established. Owned Java 68235/PG 67481 closed; not E1-C behavior proof or a scheduled retry. Later dedicated Docker evidence is separate.
- [x] **E1-C Restore guarded runtime compatibility with V41.** Dedicated `odd/tasks/v41-schema-compatibility.md` C1/C2/C3 (`fe1bec7`, `364a90a`, `cb82a0b`) supersede compile-only preparation. Migrated/restored strict accreditation preserves old migrations/business/roles/V38/equipment/charge/historical rejection. Rollback guards/tests/docs, not V41/legal data.
- [x] **E2-S Prepare the standalone repair-ready template and SMTP transport.** Commit `00b265d`, checked/native acknowledged. Text/escaped HTML/current link; no unnecessary personal/budget data/external images. Address/origin/header/barrier/transaction/certainty tests; remains unconsumed. Rollback adapter/template/port/tests/default/docs, preserving account mail.
- [ ] **E2 Deliver and recover without blind resend.** Overall task remains open.
  - [x] **E2-M Add and strictly accredit durable delivery metadata.** Commit `6605d6b`, 19 files/736 authored; migration/helper/guard selectors. Narrow allowed selector 42, exact six-field capture whitelist and 16-placeholder history classifier/sentinel 17; budgets unchanged. No worker/API/scheduler. Rollback new migration/admission/tests together before deployment, preserving V41/account/repair/permissions.
  - [x] **E2-W Implement fenced claim/send/ACK and safe recovery.** Depends on metadata. Claim committed before send, token-fenced ACK, bounded current tenant/repair/customer/open-workshop/recipient/lease revalidation immediately before SMTP. No SQL/repair transaction send or automatic ambiguous resend. PostgreSQL concurrency/lease/recovery TDD and synthetic transport/MIME. Commit `e38bd4570f90915f26b7794bd7b9b34885215043`: 9 paths, Git 971 additions + 21 deletions = 992 authored. Final PG108/unit153 verified on exact final source; medium/slice_budget_reached, fresh human consent followed by native approval/actual ACK. Rollback these nine files together, preserving V41/V42 and prior guards. The accepted boundary is retained below.
  - [ ] **E2-A Expose tenant-scoped status and safe retry.** Depends on worker; fixed API above, corrected missing-email recovery, no accepted/in-flight/uncertain resend or HTTP SMTP. PostgreSQL concurrent retry/API tenant/role RED/GREEN. New read-only mapping forecast 350–550 replaces 220–380; exact proposed boundary below.
  - [ ] **E2-G Wire the opt-in bounded scheduler.** Depends on worker/API; independent default-off scheduler and capture/mail/delivery/quarantine gates. Synthetic scheduler/runtime tests; separate authorization before activation. Forecast 120–240.
- [ ] **E3 Show notification status and protect its public link.** Remaining DTO/hooks/query keys/invalidation/status/retry UI. Missing/loading/error never block completion; safe retry/no stale foreign-session publication; WhatsApp/public budget preserved. RED/GREEN, complete frontend/tooling/lint/types/build, simulated browser completion/status/retry/WhatsApp and coordinated end-to-end gates. UI 350–550 replaces old combined 280–420 forecast; rollback UI/hooks/tests together.
  - [x] **E3-P Protect the tracking bearer secret in telemetry.** `src/lib/sentry.ts`/paired tests only; code/path/Error filtering preserves diagnostics/token filtering/original/shared references. Commit `b6bade6`, source 151, medium under_budget (not approval). No telemetry activation; rollback sanitizer/tests together.

## E2-W accepted implementation boundary

**Worker/Store/Permit/tests/docs only**, no migration/guard/API/UI/scheduler/capture/CRUD/JWT/auth or activation. Implementation committed and exact checks observed below; its exact native review is approved and acknowledged. TDD remains ON with the installed offline Java21/Maven3.9.11 runner above; future work requires a new source-bound snapshot and actual XML.

| Rule | Accepted technical choice |
| --- | --- |
| Public seams | `Worker.runNext()` at most one attempt; mandatory `Result send(Request, Permit)`, functional boolean Permit through Store; writer may choose minimal internal Store/claim signatures |
| Inert preparation exception | New compilable contracts may return no claim/permission/effect **before assertion RED**; compile-only preparation is not RED or successful behavior. Then observe PostgreSQL assertion RED before behavior writes |
| Barriers | Existing capture/mail/delivery false defaults; quarantine other than literal `"false"`, missing transport or active caller transaction: no claim/SMTP |
| Store/time | REQUIRES_NEW, READ_COMMITTED, timeout 5 s; authoritative `clock_timestamp()` checked **after lock waits**, not JVM/pre-lock time |
| Recovery | At most 20 expired leases, EN_CURSO→INCIERTO, clear lease, never requeue automatically |
| Claim | At most 20 PENDIENTE/FALLO_PREVIO candidates, available time/attempt < 10, order availability/creation/ID. Workshop admission before `FOR UPDATE SKIP LOCKED`; revalidate coherent tenant/repair/equipment/customer/current COMPLETADO/open workshop |
| Confirmed lease | EN_CURSO, increment attempt, random token, **120 s**. Unknown commit: no SMTP, never assume rollback |
| Permit | Before JavaMailSender resolution and after MIME immediately before send; verify current token/lease/state/relations/workshop/recipient/code against Request. False/throw/unknown commit: no SMTP. PII in memory only, no binds/logs; redacted Request/claim representations |
| Send/ACK | SMTP outside SQL transactions/locks. ACK locks first, checks fresh DB time/token/EN_CURSO; expired/replaced token cannot modify. Accepted→ACEPTADO, known pre-send failure→FALLO_PREVIO, absent email→SIN_EMAIL, ambiguous exception/null→INCIERTO; clear lease. Unknown ACK after send never compensates with resend/downgrade |
| Backoff | Known failure only: **30 s**, exponential doubling per attempt, maximum **1 h**, from DB time; cap 10, no retry in same invocation |

Exact nine-path backend allowlist, relative to backend root:

| Change | Path |
| --- | --- |
| New | `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStore.java` |
| New | `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailWorker.java` |
| New | `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailWorkerIT.java` |
| New | `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailWorkerTest.java` |
| Modify | `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailTransport.java` |
| Modify | `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/SmtpRepairReadyEmailTransport.java` |
| Modify | `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/SmtpRepairReadyEmailTransportTest.java` |
| Modify | `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailTransportConfigurationTest.java` |
| Modify | `docs/operations/email.md` |

No production `RepairReadyEmailTransportConfiguration.java` exists: configuration is SmtpRepairReadyEmailTransport's conditional annotation/values. `application.properties`: MAIL_ENABLED default false at 96, capture/delivery literal false at 168/170; no new class or default change.

Checks: visible committed claim before mock transport/no active transaction; **physical commit-then-throw** claim/ACK; concurrent claim/token replacement; ACK lock wait past expiry; recipient/equipment/code changes during MIME; permit false/throw; every barrier; eligibility/backoff/cap/privacy. Bounded latches/real PG locks, not timing-only sleeps. Permit is fresh authorization, not SQL/SMTP atomicity/exactly-once. New mapper forecast **650–1,000 authored** with readable physical coverage; supersedes 450–750, re-estimate totals before commit.

## E2-W committed verification (2026-10-04)

Commit `e38bd4570f90915f26b7794bd7b9b34885215043`, parent `6605d6b9353632ca44609e23197b2c444a11b936`; exact nine paths above. Staged whitespace exit0; all working/staged/committed file hashes match the tested snapshot. **Git 971 additions + 21 deletions = 992 authored** is the ledger/native metric. Frozen Python unifieddiff reports 972+22=994 for identical bytes; the first parent count guard stopped before commit, not a source/test failure. No coverage/source shrinking followed.

| Phase | Observed result / qualification |
| --- | --- |
| SMTP01 RED | 75 cases, 8 assertion failures, 0 errors/skips, exit1; mechanical/inert contracts compiled before feature behavior |
| PG01 RED | Real PG/Flyway42, 1 assertion failure, 0 errors/skips, exit1, inert worker before behavior |
| SMTP02 GREEN | 82/3 classes, 0 failures/errors/skips; older Store/WorkerIT revision, not final whole-source proof |
| PG02 attempted GREEN | 33 cases, 1 functional failure + 3 fixture errors, exit1; never GREEN. Expiry changed21 instead of20; old V33 correctly rejected closure/tenant-ID fixtures |
| PG03 isolated RED | 1 expiry-bound assertion failure, 0 errors/skips, exit1 on unchanged PG02 source |
| PG04 GREEN | 33 pass, 0 failures/errors/skips; final production but older WorkerIT, not final whole-source proof |
| PG05 final | **108/4 actual classes**: Worker38, Capture10, ClosureEffects43, ClosureStore17; 0 failures/errors/skips, exit0, 78.52s |
| Unit06 final | **153/11 actual classes**, including SMTP68/config7/Worker7 and account/closure/template/quarantine regressions; 0 failures/errors/skips, exit0, 4.37s |

Both final phases bind to identical before/after/final **1,299-file** manifest `f7b1b7726564db3aba46cbae943f93de0bce91673aaad81f8bbb1b015159361d`; **261 distinct final cases**, never a sum of reruns. Compilation observed607 main/480 test sources; no fresh full clean verify claimed. Physical PostgreSQL commit-then-08006 proves unknown claim→zero SMTP and unknown ACK→no resend. Tests verify committed visibility/no transaction at transport, pre/post-MIME permission, current recipient/equipment/customer/tracking/state/lease/token/real-closure changes, concurrent/SKIP LOCKED claims, 20-candidate scan, ACK lock wait/DB deadline, backoff/cap/privacy. The observed expiry bound bug was fixed with a materialized20-ID CTE, not guard relaxation. Fixtures use actual closure protocol/coherent pointers; original guards unchanged.

Frozen root `/private/tmp/ordenfix-ready-email-e2w.azjj8e4_`: 4,171 hashes independently verified; manifest `9928cf7ef17ac679f6eb8cc06cff7bf5af742d170531703446e1a7ab1ca07494`; patch `0e2a7bb5aeebc6ecf1f0768155006d5e42cb0a6061a1e607028f64acaca42837`; allowlist `0c76c0acdae162151b0408ebf7ea21cb15e774d0c34ba1a49ff4bf469ad32517`. Independent actual XML/source bookkeeping `/private/tmp/ordenfix-e2w-bookkeeping-53uu4ev6/receipt.json`, SHA `017b12a227cbed51e0837faf4972d625ac2a24aa25d2dad7540535cba92a1d14`. Parent integrity/transfer/commit receipts: `/private/tmp/ordenfix-email-e2w-parent-{integrity,transfer,commit}.json`. Original1,295 public hashes/6 protected hashes preserved before transfer; after transfer1,290 old files unchanged and1,299 final files match. Protected JAR hash unchanged. Parent `kill(pid,0)` was unavailable with sandbox EPERM, not proof of process exit; writer confirms PID11272 alive. No runtime restart.

**Inventory mistake and containment:** initial owned unfrozen Docker preservation record collected overly broad metadata that could include Config.Env/Cmd/Args. Replaced before freeze with explicitly safe fields; no broad stdout/duplicates retained, no credential values displayed/used, no original resource mutation. `inventory-scope-correction.json` documents it. Retained inventories certify safe IDs/Image/Created/Running/StartedAt/network-attachment equality and48 images/8 containers/5 networks, not private-config equivalence or forensic secure erasure. Never collect broad private metadata again.

Native: first undeclared `.atl`/read-only `.git` attempts failed safely and were retained, never inferred low risk. Scoped local retry/exclusion of only verified two `.atl` files succeeded: **medium,992 lines, slice_budget_reached**, exact returned committed-only preflight ran. Target `sha256:9d3bc7abc5976bb98c1fdcf042d1ef66e80d73981f7df7e45dddb878afe854eb`, lineage `review-1d8cf3470d065a22`, base tree `e510458002be4f33ac94db5f53444d9426473460`, candidate tree `51b048adb0567374d09b2e223346360afffd3237`, paths digest `sha256:14a1678bea5fe12f077f376f0959ff75f22cb44066ba5db5b31aa6fc0246677f`. Initial START consent=relay returned **consent_required**; retained `/private/tmp/ordenfix-email-e2w-{assess-final,preflight,ready-status,consent-relay}.json` is historical, not the final state. Fresh human “Si” authorized this exact candidate and the frontend slice; current approved/acknowledged closure is below. Backend boundary advances to e38bd457. No provider, activation, API, scheduler, UI, migration, Docker build, browser, full verification, remote push/PR/merge or deployment was included.

## E2-A next mapping — not implemented

Read-only current6605d6b mapping/full mirror reconciled; reconcile against frozen E2-W before any writer. Business EMPLEADO uses existing **ROLE_USER**, not ROLE_EMPLEADO (`persistence/entity/enums/UserRole.java:3–5`, `config/security/AuthenticatedUserPrincipal.java:34`); ADMIN remains ROLE_ADMIN. No security/schema expansion.

Parent accepts a separate controller/status service with only the fixed two-field DTO. GET never changes rows/recovers leases; foreign/missing repair returns indistinguishable404. Preserve persisted truth when flags are disabled and set reintentable=false; derive DESHABILITADO only when there is no event and gates are disabled, otherwise NO_EVENTO. POST body must actually be empty; no recipient/configurable query or SMTP. Safe repeated POST returns current DTO without another enqueue. Mutation only for corrected valid-email SIN_EMAIL or eligible due FALLO_PREVIO below cap10; preserve attempts/backoff, no accepted/inflight/uncertain/historical event retry.

Transaction starts before `TenantService.currentTallerId()`; READ_COMMITTED explicit even for readonly GET, preserving WorkshopClosureGate admission. POST admission→tenant repair lock→event lock→fresh DB time/re-read current relations/gates/state/email/cap. Frozen E2-W inspected by parent: claims/ACK never lock repair rows, so no inverse event→repair-lock ordering. All PII validation in transient memory only.

Proposed six-path backend unit: new `controller/RepairReadyEmailController.java`, `service/dto/reparacion/RepairReadyEmailStatusDTO.java`, `service/notification/RepairReadyEmailStatusService.java` beneath existing main package; new `service/notification/RepairReadyEmailStatusServiceTest.java` and `service/notification/RepairReadyEmailApiIT.java` beneath existing test package; modify `docs/operations/email.md`. Forecast350–550 authored, advisory only. Before writer, freeze full absolute/relative allowlist and exact inert-contract preparation if needed; TDDON/offline installed Surefire/Failsafe. Tests: real JWT ADMIN/USER/tenant/account/workshop barriers, truly empty body/privacy, GET no writes, corrected email/cap/backoff, concurrent retry/claim/delete/customer/closure races, physical rollback and zero SMTP. Mapping ran no tests or mutations and provides no future GREEN evidence.

## Observed verification — never sum reruns

| Unit | Observed checks and retained limits |
| --- | --- |
| E1 | RED:4 PostgreSQL assertion failures,0 errors/skips. Final125 Surefire/15 classes and27 Failsafe =152 distinct pass cases; compile 599/471. Physical commit/rollback/tenant/FK/uniqueness/concurrency/no-op/creation/optional-email exercised. Initial JdbcTemplate observer/proof helpers corrected, no SMTP |
| E1-C | Dedicated V41 full 10,605 cases/427 classes,0failure/error/skip,56m38s;22 real browser cases separately. **Not** a fresh full V42 feature run; earlier failures retained. No SMTP inbox/Cloudinary/MercadoPago proof |
| Docker | Canonical V41 image/PG16.14/Flyway41/JPA/health/readiness/liveness, UID999/artifact/config/migration guards passed. 27 opt-in flags off, **not all schedulers**. Prior offline Maven-parent failure retained; not new V42 sending proof |
| E2-S | RED 70/65 failures; focused 71/3 classes, related138/10 classes pass; compile 602/474. Mocked SMTP only. Five MIME LF/CRLF observer assertions corrected without production change; no runtime/provider delivery |
| E3-P | RED 19/15 failures, refinement 22/1 encoded-space failure, focused 22 pass. Corrected full Vitest 1,125/114 files, tooling 44, lint/types/technical build exit0. Initial 324 failures/8 errors: synthetic port1/MSW localhost8080 mismatch; unchanged candidate passed corrected environment. Public-only envDir:false.668.49kB warning/DateInput intermittency remain. Browser/provider N/A for privacy alone, pending coordinated feature |

### E2-M phase-specific proof

Every retained phase source-before/source-after manifest is stable. Counts are from actual current Surefire/Failsafe XML, excluding prior-report directories; no cumulative rerun total is asserted.

| Phase | Cases | Failures | Errors | Skips | Actual scope / result |
| --- | ---: | ---: | ---: | ---: | --- |
| 01 schema RED | 1 | 1 | 0 | 0 | Missing delivery fields before migration write |
| 02 guard attempt | 5 | 3 | 0 | 0 | Recovery and unstable populated/fresh catalog failures retained |
| 03 catalog attempt | 1 | 1 | 0 | 0 | Populated/fresh catalog mismatch retained |
| 04 stability RED | 1 | 1 | 0 | 0 | Clean assertion before moving indexes |
| 05 admission RED | 5 | 3 | 0 | 0 | Positive consumer/recovery RED after stable migration, before guard writes |
| 06 focused attempt | 137 | 1 | 2 | 0 | Overall exit1: recovery 64/migration 1 pass; registration selector failure and two negative-fixture setup errors |
| 07 legal GREEN | 146 | 0 | 0 | 0 | V42 compatibility72 + historical V41 compatibility74, exactly two actual classes |
| 08 related regression | 238 | 2 | 0 | 0 | 13 actual classes; stale exact capture whitelist/history classifier failed; real registration writer 25/HTTP 11 and other listed classes passed |
| 09 corrected checks | 11 | 0 | 0 | 0 | Capture 10/capacity1, exact final original-snapshot source |
| 10 mail/quarantine | 138 | 0 | 0 | 0 | 10 actual mocked unit classes, exact final original-snapshot source |
| Corrected EOF migration | 1 | 0 | 0 | 0 | Fresh real PG/Flyway42 on the committed SQL; compile 605 main/478 test, staged whitespace exit0 |

Source qualification matters: phase06's passed recovery/migration files remained unchanged, but production `LegalRegistrationSchemaVerifier` changed later; this is **relevant unchanged-file reuse**, not a final-whole-candidate run. Phases07/08 match all final production/docs but differ in two later-corrected tests; phases09/10 match the entire original final snapshot. Requested `LegalRegistrationJdbcServiceIT` has no actual XML/coverage; registration writer/HTTP really ran in08.

### V42 stability and final correction

Timestamp columns were added nullable without volatile defaults, backfilled from `created_at`, then given CURRENT_TIMESTAMP defaults/NOT NULL: stable `atthasmissing`/`attmissingval`, valid six-column enqueues. Raw populated/fresh catalogs differed only in new-index `indcheckxmin` after HOT backfill. Observed RED preceded moving final indexes **before** backfill; empty/populated/restored profiles then agreed without VACUUM/reindex/normalization or V41 projection changes.

Staged whitespace found one extra EOF blank line in the **new/unapplied** V42 SQL; unstaged check had missed the untracked file. Retain exit2, not an initial pass claim. Fresh correction removed only that LF: 1,294 other source files identical, SQL tokens/Flyway11.14.1 checksum unchanged; fresh real-PG migration 1 passed and staged gate reproduced exit2→0. Commit702 additions/34 deletions =736 authored, not original737. Prior profiles/regressions remain **equivalent-SQL/unchanged-file reuse, not fresh reruns**.

## Native closure and delivery ledger

Backend range `fe1bec7..6605d6b`: high/process_boundary,22 paths/1,165 authored lines, budget200. Fresh human “Si vamos” authorized the separate local Codex CLI session to send **only this exact diff to OpenAI**, not SMTP/cloud/deploy. All four compiled lenses (risk/resilience/readability/reliability) completed; final **approved**, exact ACK authority **burned**, consumed `sha256:6cb96f98c404d5b1076f3cc1aea142b270b1f811d2d8efbe861759aefd2a0bef`. Reviewed backend boundary **6605d6b**. Review actors added no test executions.

Informational R2/R3: optional V41/V42 measurement writers share a versionless output directory. Frozen phase05 selected V42 only and all retained profiles end 42: proof **not invalidated**. No accepted correction task or reopening follows. Future combined measurement must avoid overwrite/ambiguous provenance.

Historical frontend `6330d8e..11ba24e`: medium,3 paths/252 net authored, under_budget. Closed committed slice `6330d8e5cded8678f6bfb19eb1be38aa7dcdc9e1..e5b5913ddb5869c584eedc5032a57b4a2b1e6205`: **medium,3 paths/480 net authored, slice_budget_reached**, approved and actually acknowledged; boundary advances to e5b5913. Failed undeclared `.atl`/sandbox/transport attempts retained, never inferred low risk. Canonical unchanged two-file `.atl` exclusion inventory: `sha256:4425697ab74255760bb7c3b87dc13642263a59d4b65cc516abaa19765c94da71`.

| Unit | Repository / commit | Authored / disposition |
| --- | --- | --- |
| Preparation | Frontend `2c8473732b0b69b2be2caa7d9ac55c5ccd1f94b6` |100; references/whitespace/passive |
| E1 | Backend `d6d9da0d75f08f89f62eb6fb277b817611c5c0f8` |406; checked/approved/acknowledged |
| E2-S | Backend `00b265d257bf44d87ebbe858bcf1d519e5236dbf` |576; checked/approved/acknowledged |
| E3-P + tracker | Frontend `b6bade67517b2ffd6b76cb4dce02a3c7a183318e` |187 including source 151; medium under_budget |
| Privacy closure | Frontend `ce99ba6b23cb23eaf4c2084aea1ee8783586c01e` |9 documentary |
| E2-M | Backend `6605d6b9353632ca44609e23197b2c444a11b936` |736; qualified functional/current acknowledged native approval |
| E2-M checkpoint | Frontend `11ba24e` |64 documentary; prior count2,281; frontend under_budget |
| E2-W | Backend `e38bd4570f90915f26b7794bd7b9b34885215043` |992 Git authored; final108PG/153unit; fresh consent, native approved/acknowledged |
| E2-W documentary checkpoint | Frontend `e5b5913ddb5869c584eedc5032a57b4a2b1e6205` |182 additions +180 deletions =362 authored; running3,635; complete committed slice480 native approved/acknowledged |

Historical documentary commits `c051ca5`, `ffdfb71`, `d6ecaa1`, `d08db65`, `c8a3316`, `f6e1ca4`, `84dd47e` and their passive checks remain in archived 11ba24e; prior running count 1,285. No PR exists. Future worker/API/scheduler/UI slices need exact boundaries/tests/docs; closed-candidate consent is not reusable.

## Proof locators and historical recovery

| Evidence | Immutable/local locator |
| --- | --- |
| E1 capture | `/private/tmp/ordenfix-ready-email-e1.bSxxx2`; `commands.json`, final related/PG reports and allowlist/hash evidence |
| Historical setup/withdrawal | `/private/tmp/ordenfix-ready-email-e1c.5QpiDI` (compile599/472 only, failed Docker/UI/inventory/wrapper setup); `/private/tmp/ordenfix-local-runtime-r1.Hx2eCS/proof/runtime-closed.json` (only Java68235/PG67481 closed) |
| Dedicated completed V41 | Frontend `odd/tasks/v41-schema-compatibility.md`; `/private/tmp/ordenfix-v41-c3.o5sjef1f`; backend `docs/verification/v41-combined-verification.md` |
| Dedicated Docker | Frontend `odd/tasks/docker-current-candidate.md`; `/private/tmp/ordenfix-docker-central.mhl8gcf8`; backend `docs/verification/docker-current-verification.md`. Prior offline failure `/private/tmp/ordenfix-docker-current.rw1d0dwp` retained |
| E2-S source/tests/native | `/private/tmp/ordenfix-ready-email-e2s.1Qh3ja`; `/private/tmp/ordenfix-email-e2s-parent.rfvqRA` |
| E3-P proof | `/private/tmp/ordenfix-email-privacy.XWKdiM`; 55 hashes verified, manifest `9e10be7b3359b5e18bda13758ae257a84ccd0882bad2cf26d99ddd7f1070f98a`; independent receipt `/private/tmp/ordenfix-email-privacy-parent-integrity.json` |
| E2-M original proof | `/private/tmp/ordenfix-ready-email-e2m.h4lnzk7c`; 1,617 hashes verified, manifest `642932e7280da5495ac0ad61833c2694f82ceab4509b5e6f9924341ff915f179`; original final1,295-source map `8e2ce2a29911bd14392574fdb7c05673363d54cf7f5450f3db413c9f63e6a1cc` |
| E2-M final correction | `/private/tmp/ordenfix-ready-email-e2m-eof.ksdyoznj`; 1,341 hashes verified, manifest `c08545f5150bb5d94fd0b0d64040388bff74a2468f23d123b837dfbaa3e97881`; final V42 SHA256 `98bc0fe6c296866d7c7ad32f63e9913bccc2a344c6b68db183d0c6667b57a282` |
| Independent E2-M validation | `/private/tmp/ordenfix-email-e2m-parent-integrity.json`, `/private/tmp/ordenfix-email-e2m-parent-transfer.json`, `/private/tmp/ordenfix-e2m-bookkeeping-jl6todo6/receipt.json` |
| Earlier E2-M native authority | `/private/tmp/ordenfix-email-e2m-native/backend-granted-start.json`, four `capture-review-*.json`, `backend-approved-acknowledgement.json`; lineage `review-11bf12eb78cb9c22`, target `sha256:d468241a1d8f2d75a07db03b06a3f06ee9d8af3079feaad908eace32bfdf816d` |
| Current two-review closure | `/private/tmp/ordenfix-email-two-reviews.z162qooi`; `{backend,frontend}-{refresh-status,granted-start,reviewing-status,capture-reliability,approved-acknowledgement}.json` and actual `.exit`/`.stderr` files; closure bindings below |
| Full pre-condensation history | Frontend commit `11ba24e` and `/private/tmp/repair-ready-email-tracker-pre-condense.md`; detailed bindings/commands/setup failures remain here, not in a second feature document |

Temporary paths may not survive cleanup: retain Git/source/docs as recovery anchors; do not delete proof or claim missing artifacts were reverified.

## Preservation, rollback and open gates

Preserve backend `odd/tasks/v38-deploy-fixes.md`, both `.atl/` inventories, tracker history, running Java PID 11272/old JAR and all unrelated Docker resources. No private properties/authenticated sessions/ambient credentials/shared DB. Synthetic cleanup touches captured owned resources only, never purge/prune/unrelated restart/settings/security/global cache or image cleanup.

E2-M correction directly measured48 images/8 containers/5 networks and metadata unchanged, no fixture resources left. Original E2-M inventory observed13 visible images only; separate48-ID historical baseline matched. Do not inflate its scope.

Before deployment, revert a coherent unit/tests/docs/dependencies without rewriting applied migrations or reverting prior release/legal/account/PRO work. Real activation remains separately authorized.

**Pending:** API/scheduler/status UI; fresh new-candidate backend clean verify, coordinated frontend/technical and Docker/browser end-to-end; public release gate; real SMTP/provider/inbox/deployed proof. Both exact native review closures are complete, not these functional/release gates. Historical V41/Docker successes do not certify V42 sending. **Limits:** DateInput intermittency,668.49kB bundle warning, local56m38s versus25min CI timeout (risk, not observed GitHub failure). Paid PRO unchanged/unactivated; separate release work remains.

## Next step and mirror

Parent reconciled the full file/mirror before delegating E2-W, verified frozen evidence and source, transferred/committed the exact nine files and assessed the new candidate. Both newly consented exact native reviews are now approved and acknowledged. Next functional unit is E2-A after freezing its exact six-path plan/TDD runner against backend e38bd457 in this file/full mirror; no E2-A source writer has started. New source commits need their own assessment/consent; neither closed review is reusable.

Repository-relative locator: `odd/tasks/repair-ready-email.md`. Engram recovery topic: `odd/repair-ready-email/tasks`. Mirror the **full current document**, not only a completion note; read back file and mirror. Do not invent a session ID. If mirroring fails, preserve local progress and mark it pending without blocking safe unrelated work.

### Two-candidate acknowledged closure — 2026-10-04

Human “Si” directly granted both exact committed diffs through the separate local Codex CLI session, sharing only with OpenAI. Fresh statuses verified unchanged targets before exact native granted transitions. Each medium candidate selected one consolidated compiled `review-reliability` lens, correction budget200. Root executed backend then frontend sequentially with ambient custom endpoints/API-key channels unset. Authentic capture-result calls used exact collect argument tokens, without manual results or a substitute review. Both captures exited0 with empty stderr, no findings, no source corrections. Actual exact ACKs each exited0, action `acknowledged`, authority `burned`.

| Binding | Backend worker | Frontend privacy/documentary slice |
| --- | --- | --- |
| Exact range | `6605d6b9353632ca44609e23197b2c444a11b936..e38bd4570f90915f26b7794bd7b9b34885215043`,9 paths/992 Git authored | `6330d8e5cded8678f6bfb19eb1be38aa7dcdc9e1..e5b5913ddb5869c584eedc5032a57b4a2b1e6205`,3 paths/480 net Git authored |
| Lineage | `review-1d8cf3470d065a22` | `review-943e1e8902b69207` |
| Target | `sha256:9d3bc7abc5976bb98c1fdcf042d1ef66e80d73981f7df7e45dddb878afe854eb` | `sha256:b22b3a3a6e03498905287a71cfbdddd1f57e5f94c5c4496cf0a9ab4eb487aed6` |
| Reliability result | `sha256:7175dcf6846db552bcfc63ac3d03fee7ff14bc9813dc454ba07fc3351f8b1544` | `sha256:cbf1696e58b8d276206e4928b9f273cdc68d40d02f8e2ce5c16cbc3f8d614e09` |
| Actual consumed revision | `sha256:6611608201fe08817d9f2765e79c9bcd766958a8da5c498edb5ce8b34f353142` | `sha256:db058e47a76a55ec8cbeee69c877d7598ac8cdbbdf0355fa2aa687721493227e` |
| New reviewed boundary | `e38bd4570f90915f26b7794bd7b9b34885215043` | `e5b5913ddb5869c584eedc5032a57b4a2b1e6205` |

Frontend base/candidate trees are `00c0924ff78d6635aa91271abb86fc9c3e13bbca`/`1f7e11ed0acc8ce42a2e906eede46bd1f4cca666`; paths digest `sha256:82c82b7dec428cf3c23253b1001437e9b13137dbaa792ff26594d86605b2cff3`. Exact three paths were this task document, `src/lib/sentry.ts`, `src/lib/sentry.test.ts`; privacy code/tests remain byte-identical to verified proof. Subsequent closure bookkeeping is not in either closed immutable candidate.

Reviewers inspected all9/all3 immutable patches respectively; no commands/tests or external-proof reads were performed. Approval adds static review evidence, **not** new functional, full-verification, SMTP/inbox or deployment evidence. This turn's route is inline one-file deterministic documentary closure with independent delegated receipt/identity bookkeeping; no source writer or implementation expansion. Runtime/tests are N/A for the documentation-only closure; retained earlier checks stay qualified. Rollback only this documentary closure, preserving all source/native receipts/history. No Railway/Vercel/SMTP/private configuration/push/PR/merge/activation or future candidate-sharing authorization is included. Closed reviews must not be repeated.
