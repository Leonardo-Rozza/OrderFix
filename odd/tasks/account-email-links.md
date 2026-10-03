# Build safe account verification and password-reset links

Status: approved design; implementation/checks pending. Engram mirror pending/unavailable.

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

- [ ] **A1 Correct account links with preserved email semantics.**
  - Route: delegated writer. Mapping/preparation covered 4+ files; two non-trivial services, shared builder and tests require delegation. Parent owns tracker, frozen patch transfer, commits and native disposition.
  - Acceptance: canonical HTTPS/local links with/without final slash; reject unsafe/malformed origins and empty/unsafe tokens; same link in text/HTML; invalid configuration sends nothing, logs no secrets, preserves generic completion/token transaction; disabled mail remains disabled.
  - TDD: observe service-level assertion RED before production edits (not setup/compilation failure), focused GREEN then refactor. Preserve escaping, issuance, commit/rollback and SMTP failure coverage.
  - Checks: new builder tests, AccountVerificationNotifierTest, CuentaResetSchedulingTest, CuentaVerificationSchedulingTest, AccountVerificationTokenIssuerTest, AccountEmailTemplateTest, SmtpEmailSenderTest, EmailConfigurationTest, RecoveryQuarantineEnvironmentPostProcessorTest. Offline full source/test compilation, allowlist/hash integrity and whitespace checks.
  - Runtime boundary: synthetic unit observers/transaction callbacks only; no application context/network/server/DB. Physical transaction, backend integration, browser and deployed checks remain pending, not waived.
  - Rollback: remove builder/paired tests/docs and restore only the two account-link construction paths, preserving all prior release/email changes.
  - Evidence: pending. Work-unit commit: pending. Native outcome: pending.

## Progress and next step

Read this document before edits. Freeze a public-only new snapshot, observe RED and implement approved scope. Record exact runner, counts, logs, hashes, commit identities and unavailable checks at closure.

Engram tools are unavailable; no authoritative session ID supplied or invented. Local progress is preserved. Read back and mirror the full document to odd/account-email-links/tasks when tools return. This is the single approved ODD design/task artifact; no SDD selected.
