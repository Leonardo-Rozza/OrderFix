# Build safe account verification and password-reset links

Status: A1 implemented and verified with 268 isolated passing unit tests. Native medium slice remains under budget, not reviewed/approved. Deployed/inbox validation and Engram mirror remain pending.

## Outcome and authorization

Use one pure builder for existing verification/reset emails. Current APP_PUBLIC_URL concatenation generates double-slash paths for a final slash and admits insecure/malformed origins. This is a source defect, not proof of a deployed configuration failure. User approved the local design on 2026-10-03: “Dale avanzemos”.

## Approved design and boundaries

- HTTPS origin without credentials, query, fragment or path except an optional final slash. HTTP only for localhost, 127.0.0.1 and [::1]. Normalize the final slash; build only existing verification/reset routes with URL-safe tokens.
- Invalid configuration emits no email/link, uses a fixed secret-free diagnostic and preserves generic responses. Reset validation must not cause a 500 or roll back token persistence.
- Preserve issuance/commit callbacks, single use, rollback, anti-enumeration, best-effort SMTP and existing mail-disabled/startup-quarantine barriers. HTML escaping remains independently covered.
- Scope: AccountVerificationNotifier, CuentaService, new service/email/AccountEmailLinks, paired unit tests and brief docs/operations/email.md addition. No UI, transport, endpoints, flags, credentials or migrations.
- Not authorized: Docker/app/DB/browser startup, real SMTP, remote Railway/Vercel/provider access, private settings, downloads, push, PR, merge or deploy. Real deployed flow/inbox delivery remains pending.
- Preserve frontend odd/tasks/repair-ready-email.md, backend odd/tasks/v38-deploy-fixes.md and both .atl directories byte-for-byte.

## Baseline and policy

| Control | Value |
| --- | --- |
| Frontend baseline | 84dd47ec684e731d2a507d2cd9d1d41f14e7002c |
| Backend baseline / first review boundary | 00b265d257bf44d87ebbe858bcf1d519e5236dbf |
| Branches | codex/account-email-links in both repositories |
| TDD | ON from explicit prior session choice in odd/tasks/charge-session-expiry.md:15 |
| Runner | Installed Java21/Maven3.9.11, offline Surefire in new secret-free source snapshot; adapt prior E2-S env-i runner, never treat old snapshot as candidate proof |
| Native RDD | ON, deciding source global; current status verified; new candidate needs separate assessment/consent |
| Delivery | ask-on-risk; prior session feature-branch-chain choice cached; no PR/push authorized |
| Forecast | 280–380 source/test/docs lines plus about 60 tracking lines; advisory, never code-golf |
| Persistence | Locator odd/tasks/account-email-links.md; full topic odd/account-email-links/tasks mirror pending/unavailable |

## Task

- [x] **A1 Correct account links with preserved email semantics.**
  - Route: delegated writer. Mapping/preparation covered 4+ files; two non-trivial services, shared builder and tests require delegation. Parent owns tracker, frozen patch transfer, commits and native disposition.
  - Acceptance: canonical HTTPS/local links with/without final slash; reject unsafe/malformed origins and empty/unsafe tokens; same link in text/HTML; invalid configuration sends nothing, logs no secrets, preserves generic completion/token transaction; disabled mail remains disabled.
  - TDD: observe service-level assertion RED before production edits (not setup/compilation failure), focused GREEN then refactor. Preserve escaping, issuance, commit/rollback and SMTP failure coverage.
  - Checks: new builder tests, AccountVerificationNotifierTest, CuentaResetSchedulingTest, CuentaVerificationSchedulingTest, AccountVerificationTokenIssuerTest, AccountEmailTemplateTest, SmtpEmailSenderTest, EmailConfigurationTest, RecoveryQuarantineEnvironmentPostProcessorTest. Offline full source/test compilation, allowlist/hash integrity and whitespace checks.
  - Runtime boundary: synthetic unit observers/transaction callbacks and existing isolated in-memory ApplicationContextRunner configuration tests only; no Boot/application startup, scheduling, network, server or DB. Physical transaction, backend integration, browser and deployed checks remain pending, not waived.
  - Rollback: remove builder/paired tests/docs and restore only the two account-link construction paths, preserving all prior release/email changes.
  - RED evidence: new public-only snapshot /private/tmp/ordenfix-account-email-links-a1.H1N0yN; production unchanged; run-maven.sh -Dtest=AccountVerificationNotifierTest,CuentaResetSchedulingTest test returned exit1, 61 cases / 44 assertion failures / 0 errors or skips. Full 602 production + 474 test sources compiled. RED log SHA256 46735e60c93f55dea24be539768b7c68e0b1b58f3408cbe5a34855ef2cb6154a; parent read back report/hash. GREEN and source commit observed; native review deferred by the exact under-budget assessment (not an approval).

## Verified outcome

- Shared AccountEmailLinks is used by both existing account-email paths. HTTPS or exact HTTP loopback only; canonical routes despite a final slash; invalid origins/tokens produce no mail or leaked values. Reset preserves its generic result/token transaction without registering an invalid callback. Verification retains best-effort failure diagnostics/no retry. Independent HTML escaping and disabled SMTP remain covered.
- Source work-unit commit: f87997f77529d00230e6cda4366733fc6375151d; seven files, 228 additions + 8 deletions = 236 authored lines. Parent verified all 1,182 public candidate files and all seven committed blobs against the tested snapshot; six unrelated preserved paths remain byte-identical.
- Focused GREEN: 124 unique cases / three classes, exit0. Final regression: 268 unique cases / twelve classes, zero failures/errors/skips, exit0; repeated runs are not added together. Full offline compilation: 603 production + 475 test sources, exit0. Existing mapper warnings remain unchanged; whitespace/allowlist checks passed.
- Final runner: /private/tmp/ordenfix-account-email-links-a1.H1N0yN/run-maven.sh -Dtest=AccountEmailLinksTest,AccountVerificationNotifierTest,CuentaResetSchedulingTest,CuentaVerificationSchedulingTest,AccountVerificationTokenIssuerTest,AccountEmailTemplateTest,SmtpEmailSenderTest,EmailConfigurationTest,RecoveryQuarantineEnvironmentPostProcessorTest,RepairReadyEmailTemplateTest,SmtpRepairReadyEmailTransportTest,RepairReadyEmailTransportConfigurationTest test
- Compile runner: same new snapshot run-maven.sh -DskipTests test-compile. Java21/Maven3.9.11/offline env-i, synthetic settings; configuration tests use only the two authorized in-memory contexts.
- Frozen proof root: /private/tmp/ordenfix-account-email-links-a1.H1N0yN/proof. Patch SHA256 9c23ca04421bbb3a89858299774cf0c48a6d6c7e2408cabb101a03466643620e; full source manifest SHA256 5fffe8a44f323f9dd1efa918d2821bdd7f6b96f13e9d0c91e5b54ca79550e238; allowlist manifest SHA256 0736754cb980a3bf19bf4ceb14ae4a5eda30ac1e202087544cc95f8d36aa95f9. XML/logs/commands/counts and unavailable checks are in verification-summary.json and independent phase-report directories.
- Exact native assessment: backend 00b265d..f87997f is medium/executable_change, review_due=false, reason under_budget, 236 lines. No reviewer/remote review ran or was granted; backend reviewed boundary stays at 00b265d for the accumulating slice. Planning assessment is passive. No assessment failure, gate bypass or mode change.
- Not executed: Boot/Docker/DB/browser startup, physical integration, full backend clean verify, real SMTP/provider access, frontend regression or deployed/inbox checks. No frontend behavior changed; those coordinated release checks remain pending, not waived. No push/PR/merge/deployment or private configuration access.

## Progress and next step

Planning commit 04dcc700550aaa544f7313e5a734e6a7692c5b58: 47 authored lines. Native assessment against frontend baseline is passive/non_executable_only; no review due and boundary advances to this commit. Source task A1 is functionally closed by its work-unit commit and observed checks. Next validate the actual Railway/Vercel registration, verification/resend/reset and inbox flow only after separate explicit destination/operation/session authorization; do not resume withdrawn local runtime work. Parent proof root /private/tmp/ordenfix-account-links-parent.zIMxwh holds baseline preservation and exact assessment. The feature currently has 283 authored committed lines (47 planning + 236 source), before this documentary outcome; no PR slice is created. The cached chain strategy remains available if later authorized work crosses the advisory budget.

Engram tools are unavailable; no authoritative session ID supplied or invented. Local progress is preserved. Read back and mirror the full document to odd/account-email-links/tasks when tools return. This is the single approved ODD design/task artifact; no SDD selected.
