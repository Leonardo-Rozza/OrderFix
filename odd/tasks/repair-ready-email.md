# Send a safe customer email when a repair is completed

**Current status — 2026-10-04:** E1/E1-C/E2-S/E2-M/E2-W/E2-A/E2-G/E3-P are implemented. API `238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4` has final161 PostgreSQL/352 unit-regression passes and exact approved/burned native ACK. Earlier worker/privacy approvals remain separately bound below. Scheduler `3956ac2` has554 distinct final passes; its exact native review is approved/burned; status UI and full release gates stay open. **Real sending, inbox delivery and production readiness are not established.**

## Quick path

Implement approvedlocalE3 after parentcanonical/fullmirrorreadback. Earlierreviewsstayclosed; provider/activation/futuresharingseparate. Samefeature/proofindex.

## Outcome, authorization and exclusions

Notify only an existing-repair transition to COMPLETADO, reusing /seguimiento/{codigoSeguimiento} for budget/status. Email stays optional; preserve manual WhatsApp and never roll back repair for transport failure.

Original/Oct4 “Dale avanzemos con el envio de emails” authorizes local implementation/synthetic checks only—not SMTP/provider/activation, Railway/Vercel/shared DB/private config/payment/downloads/push/PR/merge/deploy. Paid PRO/paid-period cancellation stays separate.

R1 withdrawn Oct3; dedicated V41/Docker proof supersedes its blocker, not pending checks.

## Current policy and recovery identity

Repositories: frontend `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`; backend `/Volumes/DiscoExtern/Desktop/mvrg-backend`. Both current branches: `codex/account-email-links`; historical feature branches: `codex/repair-ready-email`.

| Control | Current value |
| --- | --- |
| Resume baselines | Frontend `6330d8e5cded8678f6bfb19eb1be38aa7dcdc9e1`; backend `4c847abec4081c69094922b20ee4c3155b564074` |
| Original baselines | Frontend `b3d7610bf227d7ab63db95d916dee2f42e3aa57e`; backend `f2141f60f2023405ae7ddec5987f13784dd2e76b` |
| Evidence heads / reviewed boundaries | Frontend head/effective boundary `855d1cd6ce9b718f130f14ccc8206f15fa83bef2` (approved E3 tracking67/passive); last approved/ACK candidate `e5b5913ddb5869c584eedc5032a57b4a2b1e6205`. Backend head `3956ac2d989eedc7644aa7190bde585537b7ce01`; acknowledged boundary now `3956ac2d989eedc7644aa7190bde585537b7ce01`. API and scheduler exact reviews closed |
| TDD | **ON**, explicit prior choice in `odd/tasks/charge-session-expiry.md:15`; compilable assertion RED → GREEN → cleanup. Setup failures are not RED |
| Backend checks | Installed Java 21.0.10/Maven 3.9.11 directly, offline Surefire and real PostgreSQL/Failsafe in secret-free snapshots/settings; no wrapper bootstrap |
| Frontend checks | Installed Node 24.14.0/Vitest 3.2.6, Node tooling, lint/typecheck/technical build and Playwright; public-only snapshots/synthetic environment, no private `.env` loading |
| Native RDD | **ON/global**; new candidates require their own assessment, consent and exact lifecycle |
| Delivery | `ask-on-risk`, cached `feature-branch-chain`; no PR/push/merge authorized or materialized |
| Running count / forecast | **6,113 authored committed work-unit lines** (prior5,132+557+235+closure122); separate V41/Docker/generated outputs excluded. E3I300–500+U350–550=650–1,050 advisorysource+docs; onecohesivedeliverable, no plumbing-onlycommit. Scheduler forecast200–400 exceeded coherently by physical timing/error/configuration tests, not scope expansion or a hard cap; preserve readable coverage and cached feature-branch-chain |

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

Source tasks use mandatory delegated mapping/preparation/writers. Parent owns decisions, task/mirror, transfer, commits and native disposition. Checks are evidence, not authorization.

- [x] **E1 Capture a durable completed-repair event.** V41/enqueuer/shared PUT/PATCH lock/default-off; `d6d9da0`, checked/native approved/ACK. Evidence below; rollback capture/tests/docs together.
- [ ] **R1 Restore and verify the local Docker/Spring Boot runtime — withdrawn by user.** Native-PG health/JPA/41 migrations passed, not R1 Docker acceptance or E1-C behavior. Owned Java68235/PG67481 closed; no scheduled retry. Dedicated later Docker proof is separate.
- [x] **E1-C Restore guarded runtime compatibility with V41.** `odd/tasks/v41-schema-compatibility.md` C1/C2/C3 (`fe1bec7`, `364a90a`, `cb82a0b`) supersedes compile-only. Preserve migrations/business/roles/V38/equipment/charge/historical rejection; rollback guards/tests/docs, not data.
- [x] **E2-S Prepare the standalone repair-ready template and SMTP transport.** `00b265d`, checked/native ACK; text/escaped HTML/current link, no unnecessary personal/budget data/external images. Address/origin/header/barrier/transaction/certainty checks, no provider delivery. Rollback adapter/template/port/tests/default/docs, preserving account mail.
- [ ] **E2 Deliver and recover without blind resend.** Overall task remains open.
  - [x] **E2-M Add and strictly accredit durable delivery metadata.** `6605d6b`,19files/736 authored; selector42/whitelist6/classifier16/sentinel17, unchanged budgets. No worker/API/scheduler here. Pre-deploy rollback migration/admission/tests, preserving V41/account/repair/permissions.
  - [x] **E2-W Implement fenced claim/send/ACK and safe recovery.** `e38bd4570f90915f26b7794bd7b9b34885215043`, checked protocol/native approved/ACK below. Rollback its nine paths together, preserving V41/V42/guards.
  - [x] **E2-A Expose tenant-scoped status and safe retry.** `238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4`,6paths/Git1,192+3=1,195; final161PG/352unit/staged0. Contract/race/noSMTP checks and medium/slice_budget_reached fresh exact grant/compiled approval/burned ACK below. Rollback6paths only, preserving Store/Worker/schema/auth.
  - [x] **E2-G Wire the approved opt-in bounded scheduler.** `3956ac2d989eedc7644aa7190bde585537b7ce01`,5paths/557/staged0; real scheduling RED/GREEN/final161PG+393unit=554 distinct. Default-off/one attempt/30s barriers below. Medium/slice_budget_reached: fresh exact grant, reliability approval and actual burned ACK below; activation separate.
- [ ] **E3 Show notification status and protect its public link.** DTO/hooks/query keys/invalidation/status/manual safe retry; missing/loading/error never blocks completion; no stale foreign-session publication, preserve WhatsApp/public budget. RED/GREEN, full frontend/tooling/lint/types/build and simulated browser completion/status/retry/WhatsApp/coordinated gates. ApprovedE3boundarybelow: I/Usteps, notnewcheckboxes/commits;650–1,050advisory, full/browserpending. RollbackAPI/hooks/card/detail/tests together.
  - [x] **E3-P Protect the tracking bearer secret in telemetry.** `src/lib/sentry.ts`/paired tests; field/path/Error filtering preserves diagnostics/token filtering/original/shared references. `b6bade6`, source151, medium under_budget at that commit—not standalone approval. No telemetry activation. Rollback sanitizer/tests together.

## E3 accepted implementation boundary — 2026-10-04

“Dale, implementalo asi” accepts repair-detail **Notificación por email** below WhatsApp: status/manual refresh/server-authorized retry. Include no-phone repairs outside WhatsAppphoneconditional; loading/missing/error never blocks completion. PreserveWhatsApp/budget/publiclink. Localonly/no SMTP/provider/activation/cloud/sharedDB/deploy/push/PR/merge/newnative-sharing. Sendingstaysoff.

OnecohesiveE3work-unit; I/U aresteps, notnewcheckboxes/plumbing-onlycommits. Delegatedroute:4+filepreparation/2+non-trivialwriter; parentowns canonical/full840/readback/frozenallowlist/commits/native. SourceEnglish/existingSpanishUI neutral; existingcomponents/tokens, nobackendexpansion.

**I Integration:** strict `estado`/`reintentable`; GET `/api/reparaciones/{id}/notificacion-email`; bodyless/querylessPOST `/api/reparaciones/{id}/notificacion-email/reintentos`. GETreadonly/retryonlyliteraltrue. Race/repeated200=currentDTO, notqueued/sentproof; malformed/unknownfailsafe. Generation-scopedrepair-email/id/generation key, existingstableidentityguards/safeinvalidation.

**U Card:** accessible loading/unavailable/error/status/manualrefresh/singlependingretry; noautomaticPOST/polling/guessedeligibility. ACEPTADO=provideracceptance, notinboxdelivery; INCIERTOneverblindresend. Capturedaccount/workshop+generation guardsdispatch/latecache/toast/invalidation/logout; old401cannotlogoutreplacement. Preserve current-session401-after-expiry/sameaccountrenewal/chargerecovery; authstore/chargecodeunchanged.

TDD ON `odd/tasks/charge-session-expiry.md:15`; installedNode24.14/Vitest3.2.6/TS5.9.3/Vite7.3.5. Exactinstallednode+vitest.mjs publicsafeconfig/envDir:false (or `./node_modules/.bin/vitest run` there); writerfreezessuiteselectors. CompilableassertionREDbeforeproduction→GREEN→refactor; setupfailure notRED. Service/Axios/queryKeys/cacheConsistency/hooks/Card/detailpairedtests+charge/sessionregressions. No downloads/privateenv.

ForecastI300–500+U350–550=650–1,050 advisory+docs; preserve readablecoverage. Cachedask-on-risk/feature-branch-chain, ~400notcap/size-onlysplit/codecompression. RDDON/global: assess committedunit againstfrontend855d1cd; fresh exactsharingconsent ifdue, oldgrantsnotinherited.

Pending: typecheck/lint/fullVitest/test:release/technicalbuild/new-file-inclusivewhitespace/Playwrightsyntheticcompletion-status-refresh-retry-WhatsApp-publiclink. Exactrunners frompackage; publicsnapshot/syntheticenv, recordfailed/skipped/unavailable/deferred. MocklocalHTTP/browsernot backend/provider/inbox/deployedproof; coordinated/publicreleasegatesopen. RollbackE3integration/card/detail/tests together.

## E2-G accepted implementation boundary — 2026-10-04

Accepted local “Si, vamos a implementarlo asi”; delegated mapping/preparation (4+files)/writer(5paths), parent owns canonical/mirror/transfer/Git/native. NEW public TEMP only; oldproof immutable; no activation/provider/cloud/deploy/future sharing.

One synchronous Worker.runNext/tick: initial30,000ms, fixed-delay30,000ms after completion; configurable `ordenfix.reparaciones.email.scheduler-delay-ms`, validated once by SchedulingConfigurer/FixedDelayTask. No batch/in-tick retry/async/queue/pool/wrappingtransaction/duplicate@Scheduled. No overlapping callback; Store DB fences authoritative.

`ordenfix.reparaciones.email.scheduler-enabled=false`; capture/mail/delivery plus literal `ordenfix.recovery.quarantine=false` fail closed. Spring havingValue case-insensitivity does not change literalcontract. Invalid enableddelay fails/no busyloop, disabled-versus-enabled admission tested. RuntimeException constantwarning only/noThrowable/message/cause/PII/provider/body/URL/uncertaincompensation. TimerdoesnotcatchError, SpringwrapsThrowable: nofatalpropagationclaim. Worker/Store/schema/API/auth/quarantine unchanged.

Allowlist/rollback five paths, preserving earlier contracts:
1. `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailScheduler.java`
2. `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailSchedulerTest.java`
3. `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailSchedulerConfigurationTest.java`
4. `src/main/resources/application.properties`
5. `docs/operations/email.md`

Englishsource/tests/professionalSpanishoperations; stale no-schedulercomment corrected. TDD ON `odd/tasks/charge-session-expiry.md:15`, installed Java21/Maven3.9.11 `/Users/leonardorozza/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn`, offline syntheticHOME/settings/tmp/cachedMockitoagent, no bootstrap/download/privateconfig. Configuration-first compilable RED beforeproduction/scaffold; setup/compilefailures notRED. Focused real scheduler/mockWorker verifies registration/oneattempt/fixed-delay-latch nonoverlap/gates/quarantine/disabled-noprovider/RuntimeException-continuation-redaction/invaliddelay/threadcleanup. Final realPG API/Worker/Capture/workshopclosure plus status/mail/worker/account/JWT/quarantine/workshop/scheduler regression selectors/argv/XML/full-source maps in frozenproof; no summedreruns.

RED `/private/tmp/ordenfix-ready-email-e2g.apmq3l_3/phases/01-config-red`:1missingbeanassertion/0E/S,exit1,compile610/483;1304unchanged+onlyConfigurationTest/noProduction; logSHA `ebf9a9b18a805a6376376995f4565158ef4a46902e1588dcace6ee47a7a5c349` parentverified. Priorcapacity41052from48183/sixcontracts/11states/hashanchors: `/private/tmp/repair-email-scheduler-headroom-00zm49xp/receipt.json` SHA `c92ba735e88bbb5b73ee6d27f9774fbb2358e745317a8146690157ee571bf2f5`; prior `/private/tmp/ordenfix-email-e2g-parent-dldr0fng/prior-canonical.md`.

FinalGREEN/commit/approvedburnedACK below; new-file-inclusivewhitespace/native checked. SpringmockWorker+separatePG proves local timer/fences, not SMTP/inbox/deployedmultiinstance/fullclean/frontend/Docker/browser/publicrelease. No historical reruns.

### E2-G final evidence and closed native review

Frozen `/private/tmp/ordenfix-ready-email-e2g.apmq3l_3`:1,460 manifest `24feace7957db4b8d2a37cd149755c14512840d3d3377629355f76c700cd063e`; final1,307 map `c23251245298caf1fa0f9bc3547889566831adfb0fda71062fc4f95a6b6abe16`. Root checked hashes/XML/selectors.

| Phase | Actual observed outcome |
| --- | --- |
|02 |Compile failure/no cases; fixture AutoCloseable assumption corrected to finally/destroy |
|03 |41/2F/0E/S; fixture whitespace trimming corrected to raw MapPropertySource |
|04 |41/2classes0F/E/S, exit0, final source; subset of06 |
|05/06 |161PG/6+393unit/23=554 distinct0F/E/S, exits0, exact final before/after |

Retained summary mislabels03:02 compiled611main/attempted484tests;03/04 recompiled484tests only. **Incremental, not clean-full**; main/properties same02→final,02 tests/doc differ,03 only ConfigurationTest. Independent `/private/tmp/ordenfix-e2g-final-bookkeeping-m4n5y6n0/receipt.json`, SHA `9b873e14a338bdd2f306733152a1776a74150a78ff8ca2331edd85dfe08f69a5`; frozen proof unchanged.

Parent `/private/tmp/ordenfix-email-e2g-parent-dldr0fng`:1,304baseline/6protected unchanged,3new absent;1,307working/exact5Git/1,302old match/557/staged0. Not whole-Git (`mvnw.cmd` CRLF). SafeDocker48/8/5 unchanged;7auto-removed. Earlier1312traversal discarded8excluded hashes/no values emitted or used, **not zero historical reads**.

Native `238eb2b..3956ac2`:medium/557/slice_budget_reached; parent assess/preflight/ready-status0/empty stderr/two verified .atl exclusions. Target `sha256:32a1f4216760396ce5384919ca394f9d353a8c4300027445155633548f7d3ad5`, proposed `review-dcbd61fa31ef125f`; was **pre-consent/no START/actor/sharing** then; fresh exact grant/approved ACK below advances boundary3956ac2. Commit receipt `/private/tmp/ordenfix-e2g-commit-identity-c_o64im1/receipt.json`, SHA `7a30209a26267b2658d52b9422d7262ade149e9c58d0d3b6a08cdd92df537d32`.

Timer/mock+separatePG prove local scope only, not SMTP/inbox/fullclean/image/browser/deployed. Documentary closure: mechanical/delegated, runtimeN/A/staged/native/document-only rollback.


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

Nine-path `e38bd4570f90915f26b7794bd7b9b34885215043`, parent `6605d6b9353632ca44609e23197b2c444a11b936`: working/staged/committed bytes match; whitespace0. Git971+21=992 versus Python972+22=994 for identical bytes. Count guard stopped before commit, not source/test failure.

| Phase | Cases/F/E/S and source |
| --- | --- |
| SMTP01 RED |75/8/0/0, exit1; compilable inert contracts |
| PG01 RED |1/1/0/0, exit1; realPG/Flyway42 inert worker |
| SMTP02 GREEN |82/3 classes, 0F/E/S; older Store/WorkerIT, not final whole source |
| PG02 failed |33/1/3/0, exit1; expiry changed21 not20; V33 correctly rejected closure/tenant-ID fixtures |
| PG03 isolated RED |1/1/0/0, exit1; unchanged PG02 source |
| PG04 GREEN |33/0/0/0; final production, older WorkerIT; not whole final |
| PG05 final |108/4 classes: Worker38/Capture10/ClosureEffects43/ClosureStore17; 0F/E/S, exit0,78.52s |
| Unit06 final |153/11 classes including SMTP68/config7/Worker7/account/closure/template/quarantine; 0F/E/S, exit0,4.37s |

Final1,299 before/after map `f7b1b7726564db3aba46cbae943f93de0bce91673aaad81f8bbb1b015159361d`:261 distinct cases, compile607/480, no clean verify or rerun aggregation. Physical commit-then-08006: unknown claim→zero SMTP; unknown ACK→no resend. Bounded real closure/SKIP LOCKED/ACK waits/DB deadlines; materialized20-ID expiry/coherent fixtures preserve guards.

Proof `/private/tmp/ordenfix-ready-email-e2w.azjj8e4_`:4,171 hashes; manifest `9928cf7ef17ac679f6eb8cc06cff7bf5af742d170531703446e1a7ab1ca07494`, patch `0e2a7bb5aeebc6ecf1f0768155006d5e42cb0a6061a1e607028f64acaca42837`, allowlist `0c76c0acdae162151b0408ebf7ea21cb15e774d0c34ba1a49ff4bf469ad32517`. XML/source receipt `/private/tmp/ordenfix-e2w-bookkeeping-53uu4ev6/receipt.json`, SHA `017b12a227cbed51e0837faf4972d625ac2a24aa25d2dad7540535cba92a1d14`; parent `/private/tmp/ordenfix-email-e2w-parent-{integrity,transfer,commit}.json`. Preserved1,295 public/6 protected;1,290 unchanged/1,299 final. JAR unchanged; EPERM is not PID exit proof; writer confirmed11272 alive/no restart.

`inventory-scope-correction.json`: replaced broad owned-unfrozen Config.Env/Cmd/Args before freeze; no retained broad stdout/duplicates or credential display/use. Only safe IDs/Image/Created/Running/StartedAt/attachments and48/8/5, not private-config equivalence/forensic erasure; originals/resources unchanged. Never broad inspect. Initial .atl/read-only .git failures did not lower risk; `/private/tmp/ordenfix-email-e2w-{assess-final,preflight,ready-status,consent-relay}.json` retains attempts; final medium/slice_budget_reached authority below.

## E2-A accepted implementation boundary — 2026-10-04

LocalAPI-only authorization “Dale avanzemos con el próximo paso”; parent reconciled canonical/full840/currente38bd457; delegated4+filemapping/preparation andfive newJava+docwriter. Forecast350–550 advisory/cachedchain. No scheduler/UI/schema/Store/Worker/security/SMTP expansion.

ADMIN=ROLE_ADMIN, businessEMPLEADO=**ROLE_USER**, notROLE_EMPLEADO (`persistence/entity/enums/UserRole.java:3–5`, `config/security/AuthenticatedUserPrincipal.java:34`); missing/foreignrepair indistinguishable404, existingaccount/workshopbarriers unchanged.

Separatecontroller/service/twofieldDTO. GET readonly/noDML/leaserecovery, persistedtruth separatefromWorkereligibility: ENTREGADO/incoherentrelations/gatesoff preservestate/reintentablefalse. Noevent derivesDESHABILITADO onlywithdisabledgates, otherwiseNO_EVENTO. POST actualbodyempty(anybyte/unknownlength), noquery/recipient/provider/SMTP; repeated/ineligible returns currentDTO, no enqueue. Retryonlycorrected-valid-emailSIN_EMAIL or dueFALLO_PREVIO below10; preserveattempts/backoff, neveraccepted/inflight/uncertain/historicalretry.

Transaction precedesTenantService.currentTallerId; explicitREAD_COMMITTED includingreadonlyGET/WorkshopClosureGate. POST admission→tenantrepairlock→eventlock→freshDBtime/re-read relations/gates/state/email/cap. FrozenWorkerclaims/ACK neverlockrepair, noinverseevent→repairordering; PIItransientonly.

Sixpathallowlist below; writer newpublic `$SNAP/source` fromcommittede38bd457 excludedprivateproperties/.env/.atl/.git/target, preservingoriginals/oldproof/runtime.

| Repository-relative locator | Final absolute locator |
| --- | --- |
| `src/main/java/com/leonardorozza/mvgrreparacionesbackend/controller/RepairReadyEmailController.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/main/java/com/leonardorozza/mvgrreparacionesbackend/controller/RepairReadyEmailController.java` |
| `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/dto/reparacion/RepairReadyEmailStatusDTO.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/dto/reparacion/RepairReadyEmailStatusDTO.java` |
| `src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStatusService.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/main/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStatusService.java` |
| `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStatusServiceTest.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailStatusServiceTest.java` |
| `src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailApiIT.java` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/src/test/java/com/leonardorozza/mvgrreparacionesbackend/service/notification/RepairReadyEmailApiIT.java` |
| `docs/operations/email.md` | `/Volumes/DiscoExtern/Desktop/mvrg-backend/docs/operations/email.md` |


HTTP-first TDD ON `odd/tasks/charge-session-expiry.md:15`: literal-route/DTO-independentJSON ApiIT/realPG42/JWT/security beforeproduction, ownNoSchedulingfixture (CaptureITfixture inaccessible). Observedcompilableexpected200-vs500RED; originalforecast404wrong: existing NoResourceFoundException/generichandler500, nohandler/security/scaffold/test-onlyresponsechange. Setup/compilefailures notRED; mockedauthnotHTTPproof.

InstalledJava `/Users/leonardorozza/Library/Java/JavaVirtualMachines/corretto-21.0.10/Contents/Home`; Maven `/Users/leonardorozza/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn` from `$SNAP/source`, `-o -s "$SNAP/settings.xml" -gs "$SNAP/global-settings.xml" "-Duser.home=$SNAP/home" "-Djava.io.tmpdir=$SNAP/tmp" -Djunit.jupiter.tempdir.cleanup.mode.default=NEVER`. Surefire `-Dtest=RepairReadyEmailStatusServiceTest test`; Failsafe `-Dit.test=RepairReadyEmailApiIT test-compile failsafe:integration-test failsafe:verify`. CachedPOMMockitoagent/no skips/bootstrap/downloads. Actualargv/env/XML/exits/loghash/wholemapsperphase, neversumreruns.

Acceptance retained: ADMIN/USER/foreign/inactive/unverified/workshop; actualemptybody/noquery/privacy; everypersisted/derived/gateson-off/readonlyGET/delivered-incoherenttruth; correctedemail/due/cap/backoff/repeated-concurrentretry; Worker/delete/customer/closure races/physicalrollback/zeroSMTP. Freshsyntheticenv-i/HOME/settings/publicconfig/ownedcachedPG; narrowDockerfields/no credentials/privateconfig/remote/prune. New-file-inclusivewhitespace/allowlist/publichash/originalchecks beforetransfer. Rollbacksixpaths preservingStore/Worker/V41/V42/auth/account/PRO. LocalHTTP/PGnotSMTP/inbox/deployed/fullcoordinatedproof.

## E2-A committed verification and fresh native checkpoint

| Frozen version | Manifest / source map |
| --- | --- |
| Initial `/private/tmp/ordenfix-ready-email-e2a.t79cd1lu`,4,194 hashes | `c120be18f19d7f2a534c14852f943ce3c4eef0a02415f16822a24a3442b14ad0` / `138d4e3b6864c394c5351bb60e79f31d2fefa17dd16bca7ccf09bc33fb0f6bd2` |
| Final `/private/tmp/ordenfix-ready-email-e2a-docfix.3al0ry4z`,4,151 hashes | `c72a2e8c8dcc66f6db842dc47e25e06b1f3b70a31561f2948fa8b87296b4340f` / `5f3cefe65d6d954fbf939f51346a061820f344a30ce9b0fbe9170081b2bbc57a` |

Final six-path allowlist `256cf8bdc0ebed2cc72042a9ab44f2ceeb9ce245583eb12331c114e400f5652c`; patch `8b4f6250007febf9b6e8f78d0afb178e977fb2f5e5c212c501f8b1952f79c2cc`.

TDD baseline1,299 matched. Phase01 compiled607/481 with realPG/Flyway42 but2 UUID36-varchar20 fixture errors—not RED; only ApiIT fixture corrected. Phase02:2 expected200-vs500 assertions/0E/S, exit1, stable1,300-source; absent NoResourceFoundException/generic handler500 verified, logSHA `a119e26a6ca1b50adb0f0273c489c4c49436524c5684c7c602c0a5afd6ad76ef`. No production class or unrelated handler change preceded RED.

Focused71unit/50API and final161PG/352unit passed separately. Docfix changed only stale “API pending” prose3del/4add; fiveJava/1,303 other files and old4,194 proof unchanged. `freeze-attempt-01.json` Path-shadowing TypeError affected unfrozen helper only, not source/tests.

| Fresh final | Actual result |
| --- | --- |
| Docfix01 PG |161/6 classes: API50/Worker38/Capture10/Effects43/Store17/Http3; 0F/E/S, exit0; realPG/Flyway42/JWT/security, compile610/482 |
| Docfix02 unit |352/21 classes: Status71 plus prior mail/worker/quarantine153 and account/JWT/workshop; 0F/E/S, exit0; reused compilation |

Both1,304 maps equal final:513 distinct, no rerun aggregation. Earlier02 reuses unchanged production, **not fresh final-whole-source RED**. Physical MVC/JWT/PG+mock transport/NoScheduling covers races/barriers; unknown-length input is Servlet wrapper, **not network-wire chunking**.

Independent initial `/private/tmp/ordenfix-e2a-proof-bookkeeping-3bck4y9y/receipt.json`, SHA `d771801d1799f87a062c2b902b140ecd958c1e572be5fd582870bbf32793571b`; final `/private/tmp/ordenfix-e2a-docfix-bookkeeping-xilr98i4/receipt.json`, SHA `cc7835c1b802e57b769330b96b900f8d0236a7d6a17803e929935593abd7935d`. Root checked XML/exits/logs,4,151/final1,304/allowlist6/original1,299/protected6; `/private/tmp/ordenfix-email-e2a-parent-{initial,final}-integrity.json` and `/private/tmp/ordenfix-email-e2a-parent` retain transfer/commit/staged-check/numstat.

All1,304 working/exact6 staged/committed bytes match;1,298 unchanged/five new. Outside-candidate `mvnw.cmd` CRLF conversion means **no raw whole-Git equivalence**. JAR/v38/.atl/PID11272 and narrow48/8/5 unchanged; no leftovers/global cleanup/private-config equivalence. Separate medium/slice_budget_reached fresh approval/ACK below.

## Observed verification — never sum reruns

| Unit | Observed evidence / qualification |
| --- | --- |
| E1 |RED4 PG assertions/0E/S; final125 Surefire/15classes+27Failsafe=152 distinct, compile599/471. Transaction/tenant/FK/unique/concurrency/no-op/creation/optional-email; corrected JdbcTemplate observer/helpers, no SMTP |
| E1-C |V41 full10,605/427classes0F/E/S,56m38s +22 browser separately. Not freshV42; prior failures retained; no SMTP/inbox/Cloudinary/MercadoPago |
| Docker |V41 image/PG16.14/Flyway41/JPA/health/readiness/liveness/UID999/artifact/config/guards passed;27 opt-ins off, not all schedulers. Offline Maven-parent failure retained; not V42 sending |
| E2-S |RED70/65failures;71/3 focused+138/10 related passed, compile602/474. MockSMTP/5 MIME LF/CRLF observer fixes; no production change/runtime/provider delivery |
| E3-P |RED19/15failures, refinement22/1 encoded-space failure, focused22 passed. FinalVitest1,125/114files/tooling44/lint/types/build0. Prior324F/8E port1/MSW8080 mismatch: same source passed public envDir:false. Browser/provider N/A for privacy; coordinated feature pending; DateInput/668.49kB remain |

### E2-M phase-specific proof

Current XML only; each phase before/after stable, no copied-report or rerun totals.

| Phase | Cases/F/E/S | Result |
| --- | --- | --- |
| 01 schema RED |1/1/0/0 |Missing fields |
| 02 guard attempt |5/3/0/0 |Recovery/populated-fresh catalog failure |
| 03 catalog attempt |1/1/0/0 |Catalog mismatch |
| 04 stability RED |1/1/0/0 |Assertion before indexes moved |
| 05 admission RED |5/3/0/0 |Stable migration, consumer/recovery RED before guard writes |
| 06 failed |137/1/2/0,exit1 |Recovery64/migration1 passed; registration selector/two negative-fixture setup errors |
| 07 GREEN |146/0/0/0 |V42compat72+historicalV41compat74,2 actual classes |
| 08 failed |238/2/0/0 |13 classes; stale whitelist/history classifier; registration writer25/HTTP11 passed |
| 09 corrected |11/0/0/0 |Capture10/capacity1 |
| 10 mail/quarantine |138/0/0/0 |10 mocked classes |
| EOF correction |1/0/0/0 |FreshPG/Flyway42 committed SQL; compile605/478, staged0 |

06 passed files unchanged but LegalRegistrationSchemaVerifier later changed: file reuse, not whole-final.07/08 match final production/docs, not two later-corrected tests;09/10 match whole original final. LegalRegistrationJdbcServiceIT has no XML/coverage; writer/HTTP ran08.

V42 nullable→created_at backfill→CURRENT_TIMESTAMP/NOT NULL keeps atthasmissing/attmissingval/six-column enqueue stable. HOT backfill changed new-index indcheckxmin; assertion RED→indexes-before-backfill aligned empty/populated/restored catalogs, no VACUUM/reindex/normalization/V41 projection change.

New/unappliedV42 blank EOF: unstaged missed untrackedSQL, retained staged exit2. Removed one LF;1,294 others/SQL tokens/Flyway11.14.1 checksum unchanged. FreshPG1 pass/staged2→0; Git702+34=736, not737. Prior checks are equivalent-SQL/unchanged-file reuse, not fresh reruns.

## Native closure and delivery ledger

Historical `fe1bec7..6605d6b`: high/process_boundary,22paths/1,165authored,budget200; exact “Si vamos” localCodexCLI/OpenAI grant, four compiled lenses approved/no tests, burned ACK `sha256:6cb96f98c404d5b1076f3cc1aea142b270b1f811d2d8efbe861759aefd2a0bef`. R2/R3 versionless V41/V42 output warning leaves phase05(V42-only/all42) valid; no accepted fix/reopening. Future combined measurement provenance separate.

Frontend `6330d8e..11ba24e`: medium3paths/252net under_budget; .atl/sandbox/transport failures never lower risk. Verified exclusion `sha256:4425697ab74255760bb7c3b87dc13642263a59d4b65cc516abaa19765c94da71`.

| Unit / commit | Authored and disposition |
| --- | --- |
| Frontend preparation `2c8473732b0b69b2be2caa7d9ac55c5ccd1f94b6` |100, passive |
| Backend E1 `d6d9da0d75f08f89f62eb6fb277b817611c5c0f8` |406, checked/approved/ACK |
| Backend E2-S `00b265d257bf44d87ebbe858bcf1d519e5236dbf` |576, checked/approved/ACK |
| Frontend E3-P/tracker `b6bade67517b2ffd6b76cb4dce02a3c7a183318e` |187 incl source151, medium under_budget then |
| Frontend privacy closure `ce99ba6b23cb23eaf4c2084aea1ee8783586c01e` |9, documentary |
| Backend E2-M `6605d6b9353632ca44609e23197b2c444a11b936` |736, qualified functional/native ACK |
| Frontend E2-M checkpoint `11ba24e` |64, running2,281; under_budget then |
| Backend E2-W `e38bd4570f90915f26b7794bd7b9b34885215043` |992; final108PG/153unit, fresh grant/approved/ACK |
| Frontend worker checkpoint `e5b5913ddb5869c584eedc5032a57b4a2b1e6205` |182+180=362, running3,635; complete slice480 approved/ACK |
| Frontend two-review closure `1e9b74f1a1b186e23357d979be14ea768b2c8d56` |31+12=43, running3,678; passive boundary |
| Backend E2-A `238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4` |1,192+3=1,195/6paths, running4,873;161PG/352unit, staged0, medium/slice_budget_reached/fresh approved/ACK |
| Frontend API checkpoint `29630aa4003d9c0d2a1be76e17cbe804f90f1a53` |116+100=216, running5,089; passive boundary |
| Frontend API review closure `2f2ebf0acb635f7d582a9a8143e710d35d6f48d7` |31+12=43, running5,132; staged0/passive boundary |
| Backend E2-G `3956ac2d989eedc7644aa7190bde585537b7ce01` |551+6=557/5paths, running5,689;554 distinct/staged0; medium/slice_budget_reached, fresh approved/burned ACK |
| Frontend scheduler checkpoint `bf8237b20d7db7cfe6394c26709398d2cc773e42` |144+91=235, running5,924; staged0/passive/non_executable_only; runtime N/A |
| Frontend scheduler review closure `fa4ce480d7ae850cdf16c0669a0025a21807507b` |69+53=122, running6,046; staged0/passive; current head/count annotations outside immutable commit |

Passive means observed non_executable_only/review_due=false/reason=passive, boundary advanced; documentary runtime N/A. Archived11ba24e: `c051ca5`, `ffdfb71`, `d6ecaa1`, `d08db65`, `c8a3316`, `f6e1ca4`, `84dd47e`, passive/prior1,285. No PR; future slices need checks/docs/fresh consent.

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

Preserve backend odd/tasks/v38-deploy-fixes.md, both .atl inventories, tracker history, Java11272/oldJAR and unrelated Docker resources. No private properties/authenticated sessions/ambient credentials/sharedDB. Cleanup only captured owned synthetic resources; no purge/prune/unrelated restart/settings/security/global-cache/image cleanup.

E2-M correction48images/8containers/5networks unchanged/no fixtures. Original E2-M inventory covered13 visible images only; separate48-ID historical baseline matched. Do not broaden its claim.

Rollback coherent units/tests/docs/dependencies before deployment; never rewrite applied migrations or revert prior release/legal/account/PRO work. Activation requires separate authorization.

Open: E3; fresh backend clean verify, coordinated frontend/technical/Docker/browser E2E, public release gate, realSMTP/provider/inbox/deployed proof. Functional/native approvals do not establish V42 sending. DateInput intermittency/668.49kB warning remain;56m38s local versus25min CI is risk, not observed GitHub failure. Paid PRO unchanged/unactivated; separate release work remains.

## Next step and mirror

E2-G and API reviews closed; continue E3/release gates, no inferred activation/deploy/future sharing. bf8237b contains input6add/2del outside backend candidates; later annotations outside bf8237b. Parent frontend-commit/assess.json:235/staged0/passive.

Locator `odd/tasks/repair-ready-email.md`; Engram `odd/repair-ready-email/tasks`. Mirror/read back full document; never invent session IDs. Failure preserves local progress with explicit pending mirror, not a block on safe unrelated work.

### Exact closed native authority

Closed medium candidates: fresh exact “Si”/localCodexCLI/OpenAI grant/reliability200; authentic transitions, custom endpoints/API keys unset, approved/no findings/burned ACK/exits0/empty stderr. No manual substitute/source correction/global toggle.

| Binding | Backend worker | Frontend privacy/documentary slice |
| --- | --- | --- |
| Exact range | `6605d6b9353632ca44609e23197b2c444a11b936..e38bd4570f90915f26b7794bd7b9b34885215043`,9 paths/992 Git authored | `6330d8e5cded8678f6bfb19eb1be38aa7dcdc9e1..e5b5913ddb5869c584eedc5032a57b4a2b1e6205`,3 paths/480 net Git authored |
| Lineage | `review-1d8cf3470d065a22` | `review-943e1e8902b69207` |
| Target | `sha256:9d3bc7abc5976bb98c1fdcf042d1ef66e80d73981f7df7e45dddb878afe854eb` | `sha256:b22b3a3a6e03498905287a71cfbdddd1f57e5f94c5c4496cf0a9ab4eb487aed6` |
| Reliability result | `sha256:7175dcf6846db552bcfc63ac3d03fee7ff14bc9813dc454ba07fc3351f8b1544` | `sha256:cbf1696e58b8d276206e4928b9f273cdc68d40d02f8e2ce5c16cbc3f8d614e09` |
| Actual consumed revision | `sha256:6611608201fe08817d9f2765e79c9bcd766958a8da5c498edb5ce8b34f353142` | `sha256:db058e47a76a55ec8cbeee69c877d7598ac8cdbbdf0355fa2aa687721493227e` |
| New reviewed boundary | `e38bd4570f90915f26b7794bd7b9b34885215043` | `e5b5913ddb5869c584eedc5032a57b4a2b1e6205` |

Backend trees `e510458002be4f33ac94db5f53444d9426473460`/`51b048adb0567374d09b2e223346360afffd3237`, paths `sha256:14a1678bea5fe12f077f376f0959ff75f22cb44066ba5db5b31aa6fc0246677f`; frontend `00c0924ff78d6635aa91271abb86fc9c3e13bbca`/`1f7e11ed0acc8ce42a2e906eede46bd1f4cca666`, paths `sha256:82c82b7dec428cf3c23253b1001437e9b13137dbaa792ff26594d86605b2cff3`. Frontend files: this document, src/lib/sentry.ts, src/lib/sentry.test.ts; privacy bytes match. Later annotations outside both immutable candidates.

Proof `/private/tmp/ordenfix-email-two-reviews.z162qooi`; independent `/private/tmp/ordenfix-email-final-ack-bookkeeping-go8tgn06/receipt.json`, SHA `969fb89c073cca3e46dff9d226c376b5d68fb977e10c3359f362d841754bc3d2`:bindings/four exits. `/private/tmp/ordenfix-email-two-reviews.z162qooi/documentary-{commit,assess}.json`/`documentary-staged-check.txt`:43-line passive/e5b5913/exit0/empty stderr.

### API — e38bd457..238eb2b

Exact `e38bd4570f90915f26b7794bd7b9b34885215043..238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4`,6paths/1,195Git; lineage `review-cdf7f76d7a7d81fd`.

| Actual closure binding | Value |
| --- | --- |
| Target | `sha256:89e04b116a610f36d7902de1550794c31204706e689bde764f0b40306f00afc8` |
| Reliability result | `sha256:4e4e8460478b2368439394f0a6df2867f91a7d43f8a6bf3b0a1fbaba541111b7`; approved, no findings |
| Consumed ACK revision | `sha256:6820b2608b2c6d71cd0f7b2d6eebbd2219cd083b54a499e393ff8c7fff6899a7`; actual acknowledged/authority burned |
| Backend reviewed boundary | `238eb2b104c8ae5fd6ab0e93c4856d46a322ccf4` |
| Proof | `/private/tmp/ordenfix-email-api-native.63ek_5mt/{capture-reliability,approved-acknowledgement}.json`; actual exits0/empty stderr |

Trees `51b048adb0567374d09b2e223346360afffd3237`/`96443fdf5deb57eda89fa8b7486bf1c713478eed`; paths `sha256:3939e133b03eab3d4a5b890d140fe0548e045773fc168a320adb4cb2c729eb70`. Medium/review_due/slice_budget_reached; exact STATUS/collect excludes only two verified .atl files. `/private/tmp/ordenfix-email-e2a-parent/{assess,preflight,ready-status}.json`:exits0.

Old START rejected **before execution**: old consent covered other candidates. New exact “Si”/session/OpenAI grant then refreshed STATUS/relay/granted START0 preserved identity; no future sharing/provider grant.

Independent `/private/tmp/ordenfix-email-api-final-ack-bookkeeping-pm_pha9e/receipt.json`, SHA `5782ff0ae18edfd46a03755b5fc531112e4ff999659cd17ec37f915df2aa783c`:root verified six outputs/identity/ACK/exits, no discrepancies. Actor all9/all3/all6 patch claims involve no commands/tests/external-proof reads—not second source/history audits or fresh functional/full/SMTP/inbox/deploy proof.

Documentary only: mechanical/delegated, runtimeN/A/staged/native checks/rollback documents. `/private/tmp/ordenfix-email-e2a-parent/frontend-{commit,assess}.json`:216/staged0/assessment0/empty stderr/passive; `/private/tmp/ordenfix-email-api-native.63ek_5mt/documentary-{commit,assess}.json`/staged-check:43/whitespace0/assessment0/empty stderr/passive. Failed inventory/index/STATUS sandbox attempts01/02 never lower risk; successful STATUS verified .atl/index permission. No new actor/sharing; later annotations outside candidates; mirror readback required.

### Scheduler — 238eb2b..3956ac2

Fresh human “Si dale” grants only the exact five-file diff through separate local Codex CLI/OpenAI. Genuine refreshed STATUS→relay→granted START→compiled reliability capture→returned ACK completed; medium/557, one lens/budget200, no correction/source changes. All six exits0/empty stderr; default-off/no activation/provider/deploy.

| Actual binding | Value |
| --- | --- |
| Lineage / target | `review-dcbd61fa31ef125f` / `sha256:32a1f4216760396ce5384919ca394f9d353a8c4300027445155633548f7d3ad5` |
| Result | `sha256:fd3abad64611e7765b9ba01e2137a90300962801926a0b04d862ede6be24c629`; approved/no findings |
| Consumed ACK revision | `sha256:32c9e148f84f004f46be543eebef6c415d45f37878ed4a5f96f59b6259ce10eb`; acknowledged/burned |
| Proof | `/private/tmp/ordenfix-email-scheduler-native.yqlt2r5h/{capture-reliability,approved-acknowledgement}.json` |

Independent `/private/tmp/ordenfix-e2g-fresh-review-preparation-pxay8dbi/receipt.json`, SHA `f87ff9f464b7bf3ea54846d884d22860514175b5e6a075a7e0b7ab3782377f23`: root rehashed all18 output/exit/stderr bindings; exact5Git/1,307public/6protected unchanged. Actor allfive-patch/test-inspection claim is scoped attestation, not new tests/history audit/fullclean/SMTP/inbox/deployed proof. Prior554 functional cases/compile-label qualification remain separate, not rerun. Old reviews stay closed; future sharing requires fresh consent.

Capacity-only delegated condensation:49,735→47,668 chars,66unique hashes/86 occurrences/43TEMP+84total locator tokens/11states/sixcontract blocks preserved;45,500 advisory target unmet. Candidate/receipt at `/private/tmp/repair-email-headroom-buy27hqx`; original `canonical-before-review.md` in native root. Parent actual-closure annotations follow acceptance; no source/RDD budget shrinking.

E3 tracking commit `855d1cd6ce9b718f130f14ccc8206f15fa83bef2`: doc-only36add/31del=67; initial assessment failed on undeclared .atl, canonical STATUS verified exact two exclusions; reassessment passive/non_executable_only, no native actor/sharing. Source E3 checks pending.

## E3 local evidence — 2026-10-04

13 source/test paths, one coherent delegated unit; backend/authstore/charge-storage unchanged. UI/root-inspected desktop+mobile screenshots: status/manual GET/single bodyless retry, nonblocking completion, no-phone/WhatsApp/publicbudget intact. Checkbox awaits exact native closure; release gates stay open. Rollback all13 together.

RED46/8fail before production; finalfocused200/10files0F/E/S. New heldGET/uncertainPOST raceRED9/1fail fixed with current mutation-error barrier until explicit freshGET. Initial97/99 observer failures fixed with waitFor. Prior `/private/tmp/ordenfix-email-e3.z63k9r9k` immutable/nonfinal; final `/private/tmp/ordenfix-email-e3-race.t_74xu0k`: public331 `ff9a8a3a836a4091d3e000b87622d64f4756ee772723fecc958d72144b0663ad`, input342 `201d5d4e364a03a0cdfc8ed5263cfca203ae55b347daf1fec13790019ec7fa14`; original equal.

Full1197 cases/117files, release44, lint/types/technicalbuild all0: `/private/tmp/ordenfix-e3-final-verification.vgtk7d7t/receipt.json` SHA `9c2b7a823dfffff015e3c4a50f09da275b43d16b085d9f2dbd809506aef40c40`. All8steps0;342writer/343local+2public supplements unchanged. Nested pending label retained, actualfinal passed. Browser8/8/no skips/flaky: `/private/tmp/ordenfix-e3-browser-rc_45r_i/artifacts/final-summary.json` SHA `b52aacecef23c6c48191505ccec39e0d00470a54d7ae47afbbd017129c8dd1f7`,342 unchanged.

Retained harness failures: npm double/dev/null corrected to distinct empty configs; browser EPERM/module/contradictoryDTO fixture corrected. No sums of prior reruns. Final loader/cache ownTEMP; preliminary symlink may have written installed .vite-temp. Font fallback/GoogleFonts blocked;675.21kB build warning, publication/artifact guards SKIPPED. No provider/inbox/activation/currentcleanbackend/Docker/coordinated/deployed proof. Whitespace/commit/native assessment next; new sharing consent absent.
