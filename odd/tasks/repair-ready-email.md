# Send a safe customer email when a repair is completed

**Current status — 2026-10-04:** E1 capture, E1-C V41 compatibility, E2-S transport, E2-M V42 metadata, E2-W fenced worker, E2-A status/safe-retry API and E3-P telemetry privacy are implemented. API commit `238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4` has verified final161 PostgreSQL/352 unit-regression cases; its new native review awaits fresh sharing consent. Earlier backend through `e38bd4570f90915f26b7794bd7b9b34885215043` and frontend through `e5b5913ddb5869c584eedc5032a57b4a2b1e6205` remain approved/acknowledged, not reused for this API. Scheduler/status UI/full release gates remain open. **Real sending, inbox delivery and production readiness are not established.**

## Quick path

Resolve only the new E2-A review-sharing consent, then E2-G/E3 and fresh release gates. Closed reviews stay closed; provider/activation consent remains separate. The proof index retains full history; this remains one feature document.

## Outcome, authorization and exclusions

Notify after a real existing-repair transition to COMPLETADO, reusing /seguimiento/{codigoSeguimiento} for current budget/status. Email remains optional; preserve manual WhatsApp and never roll back repair for transport failure.

Original approval/Oct4 “Dale avanzemos con el envio de emails”: local implementation/synthetic checks only, no SMTP/provider/activation, Railway/Vercel/shared DB/private config/payment/downloads/push/PR/merge/deploy. Paid PRO/paid-period cancellation is separate.

R1 remains withdrawn (Oct3); dedicated V41/Docker proof supersedes its blocker. Pending checks remain required.

## Current policy and recovery identity

Repositories: frontend `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`; backend `/Volumes/DiscoExtern/Desktop/mvrg-backend`. Both current branches: `codex/account-email-links`; historical feature branches: `codex/repair-ready-email`.

| Control | Current value |
| --- | --- |
| Resume baselines | Frontend `6330d8e5cded8678f6bfb19eb1be38aa7dcdc9e1`; backend `4c847abec4081c69094922b20ee4c3155b564074` |
| Original baselines | Frontend `b3d7610bf227d7ab63db95d916dee2f42e3aa57e`; backend `f2141f60f2023405ae7ddec5987f13784dd2e76b` |
| Evidence heads / reviewed boundaries | Frontend head/effective boundary `1e9b74f1a1b186e23357d979be14ea768b2c8d56` (documentary passive assessment); last approved/ACK candidate `e5b5913ddb5869c584eedc5032a57b4a2b1e6205`. Backend head `238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4`, acknowledged boundary still `e38bd4570f90915f26b7794bd7b9b34885215043`; new API review due, consent pending |
| TDD | **ON**, explicit prior choice in `odd/tasks/charge-session-expiry.md:15`; compilable assertion RED → GREEN → cleanup. Setup failures are not RED |
| Backend checks | Installed Java 21.0.10/Maven 3.9.11 directly, offline Surefire and real PostgreSQL/Failsafe in secret-free snapshots/settings; no wrapper bootstrap |
| Frontend checks | Installed Node 24.14.0/Vitest 3.2.6, Node tooling, lint/typecheck/technical build and Playwright; public-only snapshots/synthetic environment, no private `.env` loading |
| Native RDD | **ON/global**; new candidates require their own assessment, consent and exact lifecycle |
| Delivery | `ask-on-risk`, cached `feature-branch-chain`; no PR/push/merge authorized or materialized |
| Running count / forecast | **4,873 authored committed work-unit lines** before this frontend documentary checkpoint, including E2-A1,195; separate V41/Docker features/generated outputs excluded. Remaining scheduler120–240/UI350–550 plus evidence revisions. Original API350–550 forecast exceeded coherently by physical race/security coverage, not source scope expansion or a hard budget breach; preserve readable tests and cached feature-branch-chain |

About 400 authored additions plus deletions is a planning heuristic, not an acceptance cap. Preserve readable coverage and strict checks. Cohesive schema/admission exceeds it; a future PR size exception requires explicit acceptance. Record actual commit/slice boundaries.

## Fixed functional and safety contracts

### Capture, privacy and defaults

- One workshop/repair/COMPLETADO event, unique and committed with the real existing-repair PUT/PATCH transition under its repair lock. Disabled/no-op/other-state/direct completed creation captures nothing; no historical backfill, budget mail or LISTO_SIN_REPARAR mail.
- Missing email records SIN_EMAIL without blocking completion. Persistence failure may roll back repair/event; transport failure cannot. Durable storage contains references/metadata, never recipient/body/budget/credentials/tracking secret/raw provider errors.
- Resolve current workshop/repair/customer at dispatch. Repair mail is separate from account verification/reset/closure mail. Preserve tracking/budget/manual WhatsApp; redact bearer codes in telemetry.
- Capture `ordenfix.reparaciones.email.enabled` and delivery `ordenfix.reparaciones.email.delivery-enabled` default false; SMTP/scheduling remain off. Independent capture/mail/delivery/quarantine gates precede provider resolution.
- Transport outcomes ACCEPTED/PRE_SEND_FAILURE/UNCERTAIN/DISABLED retain strict origin/address/header checks. Transaction, certainty and retry rules are specified in E2-W below; acceptance is not inbox delivery.

### Schema and API

Immutable V42, no prior migration edits. States: PENDIENTE/SIN_EMAIL/EN_CURSO/ACEPTADO/FALLO_PREVIO/INCIERTO. Fields: attempt_count/available_at/lease_token/lease_until/accepted_at/updated_at; attempts 0–10, state/lease/ACK consistency, bounded pending/expiry indexes. Backfill existing events only; six-column enqueues remain valid.

Strict admission retains frozen checksum/catalogs, ordered/latest history, sentinel 17, C/en_US migrated/restored profiles, target41/old constants and V43/drift/downgrade rejection. Fingerprints exclude installed_rank; independent ordering and all read/row/trip/time/DML budgets stay unchanged.

Fixed HTTP routes/two-field DTO and tenant/ADMIN/ROLE_USER contracts are fully specified in active E2-A. No recipient/sensitive payload/HTTP SMTP. E3 allows server-authorized manual safe retry only, not automatic or stale foreign-session publication.

## Tasks and acceptance

Source tasks use delegated preparation/mapping (4+ files) and a bounded writer (2+ non-trivial files). Parent owns decisions, task/mirror, transfer, commits and native disposition. Contracts are acceptance; verification is evidence, not authorization.

- [x] **E1 Capture a durable completed-repair event.** V41/enqueuer/shared PUT/PATCH lock/default-off; `d6d9da0`, checked/native approved/ACK. Checks below. Rollback capture/tests/docs together.
- [ ] **R1 Restore and verify the local Docker/Spring Boot runtime — withdrawn by user.** Native-PG health/JPA/41 migrations passed, not R1 Docker acceptance or E1-C behavior. Owned Java68235/PG67481 closed; no scheduled retry. Dedicated later Docker proof is separate.
- [x] **E1-C Restore guarded runtime compatibility with V41.** Dedicated `odd/tasks/v41-schema-compatibility.md` C1/C2/C3 (`fe1bec7`, `364a90a`, `cb82a0b`) supersede compile-only preparation. Preserve migrations/business/roles/V38/equipment/charge/historical rejection. Rollback guards/tests/docs, not V41/legal data.
- [x] **E2-S Prepare the standalone repair-ready template and SMTP transport.** `00b265d`, checked/native ACK; text/escaped HTML/current link, no unnecessary personal/budget data/external images. Address/origin/header/barrier/transaction/certainty checks, no provider delivery. Rollback adapter/template/port/tests/default/docs, preserving account mail.
- [ ] **E2 Deliver and recover without blind resend.** Overall task remains open.
  - [x] **E2-M Add and strictly accredit durable delivery metadata.** `6605d6b`, 19 files/736 authored; selector42, six-field capture whitelist, 16-placeholder history classifier/sentinel17, unchanged budgets. No worker/API/scheduler in this unit. Before deployment, rollback migration/admission/tests together, preserving V41/account/repair/permissions.
  - [x] **E2-W Implement fenced claim/send/ACK and safe recovery.** `e38bd4570f90915f26b7794bd7b9b34885215043`, checked protocol/native approved/ACK below. Rollback its nine paths together, preserving V41/V42/guards.
  - [x] **E2-A Expose tenant-scoped status and safe retry.** Exact six-path commit `238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4`, Git1,192 additions +3 deletions =1,195 authored. Final161 PG/352 unit-regression cases pass on exact final candidate, new-file-inclusive staged whitespace0. Corrected email/tenant-role/concurrency/rollback/no unsafe resend/HTTP SMTP verified below. Native medium/slice_budget_reached, new sharing consent pending; no approval claimed. Rollback only these six paths together, preserving Store/Worker/schema/auth.
  - [ ] **E2-G Wire the opt-in bounded scheduler.** Depends on worker/API. Default-off scheduler/capture/mail/delivery/quarantine gates; synthetic scheduler/runtime checks and separate activation authorization. Forecast 120–240.
- [ ] **E3 Show notification status and protect its public link.** DTO/hooks/query keys/invalidation/status/manual safe retry; missing/loading/error never blocks completion; no stale foreign-session publication, preserve WhatsApp/public budget. RED/GREEN, full frontend/tooling/lint/types/build and simulated browser completion/status/retry/WhatsApp/coordinated gates. UI 350–550 replaces 280–420. Rollback UI/hooks/tests together.
  - [x] **E3-P Protect the tracking bearer secret in telemetry.** `src/lib/sentry.ts`/paired tests; field/path/Error filtering preserves diagnostics/token filtering/original/shared references. `b6bade6`, source151, medium under_budget at that commit—not standalone approval. No telemetry activation. Rollback sanitizer/tests together.

## E2-W accepted implementation boundary

Completed Worker/Store/Permit/tests/docs, no API/scheduler/activation or migration/guard/CRUD/JWT/auth expansion. Exact nine-path rollback/transfer: committed `e38bd457`, `/private/tmp/ordenfix-ready-email-e2w.azjj8e4_/allowlist.json`. Historical inert contracts had no claim/permission/effect; only actual assertion RED—not setup/compilation—counted.

- **Entry/gates:** Worker.runNext handles at most one attempt; mandatory Result send(Request, Permit), boolean Permit through Store. Capture/mail/delivery false, quarantine other than literal "false", missing transport or active caller transaction prevents claim/SMTP.
- **Transactions/time:** REQUIRES_NEW, READ_COMMITTED, timeout 5 s; authoritative clock_timestamp after lock waits. Recovery materializes at most 20 expired EN_CURSO IDs, changes to INCIERTO/clears lease, never requeues.
- **Claim:** scan at most 20 due PENDIENTE/FALLO_PREVIO candidates with attempts < 10, ordered availability/creation/ID. Workshop admission precedes event FOR UPDATE SKIP LOCKED; current tenant/repair/equipment/customer must cohere, repair COMPLETADO/workshop open. Increment attempt, random token, 120 s lease; unknown commit means no SMTP, never assume rollback.
- **Permit/send:** check before JavaMailSender resolution and after MIME immediately before send; fresh token/lease/state/relations/workshop/recipient/code matches Request. False/throw/unknown commit refuses SMTP. PII in memory only, no binds/logs; redacted Request/claim. SMTP holds no SQL transaction/lock.
- **ACK/backoff:** lock event before fresh DB-time/token/EN_CURSO checks; expired/replaced token cannot change it. Accepted→ACEPTADO, known pre-send failure→FALLO_PREVIO, absent email→SIN_EMAIL, ambiguous exception/null→INCIERTO; clear lease. Unknown ACK never compensates by resend/downgrade. Known failure uses 30 s exponential doubling, max 1 h, cap 10, no retry within an invocation.

No main TransportConfiguration class exists: SmtpRepairReadyEmailTransport conditional annotation/values configure it. Public application.properties: MAIL_ENABLED default false at 96, capture/delivery literal false at 168/170.

Coverage below uses bounded latches/real PG locks, not timing-only sleeps, including denied/throwing permits. Permission is not SQL/SMTP atomicity/exactly-once. Actual committed Git metric: 992.

## E2-W committed verification (2026-10-04)

Commit `e38bd4570f90915f26b7794bd7b9b34885215043`, parent `6605d6b9353632ca44609e23197b2c444a11b936`;9 paths. Working/staged/committed hashes match tested bytes; staged whitespace exit 0. Git971+21=992 is the ledger/native metric; Python unifieddiff972+22=994 describes identical bytes. The parent count guard stopped before commit, not a source/test failure; no source/coverage shrinking followed.

| Phase | Actual cases/failures/errors/skips and qualification |
| --- | --- |
| SMTP01 RED |75/8/0/0,exit 1; compilable inert contracts before behavior |
| PG01 RED |1/1/0/0,exit 1,realPG/Flyway42 inert worker |
| SMTP02 GREEN |82/3 classes, 0 failures/errors/skips; older Store/WorkerIT, not final whole source |
| PG02 attempted GREEN |33/1/3/0,exit 1; expiry changed21 instead of20; V33 correctly rejected closure/tenant-ID fixtures. Never GREEN |
| PG03 isolated RED |1/1/0/0,exit 1; unchanged PG02 source |
| PG04 GREEN |33/0/0/0; final production, older WorkerIT; not final whole source |
| PG05 final |108/4 actual classes: Worker38/Capture10/ClosureEffects43/ClosureStore17;0/0/0,exit 0,78.52s |
| Unit06 final |153/11 actual classes including SMTP68/config7/Worker7 plus account/closure/template/quarantine;0/0/0,exit 0,4.37s |

Both final runs bind to exact before/after/final 1,299-file manifest `f7b1b7726564db3aba46cbae943f93de0bce91673aaad81f8bbb1b015159361d`: 261 distinct cases, not summed reruns. Compile: 607 main/480 tests; no fresh full clean verify. Physical commit-then-08006 proves unknown claim→zero SMTP and unknown ACK→no resend. Recorded tests exercise the contract edge cases above, including real closure, SKIP LOCKED and ACK lock-wait/DB deadlines. Expiry fixed by materialized20-ID CTE; coherent actual-closure fixtures and original guards preserved.

Frozen `/private/tmp/ordenfix-ready-email-e2w.azjj8e4_`:4,171 verified hashes; manifest `9928cf7ef17ac679f6eb8cc06cff7bf5af742d170531703446e1a7ab1ca07494`, patch `0e2a7bb5aeebc6ecf1f0768155006d5e42cb0a6061a1e607028f64acaca42837`, allowlist `0c76c0acdae162151b0408ebf7ea21cb15e774d0c34ba1a49ff4bf469ad32517`. Independent XML/source receipt `/private/tmp/ordenfix-e2w-bookkeeping-53uu4ev6/receipt.json`, SHA `017b12a227cbed51e0837faf4972d625ac2a24aa25d2dad7540535cba92a1d14`. Parent integrity/transfer/commit: `/private/tmp/ordenfix-email-e2w-parent-{integrity,transfer,commit}.json`. Before transfer1,295 public/6 protected hashes preserved; afterward 1,290 old files unchanged/1,299 final match. Old JAR unchanged. Parent PID probe EPERM was not exit proof; writer confirms PID 11272 alive; no restart.

**Inventory containment:** an initial owned unfrozen Docker record collected broad metadata potentially including Config.Env/Cmd/Args. Before freeze replaced by safe allowlisted fields, no broad stdout/duplicates retained or credential values displayed/used; originals/resources unchanged. `inventory-scope-correction.json` limits proof to IDs/Image/Created/Running/StartedAt/network attachments and 48 images/8 containers/5 networks—not private-config equivalence or forensic erasure. Never repeat broad inspection.

Initial `.atl`/read-only `.git` native failures remain retained, never low-risk evidence. Historical consent_required receipts: `/private/tmp/ordenfix-email-e2w-{assess-final,preflight,ready-status,consent-relay}.json`. Final medium/slice_budget_reached approval/ACK is bound below.

## E2-A accepted implementation boundary — 2026-10-04

Read-only current6605d6b mapping/full mirror reconciled; reconcile against frozen E2-W before any writer. Business EMPLEADO uses existing **ROLE_USER**, not ROLE_EMPLEADO (`persistence/entity/enums/UserRole.java:3–5`, `config/security/AuthenticatedUserPrincipal.java:34`); ADMIN remains ROLE_ADMIN. No security/schema expansion.

Parent accepts a separate controller/status service with only the fixed two-field DTO. GET never changes rows/recovers leases; foreign/missing repair returns indistinguishable404. Preserve persisted truth when flags are disabled and set reintentable=false; derive DESHABILITADO only when there is no event and gates are disabled, otherwise NO_EVENTO. POST body must actually be empty; no recipient/configurable query or SMTP. Safe repeated POST returns current DTO without another enqueue. Mutation only for corrected valid-email SIN_EMAIL or eligible due FALLO_PREVIO below cap10; preserve attempts/backoff, no accepted/inflight/uncertain/historical event retry.

Transaction starts before `TenantService.currentTallerId()`; READ_COMMITTED explicit even for readonly GET, preserving WorkshopClosureGate admission. POST admission→tenant repair lock→event lock→fresh DB time/re-read current relations/gates/state/email/cap. Frozen E2-W inspected by parent: claims/ACK never lock repair rows, so no inverse event→repair-lock ordering. All PII validation in transient memory only.

Human “Dale avanzemos con el próximo paso” authorizes this local API unit. Root read/reconciled actual document/full840 and current backend e38bd457; fresh narrow delegated mapping found no product gap. Route: **delegated preparation/mapping + one bounded writer**, because understanding spans4+ files and implementation includes5 non-trivial new Java files plus operations docs. Parent owns this file/full mirror, exact transfer, Git/native lifecycle; prior approved reviews stay closed. Forecast350–550 authored remains advisory, not a code/test cap; cached ask-on-risk/feature-branch-chain continues. No scheduler/UI/schema/Store/Worker/security expansion or SMTP activation.

**Frozen six-path allowlist.** Backend root `/Volumes/DiscoExtern/Desktop/mvrg-backend`; every final path is the root plus its exact repository-relative locator below. Writer works only in a new public-only owned `$SNAP/source`, copied from committed e38bd457; exclude private properties/.env/.atl/.git/target and never alter originals or old frozen proof/runtime resources. Five Java files are new; only existing operations doc is modified.

| Repository-relative locator | Final absolute locator |
| --- | --- |
| `src/main/java/com/leonardorozza/mvgrreparacionesbackend/controller/RepairReadyEmailController.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/main/java/com/leonardorozza/mvgrreparacionesbackend/controller/RepairReadyEmailController.java` |
| `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/dto/reparacion/RepairReadyEmailStatusDTO.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/dto/reparacion/RepairReadyEmailStatusDTO.java` |
| `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStatusService.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStatusService.java` |
| `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStatusServiceTest.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStatusServiceTest.java` |
| `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailApiIT.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailApiIT.java` |
| `docs/operations/email.md` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/docs/operations/email.md` |

**HTTP-first TDD ON:** source is explicit prior user choice at frontend `odd/tasks/charge-session-expiry.md:15`. Write ApiIT using literal routes/existing DTO-independent JSON assertions, real PostgreSQL/Flyway42/JWT/security chain before production code. Observe compilable absent-route-versus-expected200 assertion RED, not setup/compile failure. Forecast404 was corrected to observed500: existing generic exception handling maps the absent-resource fallback to500; do not alter that unrelated handler/security or add a test-only response handler. No inert production scaffold exception is needed/authorized. Then implement only allowed production paths to GREEN, paired focused unit tests and refactor. ApiIT owns a local NoScheduling fixture; existing CaptureIT nested fixture is inaccessible. No mocked authentication substitutes for real token/role/account/tenant HTTP acceptance.

**Exact installed runners:** from `$SNAP/source`, Java home `/Users/leonardorozza/Library/Java/JavaVirtualMachines/corretto-21.0.10/Contents/Home`, executable `/Users/leonardorozza/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn`, flags `-o -s "$SNAP/settings.xml" -gs "$SNAP/global-settings.xml" "-Duser.home=$SNAP/home" "-Djava.io.tmpdir=$SNAP/tmp" -Djunit.jupiter.tempdir.cleanup.mode.default=NEVER`. Surefire selector `-Dtest=RepairReadyEmailStatusServiceTest test`; PostgreSQL/Failsafe selector `-Dit.test=RepairReadyEmailApiIT test-compile failsafe:integration-test failsafe:verify`. Preserve POM Mockito javaagent; no skipTests/bootstrap/downloads/hidden missing selectors. Each phase records exact command/env, current actual XML/testcase counts, exit/log hash and whole-source before/after manifest; retain failed/setup phases honestly, do not sum reruns.

**Accepted precision:** read persisted event truth independently of worker's private COMPLETADO/current-inner-join eligibility projection; later ENTREGADO or incoherent current relations must preserve actual state with reintentable=false, not invent NO_EVENTO. Derive retry eligibility separately, including gate/cap/due/current email/coherence checks. GET no DML or lease recovery. POST rejects any actual byte in the body (including chunked input), not merely nonzero Content-Length; no configurable recipient/query/SMTP. Pure local validation only, no provider resolution. Existing token/account/workshop barriers and indistinguishable missing/foreign404 remain.

**Acceptance and applicable checks:** observe HTTP RED then final API+unit GREEN and related Worker/Capture/SMTP/account/workshop-closure regressions on exact final source. Exercise ADMIN/USER/foreign/inactive/unverified/workshop barriers, empty-body/query/privacy, all persisted/derived states with gates on/off, GET read-only, changed delivered/incoherent relationships, corrected-email and due/cap/backoff preservation, repeated/concurrent retry and worker/delete/customer/closure races, physical rollback and zero SMTP. Use fresh synthetic env-i/HOME/settings and public config only; owned disposable cached PostgreSQL fixture is permitted, existing48 images/8 containers/5 networks and protected old backend/JAR remain unchanged. Acquire only narrow explicit safe Docker fields from outset, never broad inspect/credentials/private configs/prune. No remote/provider/private session access. Runtime acceptance here is real local HTTP/PG, not SMTP/inbox/deployed proof. Check new-file-inclusive whitespace, exact allowlist/public source hashes and preserved originals before root transfer. Rollback these six paths together only, preserving committed Store/Worker/V41/V42/auth/account/PRO contracts. Remaining full coordinated release gates are separate, not waived by this API unit.

## E2-A committed verification and fresh native checkpoint

Initial frozen candidate `/private/tmp/ordenfix-ready-email-e2a.t79cd1lu`:4,194 hashes, manifest `c120be18f19d7f2a534c14852f943ce3c4eef0a02415f16822a24a3442b14ad0`,1,304-source map `138d4e3b6864c394c5351bb60e79f31d2fefa17dd16bca7ccf09bc33fb0f6bd2`. Focused71 unit/50 API and initial final161 PG/352 unit pass, not cumulative distinct totals. Independent old-proof receipt `/private/tmp/ordenfix-e2a-proof-bookkeeping-3bck4y9y/receipt.json`, SHA `d771801d1799f87a062c2b902b140ecd958c1e572be5fd582870bbf32793571b`.

Parent found a stale preceding operations paragraph saying API pending. New immutable docfix candidate changes only that paragraph (3 deletions/4 additions); all5 Java/1,303 other files unchanged. Old4,194 proof entries remain unchanged. New final root `/private/tmp/ordenfix-ready-email-e2a-docfix.3al0ry4z`:4,151 hashes, manifest `c72a2e8c8dcc66f6db842dc47e25e06b1f3b70a31561f2948fa8b87296b4340f`,1,304-source map `5f3cefe65d6d954fbf939f51346a061820f344a30ce9b0fbe9170081b2bbc57a`,6-path allowlist `256cf8bdc0ebed2cc72042a9ab44f2ceeb9ce245583eb12331c114e400f5652c`, patch `8b4f6250007febf9b6e8f78d0afb178e977fb2f5e5c212c501f8b1952f79c2cc`. Retained `freeze-attempt-01.json` is helper Path-shadowing TypeError, corrected only in unfrozen proof helper; no test/source change.

| Fresh final phase | Actual cases/classes | Observed result/source |
| --- | --- | --- |
| Docfix01 PostgreSQL |161/6: API50,Worker38,Capture10,ClosureEffects43,ClosureStore17,ClosureHttp3 |0 failures/errors/skips, exit0, real PostgreSQL/Flyway42/JWT/security; compiled610 main/482 tests |
| Docfix02 unit/regressions |352/21, including Status71, prior mail/worker/quarantine153 and account/JWT/workshop regressions |0 failures/errors/skips, exit0; reused compiled classes, no new compile marker |

Both fresh phases' full1,304 before/after manifests equal exact final candidate: **513 distinct final cases**, never sums of reruns. Earlier phase02 RED remains unchanged-production-code TDD evidence, not a fresh final-whole-source RED. API tests use real Spring MVC/JWT/filter chain and physical PostgreSQL, mock transport/no scheduling; unknown-length body tests use a Servlet wrapper, **not network-wire chunked exchange**. Physical lock waits/current email/DB clock, worker claim/delete/closure races, rollback, tenant/role/account barriers, all persisted/derived states/noDML/noSMTP/cap/backoff/privacy observed.

Root rehashed all4,151/final1,304/allowlist6/original1,299/protected6, inspected actual XML/testcase counts/exits/log hashes; independent final bookkeeping `/private/tmp/ordenfix-e2a-docfix-bookkeeping-xilr98i4/receipt.json`, SHA `cc7835c1b802e57b769330b96b900f8d0236a7d6a17803e929935593abd7935d`, verified, no discrepancies. Parent receipts `/private/tmp/ordenfix-email-e2a-parent-{initial,final}-integrity.json`; transfer/commit/staged-check/numstat under `/private/tmp/ordenfix-email-e2a-parent`. After exact transfer/commit all1,304 source/staged/committed bytes match;1,298 old files unchanged,5 new. Protected JAR/v38/.atl/PID11272 and narrow safe Docker48/8/5 identity/runtime/network fields unchanged; no fixture leftovers or manual/global cleanup. No private-config equivalence claim.

Native actual assessment from acknowledged e38bd457: **medium,6 paths/1,195 Git authored, review_due=true/slice_budget_reached**. Exact returned STATUS ran; native collect requested intended-untracked selection. Declared exclusion only of the two verified .atl files; local ready STATUS exit0 kept exact committed candidate. Target `sha256:89e04b116a610f36d7902de1550794c31204706e689bde764f0b40306f00afc8`, proposed lineage `review-cdf7f76d7a7d81fd`, base/candidate trees `51b048adb0567374d09b2e223346360afffd3237`/`96443fdf5deb57eda89fa8b7486bf1c713478eed`, paths `sha256:3939e133b03eab3d4a5b890d140fe0548e045773fc168a320adb4cb2c729eb70`. `/private/tmp/ordenfix-email-e2a-parent/{assess,preflight,ready-status}.json`/exits0.

Attempt to execute exact returned START consent=relay was **rejected by runtime auto-review before execution** because prior human grant covered only the old two candidates, not new OpenAI sharing. No START response/consent-required receipt/new authority/actor/approval exists; do not bypass or retry indirectly. Ask one fresh authorization for exact backend `e38bd457..238eb2b`,6 files, separate local Codex CLI session, sharing only with OpenAI. On grant refresh native statuses and follow returned transitions; on decline follow native ordinary policy, do not toggle global RDD. Backend reviewed boundary stays e38bd457. All defaults remain false; full clean release/frontend/Docker/browser/provider/inbox/deployed checks remain pending, not waived.

## Observed verification — never sum reruns

| Unit | Actual checks and limits |
| --- | --- |
| E1 | RED 4 PG assertion failures,0 errors/skips; final 125 Surefire/15 classes +27 Failsafe =152 distinct passes, compile 599/471. Commit/rollback/tenant/FK/unique/concurrent/no-op/creation/optional-email covered; JdbcTemplate observer/helpers corrected. No SMTP |
| E1-C | V41 full 10,605/427 classes, 0 failures/errors/skips,56m38s; 22 separate browser cases. Not a fresh V42 feature run; earlier failures retained. No SMTP inbox/Cloudinary/MercadoPago proof |
| Docker | V41 image/PG16.14/Flyway41/JPA/health/readiness/liveness, UID999/artifact/config/migration guards passed.27 opt-in flags off, not all schedulers. Prior offline Maven-parent failure retained; not V42 sending proof |
| E2-S | RED 70/65 failures; focused 71/3 classes, related 138/10 pass, compile 602/474. Mocked SMTP; 5 MIME LF/CRLF observer fixes without production change. No runtime/provider delivery |
| E3-P | RED 19/15 failures, refinement 22/1 encoded-space failure, focused 22 pass. Corrected full Vitest 1,125/114 files, tooling 44, lint/types/technical build exit 0. Initial 324 failures/8 errors were synthetic port 1/MSW localhost8080 mismatch; same candidate passed corrected public-only envDir:false. 668.49kB warning/DateInput intermittency remain. Browser/provider N/A for privacy; coordinated feature checks pending |

### E2-M phase-specific proof

Every retained phase source-before/source-after manifest is stable. Counts are from actual current Surefire/Failsafe XML, excluding prior-report directories; no cumulative rerun total is asserted.

| Phase | Cases | Failures | Errors | Skips | Actual scope / result |
| --- | ---: | ---: | ---: | ---: | --- |
| 01 schema RED | 1 | 1 | 0 | 0 | Missing delivery fields before migration write |
| 02 guard attempt | 5 | 3 | 0 | 0 | Recovery and unstable populated/fresh catalog failures retained |
| 03 catalog attempt | 1 | 1 | 0 | 0 | Populated/fresh catalog mismatch retained |
| 04 stability RED | 1 | 1 | 0 | 0 | Clean assertion before moving indexes |
| 05 admission RED | 5 | 3 | 0 | 0 | Positive consumer/recovery RED after stable migration, before guard writes |
| 06 focused attempt | 137 | 1 | 2 | 0 | Overall exit 1: recovery 64/migration 1 pass; registration selector failure and two negative-fixture setup errors |
| 07 legal GREEN | 146 | 0 | 0 | 0 | V42 compatibility72 + historical V41 compatibility74, exactly two actual classes |
| 08 related regression | 238 | 2 | 0 | 0 | 13 actual classes; stale exact capture whitelist/history classifier failed; real registration writer 25/HTTP 11 and other listed classes passed |
| 09 corrected checks | 11 | 0 | 0 | 0 | Capture 10/capacity1, exact final original-snapshot source |
| 10 mail/quarantine | 138 | 0 | 0 | 0 | 10 actual mocked unit classes, exact final original-snapshot source |
| Corrected EOF migration | 1 | 0 | 0 | 0 | Fresh real PG/Flyway42 on the committed SQL; compile 605 main/478 test, staged whitespace exit 0 |

Source qualification matters: phase06's passed recovery/migration files remained unchanged, but production `LegalRegistrationSchemaVerifier` changed later; this is **relevant unchanged-file reuse**, not a final-whole-candidate run. Phases07/08 match all final production/docs but differ in two later-corrected tests; phases09/10 match the entire original final snapshot. Requested `LegalRegistrationJdbcServiceIT` has no actual XML/coverage; registration writer/HTTP really ran in08.

### V42 stability and final correction

Added timestamp fields nullable, backfilled from created_at, then CURRENT_TIMESTAMP/NOT NULL: stable atthasmissing/attmissingval, valid six-column enqueue. Populated/fresh catalogs differed only in new-index indcheckxmin after HOT backfill. Assertion RED preceded moving indexes before backfill; empty/populated/restored profiles then agreed without VACUUM/reindex/normalization or V41 projection change.

Staged whitespace caught an extra blank EOF in new/unapplied V42; unstaged check missed untracked SQL. Retain exit 2, not an initial pass. Fresh correction removed only one LF: 1,294 other files identical, SQL tokens/Flyway11.14.1 checksum unchanged; fresh PG migration 1 passed, staged gate exit 2→0. Commit 702+34=736, not 737. Earlier profiles/regressions are equivalent-SQL/unchanged-file reuse, not fresh reruns.

## Native closure and delivery ledger

Historical `fe1bec7..6605d6b`: high/process_boundary, 22 paths/1,165 authored, budget 200. “Si vamos” authorized only that exact diff via separate local Codex CLI/OpenAI. Four compiled lenses approved, no reviewer tests; ACK burned, consumed `sha256:6cb96f98c404d5b1076f3cc1aea142b270b1f811d2d8efbe861759aefd2a0bef`, then boundary 6605d6b.

Optional V41/V42 writers share a versionless output directory (informational R2/R3). Phase05 selected only V42/all profiles end 42; proof remains valid, no correction task/reopening accepted. Future combined measurements must avoid overwrite/ambiguous provenance.

Frontend `6330d8e..11ba24e`: medium, 3 paths/252 net authored, under_budget. Failed .atl/sandbox/transport attempts never meant low risk; unchanged two-file exclusion digest `sha256:4425697ab74255760bb7c3b87dc13642263a59d4b65cc516abaa19765c94da71`. Current exact closures are below.

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
| Two-review closure | Frontend `1e9b74f1a1b186e23357d979be14ea768b2c8d56` |31 additions +12 deletions =43 authored, one document; running3,678; native passive/non_executable_only, review_due=false/reason=passive; boundary advances to this commit |
| E2-A | Backend `238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4` |1,192 additions +3 deletions =1,195 authored,6 paths; running4,873 before frontend checkpoint; final161PG/352unit, staged whitespace0; medium/slice_budget_reached, fresh sharing consent pending |

Archived in 11ba24e: `c051ca5`, `ffdfb71`, `d6ecaa1`, `d08db65`, `c8a3316`, `f6e1ca4`, `84dd47e` with passive checks; prior count 1,285. No PR; future slices need exact boundaries/checks/docs and fresh consent.

## Proof locators and historical recovery

| Evidence | Immutable/local locator |
| --- | --- |
| E1 capture | `/private/tmp/ordenfix-ready-email-e1.bSxxx2`; `commands.json`, final related/PG reports and allowlist/hash evidence |
| Historical setup/withdrawal | `/private/tmp/ordenfix-ready-email-e1c.5QpiDI` (compile 599/472 only, failed Docker/UI/inventory/wrapper setup); `/private/tmp/ordenfix-local-runtime-r1.Hx2eCS/proof/runtime-closed.json` (only Java68235/PG67481 closed) |
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

Preserve backend odd/tasks/v38-deploy-fixes.md, both .atl inventories, tracker history, Java PID11272/old JAR and unrelated Docker resources. No private properties/authenticated sessions/ambient credentials/shared DB. Clean only captured owned synthetic resources; no purge/prune/unrelated restart/settings/security/global-cache/image cleanup.

E2-M correction measured48 images/8 containers/5 networks/metadata unchanged, no fixtures left. Original E2-M inventory covered13 visible images only; separate48-ID historical baseline matched. Do not inflate its scope.

Rollback coherent units/tests/docs/dependencies before deployment, never rewrite applied migrations or revert prior release/legal/account/PRO work. Real activation requires separate authorization.

Pending: new API native consent/review, scheduler/UI; fresh backend clean verify, coordinated frontend/technical/Docker/browser E2E, public release gate, real SMTP/provider/inbox/deployed proof. API functional checks and closed earlier native reviews do not certify V42 sending. Limits: DateInput intermittency,668.49kB bundle warning; local56m38s versus25min CI timeout is risk, not observed GitHub failure. Paid PRO remains unchanged/unactivated; separate release work remains.

## Next step and mirror

Parent reconciled file/full840 before exact six-path/TDD plan freeze and bounded E2-A delegation. Initial `/private/tmp/ordenfix-ready-email-e2a.t79cd1lu` matched1,299 public baseline files. Phase01 compiled607 main/481 tests with realPG/Flyway42 but2 UUID36-varchar20 fixture errors, not RED. Only new ApiIT fixture corrected. **Phase02 genuine HTTP RED:**2 expected200-vs500 assertion failures/0errors/skips, exit1, stable1,300-file source; root XML/result/log verified absent-route NoResourceFoundException, logSHA `a119e26a6ca1b50adb0f0273c489c4c49436524c5684c7c602c0a5afd6ad76ef`. Existing generic handler explains500, correcting404 forecast without unrelated changes. No production classes existed before RED. Final API implemented/verified/transferred/committed; fresh native sharing consent remains next, not another implementation step. Earlier reviews remain closed. After native disposition, continue E2-G/E3 under local authorization, never real activation/deploy by inference.

Repository-relative locator: `odd/tasks/repair-ready-email.md`. Engram recovery topic: `odd/repair-ready-email/tasks`. Mirror the **full current document**, not only a completion note; read back file and mirror. Do not invent a session ID. If mirroring fails, preserve local progress and mark it pending without blocking safe unrelated work.

### Two-candidate acknowledged closure — 2026-10-04

Human “Si” granted only both exact committed diffs via separate local Codex CLI/OpenAI. Fresh statuses matched. Each medium plan selected one compiled consolidated reliability lens, budget 200; root ran them sequentially with custom endpoints/API-key channels unset, exact collect tokens/authentic capture calls, no manual/substitute result. Captures: exit 0, empty stderr, no findings/corrections. Actual exact ACKs: exit 0, acknowledged, authority burned.

| Binding | Backend worker | Frontend privacy/documentary slice |
| --- | --- | --- |
| Exact range | `6605d6b9353632ca44609e23197b2c444a11b936..e38bd4570f90915f26b7794bd7b9b34885215043`,9 paths/992 Git authored | `6330d8e5cded8678f6bfb19eb1be38aa7dcdc9e1..e5b5913ddb5869c584eedc5032a57b4a2b1e6205`,3 paths/480 net Git authored |
| Lineage | `review-1d8cf3470d065a22` | `review-943e1e8902b69207` |
| Target | `sha256:9d3bc7abc5976bb98c1fdcf042d1ef66e80d73981f7df7e45dddb878afe854eb` | `sha256:b22b3a3a6e03498905287a71cfbdddd1f57e5f94c5c4496cf0a9ab4eb487aed6` |
| Reliability result | `sha256:7175dcf6846db552bcfc63ac3d03fee7ff14bc9813dc454ba07fc3351f8b1544` | `sha256:cbf1696e58b8d276206e4928b9f273cdc68d40d02f8e2ce5c16cbc3f8d614e09` |
| Actual consumed revision | `sha256:6611608201fe08817d9f2765e79c9bcd766958a8da5c498edb5ce8b34f353142` | `sha256:db058e47a76a55ec8cbeee69c877d7598ac8cdbbdf0355fa2aa687721493227e` |
| New reviewed boundary | `e38bd4570f90915f26b7794bd7b9b34885215043` | `e5b5913ddb5869c584eedc5032a57b4a2b1e6205` |

Backend trees `e510458002be4f33ac94db5f53444d9426473460` / `51b048adb0567374d09b2e223346360afffd3237`, paths `sha256:14a1678bea5fe12f077f376f0959ff75f22cb44066ba5db5b31aa6fc0246677f`. Frontend trees `00c0924ff78d6635aa91271abb86fc9c3e13bbca` / `1f7e11ed0acc8ce42a2e906eede46bd1f4cca666`, paths `sha256:82c82b7dec428cf3c23253b1001437e9b13137dbaa792ff26594d86605b2cff3`. Three frontend files: this document, src/lib/sentry.ts, src/lib/sentry.test.ts; privacy bytes match proof. Later annotations are outside both immutable candidates.

Actors inspected all 9/all 3 patches, no commands/tests/external-proof reads. Static approval is not fresh functional/full/SMTP/inbox/deployment verification. This was inline documentary closure with delegated identity/receipt bookkeeping, no source writer/expanded implementation; runtime/tests N/A. Rollback documentary closure only, preserving source/receipts/history. No provider/cloud/private configuration/push/PR/merge/activation/future sharing authorization; never repeat closed reviews.

Independent ACK receipt `/private/tmp/ordenfix-email-final-ack-bookkeeping-go8tgn06/receipt.json`, SHA `969fb89c073cca3e46dff9d226c376b5d68fb977e10c3359f362d841754bc3d2`: root verified frozen hash, exact targets/lineages/revisions/four exit 0, no discrepancies. Documentary evidence `/private/tmp/ordenfix-email-two-reviews.z162qooi/documentary-{commit,assess}.json`, `documentary-staged-check.txt`, assessment exit 0/empty stderr. Source unchanged; one-path 43-line passive assessment from e5b5913, no actor/consent. Current annotations are parent-owned; full mirror readback required.
