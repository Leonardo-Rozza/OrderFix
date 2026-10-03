# Verify the current candidate with isolated Docker, backend and browser tests

Status: canonical backend running locally; backend Surefire and frontend checks passed, with one retained intermittent frontend failure. Full PostgreSQL integration/browser verification remains pending port-binding permission. Offline Docker image build failed. No production-readiness approval.

## Outcome and authorization

On 2026-10-03 the user explicitly started Docker and requested local backend startup and all pending tests. This overrides the earlier runtime withdrawal only for this verification. It does not authorize new business features or unrequested production-source corrections. Existing account/repair task documents retain their historical entries; this dated verification scope takes precedence for local runtime/testing.

## Scope and safety

- Original frontend HEAD 35a1bb2805f0af0a43474deba61880339929cba0 and backend HEAD f87997f77529d00230e6cda4366733fc6375151d, codex/account-email-links. Preserve original source, the existing dirty repair/v38 trackers and both .atl directories. Create public-only temporary snapshots; exclude private/ignored settings, credentials and provider profiles.
- Explicit Docker endpoint unix:///Users/leonardorozza/.docker/run/docker.sock; synthetic client config. Engine 29.8.1/Desktop 4.93.0 verified. Preserve all six preexisting containers and cached images; owned resources only, loopback binding, no prune/reset/restart/pull.
- Use new disposable cached PostgreSQL 16 resources and synthetic user/admin/workshop/password/device key. Canonical startup may seed these synthetic rows and run ordinary local subscription housekeeping only inside its isolated DB. Disable real mail/MP/Cloudinary/private-photo/export/closure/maintenance/operational-deletion effects and all relevant job flags; quarantine false permits a normal test app start. Never import original private properties.
- All providers/remotes/real SMTP/payments/shared DB/private credentials/downloads/push/PR/merge/deploy remain unauthorized. No source changes, guard weakening, test bypass or broad fixture rewrite to make tests green. Record failures and ask before a new correction outside an already authorized scope.
- Keep a requested local backend running only if startup is safe and healthy; retain an owned manifest with PID/container/ports/synthetic config/logs/stop instructions. Clean up other owned test resources and prove preexisting resources preserved.

## Policy and execution

- TDD ON inherited from explicit prior choice in odd/tasks/charge-session-expiry.md:15; source runner installed Java 21/Maven 3.9.11 offline. This is verification of existing code, so new production RED/GREEN N/A, not fabricated.
- Native RDD ON global. Backend pending medium slice remains 00b265d..f87997f under_budget; no review approval or new remote-review consent. Verification-only documentary work units use their own passive assessments.
- Runner: direct installed /Users/leonardorozza/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn -o with env-i/synthetic settings and Java21. Node 24/offline installed npm/Vitest/Playwright. Record actual full commands before execution; never download missing dependencies/browsers/images.
- Route: delegated mapping (4+ files/public runners and safety seams); bounded backend and frontend verification workers, no writers/review actors. Parent owns tracking, mirrors, proof integrity and work-unit commits. Backend Maven/tests/labs sequential within its snapshot; independent frontend checks may run separately.
- Forecast: 80–180 documentary authored lines; no production changes. Delivery ask-on-risk, cached feature-branch-chain if needed; no PRs authorized.
- Full topic odd/local-candidate-verification/tasks mirrors this document and locator odd/tasks/local-candidate-verification.md. No authoritative session ID supplied; omit it.

## Tasks

- [ ] **V1 Validate full backend regression and canonical startup.**
  - Route: delegated verification; mapping spans build/runtime/security/jobs and multiple test harnesses. Acceptance: offline clean verify, current JAR packaging, new-DB Flyway/JPA validation and canonical HTTP health/readiness; exact candidate bytes; providers off; owned-resource cleanup/startup manifest. Report assertion/setup/operational failures separately.
  - Known source risks to verify, not waive: PostgresMigrationIT expects latest 40 after migrateLatest although V41 exists; guarded legal/photo/export consumers recognize exact V27–V40 histories only. A healthy Boot app alone does not prove these consumers work.
- [x] **V2 Validate frontend units, tooling, static checks and simulated browser.**
  - Route: delegated verification; existing scripts/runner mapping spans 4+ files. Acceptance: full Vitest/tooling, lint/types/technical build and installed Chromium mocked-API scenarios; exact source snapshot, offline/synthetic env, no remote telemetry or public-deployment claim. Public release gate remains separate.
  - Matrix executed with passing final checks; an additional failed DateInput attempt is retained below. This closes execution of this matrix, not the unresolved intermittency or a production release gate.
- [ ] **V3 Exercise real registration/photos/export and pending migration compatibility.**
  - Route: delegated backend/browser verification after V1 outputs, sequential canonical labs on owned PostgreSQL/local storage. Acceptance: actual registration/verification/resend/reset with RecordingEmailSender, repair/budget/charge/photo/export desktop/mobile flows and guarded V41 migration/history/catalog checks through existing canonical fixtures. Source unchanged; preserve independent XML/browser reports. Never infer actual inbox delivery from a local observer.
  - Photos fixture has an explicit latest 40 assertion; registration/export may hit the V41 accreditation gap. If blocked, run and record each unaffected lab rather than modifying source/guards. E2 durable worker/API/E3 UI and PRO paid-period work are not implemented and cannot be accredited by these tests.

## Current execution boundary

- Planning commit 57522f2021cbcaa6cc5ab57916318db5e4a8c58d: 41 authored lines, native passive/non_executable_only; no review due. Full tracker/mirror observation 865 read back before delegation.
- V2 execution and V1/V3 partial-result work unit: 16cbd7182cc5ec86dce53a3e9214be63679597ef, 61 authored lines; native assessment against 57522f2 is passive/non_executable_only, review_due=false. Initial sandbox assessment could not create its Git index; scoped local retry succeeded, not a source-review approval. Running documentary count: 102 lines before this handoff bookkeeping; below the delivery budget, no PR created.
- Delegated workers: backend_current_verification handles V1/V3; frontend_current_verification handles V2. Frontend mock ports 5173/5174 are distinct from real labs 5175–5177.
- Canonical PostgreSQLContainer fixtures publish ephemeral ports using Docker's default binding, normally all interfaces; TESTCONTAINERS_HOST_OVERRIDE changes connection addressing, not binding. This exceeds the current strict-loopback boundary. Failsafe/labs are held pending explicit permission, without modifying test code or Docker settings. Backend proceeds with unaffected clean test and separately labelled skipTests packaging/JAR smoke on a NEW --pull=never -p127.0.0.1:<owned>:5432 database.

## Observed results (2026-10-03)

### V1 — partial; integration and image checks not green

- Backend candidate f87997f77529d00230e6cda4366733fc6375151d: offline Maven `clean test` exit 0, 288 frozen Surefire XML files, 8,390 declared cases, zero failures/errors/skips. This is NOT `clean verify`; Failsafe has not run.
- Separate Maven `-DskipTests package` exit 0. Packaging explicitly skips tests and is not another test pass. Three generated JARs passed public-content/migration checks; canonical main JAR SHA256 e383610286dd033cddec3524a8ab6d0f584f8003d9a238930b4e90131685d7e2.
- Canonical main JAR, no bean-removal shim, running PID 11272 at http://127.0.0.1:52184. Owned PostgreSQL container 26646c676b9a3335438c1a99e913f55389aced8cd9d8b7db5e86996ca1f03aa7 publishes ONLY 127.0.0.1:52183. Flyway applied 41, JPA validation/startup succeeded; 27 provider/effect flags disabled. Parent rechecked health/readiness/liveness: HTTP200/UP at 2026-10-03T22:31:54Z.
- Full startup command, synthetic settings, ownership and stop instructions: backend/runtime/startup-manifest.json and backend/runtime/stop-owned.sh under the proof root. Leave this requested backend and its DB running; stop script targets these resources only.
- Canonical Dockerfile image build with `--network=none` exit 1: builder cache lacks mapstruct-processor1.6.3, despite host Maven cache containing it. No download, source correction or Dockerfile workaround attempted.
- Cleanup side effect: ordinary `docker image rm` of owned image 42ddefcc7564 also automatically removed untagged parent IDs 7f0810f9bd16/d4829d22526f/64068096f4e3. Build log records cached parents; no pre-run `image ls -a` inventory exists, so complete prior intermediate-cache preservation cannot be claimed. All 12 originally tagged images and six original containers remain intact. No further image cleanup/reconstruction performed; future owned-image removal must use `--no-prune`.

### V2 — matrix executed; intermittent failure unresolved

- Canonical `npm test` exit 0: 114 Vitest files/1,107 cases plus 44 tooling cases. `npm run lint`, `npm run typecheck` and technical `npm run build` exit 0. Build retains the 665.81kB minified/191.61kB gzip chunk warning; local environment does not accredit public release/artifact gates.
- Mocked browser: 167 general project-qualified cases plus 6 registration/consent cases, exit 0, zero retries/skips/flaky reports. Includes installed desktop/mobile browser projects; simulated API coverage is NOT real-backend or inbox delivery coverage.
- Extra full Vitest JUnit run exit 1: one `DateInput > cierra el calendario si disabled cambia mientras está abierto` failure; expected `Limpiar fecha` while lazy calendar still showed `Cargando calendario…`. Unchanged focused 20-case rerun and sequential full 1,107-case rerun exit 0. Root cause is not proven; no assertion/timeout/source changes, no discarded failed attempt, no repeated-run count inflation.
- Initial npm-test supervisor had a Path+str observer error; its owned process group was stopped after ownership verification, interrupted log retained, and corrected supervisor reran canonical tests. This is separate from the genuine DateInput assertion failure.
- Frontend worker stopped its browser/Vite processes and confirmed mock ports 5173/5174 free. Canonical E2E regenerated 18 tracked screenshot PNGs only inside the temporary snapshot; original files and installed dependency metadata remained unchanged.

### V3 — not executed

Canonical Failsafe/Testcontainers, real registration, private-photo and repair/export browser labs are held because their default ephemeral PostgreSQL publication uses all interfaces, outside this run's strict-loopback boundary. No fixtures, migration-history assertions or Docker settings were changed to bypass it. V41 compatibility concerns remain source findings, NOT a reproduced PostgreSQL failure. Real labs 5175–5177 have not started. Provider/deployed SMTP, Railway/Vercel, payments and native source review remain separately pending/unapproved.

## Recoverable proof and commands

Fresh proof root: /private/tmp/ordenfix-local-verification.oSZf0Q. Exact command arrays, synthetic environments, cwd, exits and logs are in backend/phases/{01-clean-unit,02-package}/{command,result}.json and frontend/*-result.json; these take precedence over shorthand commands above. Browser commands include `--workers=2 --forbid-only --retries=0 --fail-on-flaky-tests`; registration uses playwright.registration.config.ts. All snapshots use the recorded offline/synthetic runners.

- Parent independently checked all 1,205 backend manifest entries and 100 frontend entries: zero missing/hash mismatches. Backend manifest SHA256 0b9509301cbd4f72980cae3f301c0e0c92bcd53f88d8b9786224c5d9bb2bb70c; frontend manifest SHA256 1971c3f812cf049aca83a4d7170866c509b95024b6470cde0245f505432501ad. Live backend log may subsequently grow; frozen reports remain the test evidence.
- Worker result SHA256: backend 1b204426485c802ec9f559ccf2fa76fd31242b6b1a88ff13c2f2453cf4385fcb; frontend d1ce5804e7fad4c437633417ca732873ad9c1e74b7a28b6098ce4646396f80c2. Parent re-counted backend XML and all six frontend JUnit reports, including the failed run. parent-proof-validation.json and parent-runtime-validation.json contain independent results.
- Baselines cover 1,293 backend and 518 frontend public files. Original source/test/config bytes unchanged except this parent-authored tracker; seven preexisting protected file hashes and all six container identities rechecked unchanged. Frontend snapshot uses 57522f2, whose only difference from original 35a1bb2 is this planning document.
- Unit rollback boundary: only odd/tasks/local-candidate-verification.md documentation; no application behavior changed. Runtime shutdown is a separate explicit action using the owned stop script, not a repository rollback.

## Next step

Fresh proof root /private/tmp/ordenfix-local-verification.oSZf0Q. baseline.json contains source heads, seven preserved-file hashes and six preexisting Docker IDs. Old /private/tmp account/E1-C/runtime roots are absent; prior documented test counts and native receipts remain historical only.

Ask one focused question for permission to publish temporary disposable PostgreSQL test ports on all interfaces. Until answered, keep V1/V3 open; do not run held tests or change the canonical harness. Resume with this document and full mirror, verify the live owned runtime, then execute sequential canonical integration/labs and retain every result. Production corrections and real deployed/provider checks require their own authorized scope.
