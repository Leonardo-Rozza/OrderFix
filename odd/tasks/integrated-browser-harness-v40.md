# Restore integrated browser validation against V40

## Goal and authorized scope
Update the stale browser-test contracts and isolated photos database, then rerun the real Registration, Photos and Export browser labs. The user approved this correction after the observed failures. Preserve exact assertions and existing business behavior; do not hide failures or rewrite historical migrations/fixtures.

## Baselines and constraints
- Frontend baseline ecb9c358dc5b82984b490f7c5ae958859630f2f8; backend baseline 9d4461f37dbb13eefa398e131e4af54e477178c5. Reuse codex/charge-retry-recovery in both repositories. Preserve backend odd/tasks/v38-deploy-fixes.md and both .atl directories.
- TDD ON from prior explicit session approval. Existing RED evidence is the immediately preceding run against these unchanged baselines: 6 failed browser assertions after HTTP 201 (equipoTipo/operacionId), and photos startup failure because cobros.operacion_id is absent from its V37 fixture. Logs: /private/tmp/integrated-closeout-proof. No fabricated new RED run is needed for the same unchanged failures.
- Local, disposable PostgreSQL and storage only. No provider credentials, email delivery, remote calls, downloads, production code changes, push, PR, merge or deploy. Keep Cloudinary flags absent and Maven offline.
- Review remains deferred by the user until functional validation is complete. Do not reopen old approved reviews or change global RDD mode. Assess work-unit commits and report the honest deferred/under-budget disposition without another interruption for the same deferred work.
- Delivery ask-on-risk; forecast 10–16 authored test lines plus this tracker, below 400. Two repository-local work units; source/test readability and exact checks are not traded for line count.

## Tasks
- [ ] F1 Update current frontend browser request contracts.
  - Route: delegated writer; mapping/preparation spanned both repositories and more than four files. Same bounded writer owns the three planned test files; parent owns this document, mirror and commits.
  - Add equipoTipo: OTRO to the exact quick-repair payload expectation. Add a validated UUID v4 operacionId to the exact charge payload expectation; do not replace toEqual with broad partial matching.
  - Acceptance: all 14 real Registration browser cases reach their intended endpoints, including public budget response, repair delivery and charge annulment/correction on desktop/mobile.
  - Checks: real LegalRegistrationBrowserE2E, frontend typecheck/lint, git diff --check. Commit evidence pending.
- [x] B1 Bring only the photos browser fixture to current schema and rerun all three labs.
  - Route: delegated writer; current-schema browser fixture differs from shared historical V37 accreditation. Keep LegalPrivatePhotoOperationsIT and prior SQL unchanged.
  - Apply migrateLatest with the migration owner after historical fixture preparation and before application-role provisioning/seed accounts; verify the latest successful migration is 40.
  - Acceptance: photos browser starts with JPA validate and all four current photo cases pass using local storage. Export two desktop/mobile cases continue to verify downloaded ZIP/XLSX contents and tenant isolation. Record failures honestly if a later blocker appears.
  - Checks passed: offline test-compile; separate Registration, Photos and Export integration-test/verify invocations; git diff --check and isolated-resource cleanup. Commit f2141f60f2023405ae7ddec5987f13784dd2e76b (4 additions). Native pending slice from 57661c412b8d012ac415a31316989974b3971b50 is high / high_risk (385 lines, process-boundary signal); review deferred under the user's instruction, exact native START returned declined_this_candidate. No approval claimed.

## Execution and safety
Use env -i preserving only HOME, PATH, JAVA_HOME, local DOCKER_HOST, npm_config_offline=true and TMPDIR=/private/tmp. Prefix PATH with the installed /Users/leonardorozza/.nvm/versions/node/v24.14.0/bin: the escalated shell otherwise selects unsupported /usr/local/bin Node 20.15.1. This is execution-only configuration, not a repository configuration change.
JAVA_HOME=/Users/leonardorozza/Library/Java/JavaVirtualMachines/corretto-21.0.10/Contents/Home; DOCKER_HOST=unix:///Users/leonardorozza/.docker/run/docker.sock. Confirm cached postgres:16-alpine and testcontainers/ryuk:0.14.0 before execution; never pull to recover.
From the backend, run ./mvnw -o -B -DskipTests test-compile, then separately ./mvnw -o -B -Dit.test=<LegalRegistrationBrowserE2E|PrivatePhotoBrowserE2E|ExportBrowserE2E> -Dordenfix.browser.frontend=/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend failsafe:integration-test failsafe:verify. Run one Maven process at a time and preserve each report before the next invocation overwrites it.
Save new logs/reports under /private/tmp/integrated-harness-v40-proof. Compare exact pre/post container inventory and browser ports; do not prune or stop preexisting resources.

## Rollback and limits
Each repository-local test change can be reverted independently without reverting production code or migrations. These labs are separate workflows, not one test joining photos and export for the same repair. They do not prove deployed/provider configuration, public-budget races or lost-response charge recovery through a real browser reload.

## Progress
The three-file correction is implemented and the three real browser labs passed. Parent inspected the exact diff and final logs. Next: save the two repository-local work units and record their native assessment/deferred-review disposition; no push or deploy.

## Observed verification
- Registration: 14 browser cases passed plus its Java orchestrator (1 test, 0 failures/errors/skips). Repairs reached public-budget approval/rejection and delivery; charges reached employee registration and owner annulment/correction, on desktop and mobile.
- Photos: 4 browser cases passed plus its Java orchestrator (1 test, 0 failures/errors/skips). JPA validate started against V40; local upload, lost-acknowledgement recovery, authorized reading and deletion completed. Historical V37 fixtures and production migrations were not changed.
- Export: 2 browser cases passed plus its Java orchestrator (1 test, 0 failures/errors/skips), with actual ZIP/XLSX download, content/hash and workshop-isolation checks. These remain separate workflows, not a single cross-feature case.
- Offline test compilation, frontend typecheck/lint and both repository diff checks passed. No production code changed, so the unchanged full unit/build suites were not rerun for this test-only correction.
- Evidence: /private/tmp/integrated-harness-v40-proof contains per-lab logs, XML/browser reports, screenshots and synthetic export artifacts. cleanup.txt confirms the six preexisting containers remained and ports 5175–5177 had no listeners. No source changes beyond the three scoped test files.
- Supported Node 24.14.0 removed the previous Vite version warning. Existing Mockito dynamic-attachment, SpringDoc and compilation deprecation warnings remain. Provider/deployed behavior was not tested; no credentials, external providers or downloads were used.
- Authored test delta: frontend 5 additions + 1 deletion; backend 4 additions. Commit identities and disposition pending.
