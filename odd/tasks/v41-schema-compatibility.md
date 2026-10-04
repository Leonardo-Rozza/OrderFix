# Restore strict V41 compatibility before release verification

Status: concrete design approved; C1 implementation pending. Previous failing verification is retained, not overwritten or treated as green.

## Objective, evidence and authorization

Correct the approved V41 compatibility and dependent registration/photo/export/closure blockers without weakening schema, history, privilege or workshop-isolation checks. The user approved the strict design on 2026-10-03 with “Si, vamos”. The design and implementation plan share this canonical ODD document; no SDD or duplicate plan artifact.

Baseline: backend f87997f77529d00230e6cda4366733fc6375151d; frontend c75056dfea6bbd5acd28198e2513cf898a34221e; both codex/account-email-links. Preserve dirty repair-ready-email.md, backend v38-deploy-fixes.md and both .atl directories. Historical account-email-links A1 remains valid and unrelated to this repair-event migration correction.

Fresh failed proof: /private/tmp/ordenfix-local-verification.oSZf0Q/backend/integration-continuation. Canonical Surefire 8,390 passed; Failsafe 1,515 cases, 23 failures/68 errors/zero skips. Four real labs failed. Mapping clusters 38 direct legal setup, 25 export, 2 closure backup, 25 deletion/profile and 1 stale migration assertion. Sanitized exceptions hide schema preflight causes; no separate export/closure production defect is proven yet.

## Approved design and invariants

- Keep V41__repair_ready_email.sql and all existing migrations immutable. Admit only exact V41 script/checksum/ordered successful/latest history; increase the bounded sentinel from 15 to 16 rows. Preserve frozen V27–V40 contracts and intentional historical target-40 tests.
- Add a strict V41 repair-event delta verifier: six columns, exact constraints/indexes, composite workshop FK/cascade and RI triggers, repair unique key, owners/ACL/RLS/partition/rules/unexpected-trigger checks. Under every older history, require V41 artifacts absent; removing history 41 with artifacts present must not masquerade as V40.
- Extend V29 legal/history/capability/trigger dispatch, V38 profile/history, V37 operational deletion and private-photo profile dispatch consistently. Update only stale migrateLatest assertions and the bounded-sentinel expectation.
- Independently measure/freeze four full V41 recovery profiles for PostgreSQL 16 C/en_US.utf8, migrated/restored. Keep checkpoint format 2, fields, privileges, error sanitization, retry limits and existing backup coverage unchanged. Never invent fingerprints.
- Preferred narrow layered validation avoids coupling every legal reader to the entire unrelated public schema. Whole-public legal fingerprints were considered and rejected as a larger, more coupled redesign.
- New V41 positive/drift/downgrade/privilege regression RED must precede production writes. Preserve old-version negative controls, unknown future-version rejection and restricted roles gaining no event read/write privilege.

## Scope and safety

Local authorized production/test corrections and synthetic verification only. No new E2/E3/PRO features, DateInput redesign, migration rollback, provider effects, private settings/credentials, downloads/pulls, remote execution/deployment, push/PR/merge or security-check bypass. Source changes are prepared/tested in fresh public-only snapshots; parent transfers only verified allowlisted files.

Preserve requested canonical backend PID 11272, HTTP127.0.0.1:52184 and owned PostgreSQL26646c676b9a3335438c1a99e913f55389aced8cd9d8b7db5e86996ca1f03aa7 on loopback52183, plus six original containers and remaining images/caches. Never clean its running JAR directory. Temporary canonical disposable PostgreSQL all-interface publication is explicitly approved; no image/cache removal or prune. Keep provider-off/RecordingEmailSender/local-storage fixture seams and copied, isolated frontend dependencies; synthetic npm user/global configs must be distinct.

## Policy and delivery

- TDD ON, source: explicit prior user choice recorded in odd/tasks/charge-session-expiry.md:15. Runner: installed Java21/Maven3.9.11 -o, synthetic env-i/settings; RED assertions before production writes, GREEN, then REFACTOR. Setup/compile errors are not behavioral RED.
- Exact baseline runner/environment: integration-continuation/phases/01-clean-verify/command.json. New runs use a fresh proof root and record full command arrays, cwd, environment, exits and immutable XML/logs before/after each phase.
- Native RDD ON, deciding source global, verified. Backend last reviewed boundary00b265d257bf44d87ebbe858bcf1d519e5236dbf; pending f87997f slice is medium/236 lines/under_budget, not approved. Parent owns each work-unit commit, exact native committed assessment, due preflight/consent transitions and receipt disposition. Functional success is not native approval.
- Forecast C1 450–650, C2 100–180, C3 40–80 authored lines plus tracker. About400 is advisory, never code-golf. C1 is one atomic security capability: admitting history separately from catalog/privilege verification would create an unsafe intermediate state.
- Delivery ask-on-risk, prior explicitly cached feature-branch-chain retained. Planned reviewable units: C1 strict accreditation, then C2 recovery profile, then C3 observed verification. Record exact committed boundaries/counts; no PRs/push authorized. If a later PR slice cannot fit after one honest cohesive split, report its actual size and seek size:exception rather than degrading code/tests.
- Persistence: odd/tasks/v41-schema-compatibility.md; full Engram topic odd/v41-schema-compatibility/tasks, project mvgr-reparaciones-frontend. No authoritative current runtime session ID supplied; omit it. Exploration topic odd/v41-schema-compatibility/exploration retains mapping and line locators.

## Tasks

- [ ] **C1 Accredit exact V41 legal/photo/deletion schema and correct latest fixtures.**
  - Route: delegated writer. Mapping/preparation covers 4+ files; V29/V38/V37/photo consumers, new strict helper and paired tests are 2+ non-trivial files. Parent owns transfer/commits; worker reads this document/full mirror before editing.
  - Acceptance: exact V41 accreditation across C/en_US.utf8 migrated/restored fixtures with zero preflight DML; old profiles unchanged; changed/missing/reordered/duplicate/failed/script/checksum history, unknown V42, V41 artifacts under older history and all new metadata/ACL/owner/FK/index/trigger/RLS/rule drift fail closed. Existing V39/V40/legal/photo/profile drift still rejects; restricted role privileges unchanged.
  - Likely sources: LegalV29AcceptanceSchemaVerifier, LegalV38ProfileErasureSchema, LegalV37OperationalDeletionSchema, LegalPrivatePhotoSchema; new LegalV41RepairReadySchema and LegalV41CompatibilityIT; mechanical stale latest assertions in PostgresMigrationIT, PrivatePhotoBrowserE2E, LegalAcceptanceHistoryReaderIT, LegalPrivateRequirementsReadServiceIT and sentinel test. Historical target-40 CobroOperationMigrationIT/V40 tests unchanged.
  - Checks: fresh new regression RED; GREEN plus LegalV38CompatibilityIT, LegalV29AcceptanceSchemaVerifierIT, PostgresMigrationIT, LegalAcceptanceHistoryReaderIT, LegalPrivateRequirementsReadServiceIT, RepairReadyEmailCaptureIT; full source/test compile and whitespace/allowlist integrity. Use test-compile failsafe:integration-test failsafe:verify with explicit -Dit.test selection.
  - Runtime: disposable cached PG16/Testcontainers fixtures, no providers; migrated/restored locale and exact security metadata matrix. Rollback: this compatibility helper/dispatch and paired fixtures/tests together, retaining immutable V41 and all prior business behavior.
- [ ] **C2 Accredit measured V41 recovery fingerprints and preserve restore checks.**
  - Route: delegated writer; independent whole-schema recovery boundary and migrated/restored tests are multiple non-trivial files, after C1 outcome. Do not substitute legal preflight success for recovery accreditation.
  - Acceptance: independently recorded four exact PG16 V41 profiles; matching locale captures, mismatched locale and metadata/ACL/history drift reject; logical restored fixtures match expected profile; checkpoint format 2 and old profiles unchanged.
  - Checks: fresh focused recovery RED, measured evidence, GREEN RecoveryProfileDeletionIT and relevant existing recovery regressions; source/test compilation and preservation. Rollback only new V41 recovery profile/tests; retain previous V37–V40 snapshots/contracts.
- [ ] **C3 Revalidate the combined candidate and all dependent real flows.**
  - Route: delegated verification; multiple canonical build/IT/browser harnesses and metadata proof. Parent reconciles feature document/mirror and commits observed results, not merely attempted commands.
  - Acceptance: focused export/closure/deletion/profile clusters, full offline clean verify, and each of LegalRegistrationBrowserE2E, PrivatePhotoBrowserE2E, ExportBrowserE2E, WorkshopClosureBrowserE2E independently on current candidate. Registration/email links/reset, actual photo browser, ZIP/Excel export and closure/restore UI must be reached and pass; local observer is not actual inbox delivery.
  - Preserve every failed attempt, distinguish fixture failure from reached UI, count copied/repeated reports only once, prove source hashes/resource cleanup and leave requested backend healthy. Residual defects are isolated with evidence before further changes; no blanket attribution to V41. Backend image-cache gap, DateInput intermittency, deployed/provider checks and unimplemented business features remain separately visible.

## Progress and next step

Approved design and delegated read-only mapping complete. No production writes yet. Parent creates/readbacks this document/full mirror, commits its planning unit, then delegates bounded C1 writer with exact TDD/scope/checks. Observe the new RED before the production correction; record hashes, commands, tests, commits and native disposition after each completed unit. Do not declare production readiness before all applicable acceptance and gates are observed.
