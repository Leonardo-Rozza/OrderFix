# Evaluation release without real charges

## Outcome and authorization
Ship a controlled version for product evaluation, then iterate. The user accepted this scope on 2026-10-19; zero users is their report, not a verified production count.
This does not certify a public/commercial release or reopen the advanced recovery/native-review lane.

## Candidate
- Frontend: `7f615b73c963ffa31188232a7f3b709b9c00f0f0`.
- Backend: `69cb9716b64872d6959d90b4f6a7cbeea2d5a8c6`.
- Mapping found application sources match those commits. Existing unrelated recovery/docs/index/.atl changes must be preserved.
- The compiler review worktree/candidate `7a762d9e` is not an application acceptance result and remains untouched.

## Scope and boundaries
- Evaluation only, initially fictitious data and no real charges. Do not remove PRO code or bypass entitlement/auth/security/public-release guards.
- Reuse existing mail, health, logging, audit and Sentry capabilities before adding anything. No new verification framework or recovery matrix.
- Keep `MP_ENABLED=false` and `MP_CHECKOUT_ENABLED=false` in the eventual evaluation configuration; do not activate payment providers.
- Local checks may use isolated tracked snapshots, installed dependencies and offline Maven. Never copy private/untracked environment files or reuse ambient provider credentials.
- No downloads, live emails, telemetry sends, cloud access, push/PR/merge or deploy until the exact destination, operation and account/session are authorized separately.
- No original recovery cases 10–12, case9 replay, old proof alteration, unrelated cleanup or index reset.
- Leave historical failures/pending reviews recorded; they are not new passes or a public-release approval.

## Tasks
- [x] E1 — Select the real application candidate and run bounded local checks.
  - Route: delegated verification; mapping spans frontend/backend runners and configuration (4+ files).
  - Checks: frontend typecheck, lint, technical build and existing focused auth/repair/charge UI tests; backend Java21 offline compile and existing focused auth/repair/charge tests.
  - Backend tests use existing H2/MockMvc fixtures, not Docker or advanced recovery suites. No changed assertions, skips or artificial TDD RED.
  - Browser/public/provider-backed checks stay pending unless their isolation and authorization are established. No foreign local server reuse.
  - Acceptance: record exact commands, actual results and any cache/environment blockers; never label unit/mock success as a deployed end-to-end pass.
- [ ] E2 — Prepare evaluation runtime and email configuration.
  - Route: delegated configuration mapping/writer where multiple nontrivial files apply.
  - Checks: API/HTTPS/CORS/public URL/DB migrations/secrets and existing no-charge/mail flags; provider and deployed settings remain unverified until authorized.
  - Acceptance: a safe minimal configuration and explicit real email receipt/link/access check before accepting public self-registration.
- [ ] E3 — Prepare minimum practical monitoring and audit.
  - Route: delegated implementation if needed; retain the existing test runners.
  - Checks: sanitized frontend/backend errors, uptime alerts, critical-action actor/time/result coverage and basic backup/rollback.
  - Acceptance: reuse current integrations; identify and implement only genuine minimal gaps. Real alerts/providers require authorization, not assumed configuration.
- [ ] E4 — Deploy the evaluation version and verify its main flow.
  - Route: authorized deployment and focused verification only after E1–E3.
  - Checks: register → verify email → login → customer/equipment → repair → quote/public link, plus no real checkout.
  - Acceptance: user-approved exact environment/account, actual deployed smoke, backup/rollback and clear remaining limitations.

## Verification and delivery
TDD is ON from `odd/tasks/charge-session-expiry.md:15`. Runners: installed Vitest/Playwright and Maven Surefire/Failsafe.
For E1 validation and documentation, RED/GREEN is N/A; behavior fixes need observed RED → GREEN and preserved assertions.
Use Node24.14 and explicit installed Corretto21.0.10 (the default Java17 is unsuitable). Maven must be offline with explicit empty user/global settings and no RC/ambient credentials.
Frontend `npm run build` here is a technical local build, NOT `build:public` or deployment certification. Do not weaken release guards.
Initial forecast: 250–450 authored changed lines over four work units; keep coherent units and readable tests/docs. Cached delivery: ask-on-risk / feature-branch-chain; no PR requested.
First delivery: a new NONHEAD `codex/evaluation-release` ref from frontend candidate, temporary index/CAS, only this tracker. Preserve actual HEAD/index and all unrelated work.
Parent owns this full feature document and Engram mirror `odd/evaluation-release/tasks`; update after each observed task.
Native disposition for a NONHEAD unit is unavailable/pending until a valid context exists, never approval inferred from the wrong HEAD.
Rollback: remove/revert only this feature's unused artifacts/unmerged changes after retaining evidence; never delete historical or user work.

## Progress
E1 local scope passed on 2026-10-19. No application or test changes were needed. E2–E4 remain pending; no cloud/provider operation is authorized or performed.

### E1 observed evidence
Logs: `/private/tmp/ordenfix-evaluation.PgPXr1/logs/` (local temporary evidence, not a durable test artifact).

| Existing check | Observed result |
| --- | --- |
| Frontend `npm run typecheck`, `npm run lint`, `npm run build` | All exit 0; technical build only |
| Focused Vitest suite below | 7 files, 108 passed |
| Backend offline Maven `compile` | 614 source files, BUILD SUCCESS |
| Focused Surefire suite below | 36 tests, 0 failures/errors/skips, BUILD SUCCESS |

Frontend suite: `./node_modules/.bin/vitest run src/pages/RegisterPage.test.tsx src/pages/LoginPage.test.tsx src/store/auth.store.test.tsx src/api/mutations/auth.mutations.test.tsx src/pages/ReparacionesPage.test.tsx src/pages/ReparacionDetallePage.test.tsx src/components/CobroFormModal.test.tsx`.
Backend suite selectors: `-Dmail.enabled=false -Dmercadopago.enabled=false -Dmercadopago.checkout-enabled=false -Dtest=AuthServiceTest,AuthTests,ReparacionFlowTests,CobroOperacionTests test`.
Both run from exact tracked candidate archives under `/private/tmp/ordenfix-evaluation.PgPXr1/{frontend,backend}`, with `env -i`, isolated HOME/TMPDIR and only installed tools/cached dependencies. Frontend uses Node24.14.0, empty `NPM_CONFIG_USERCONFIG`/`NPM_CONFIG_GLOBALCONFIG` files. Backend uses Corretto21.0.10, cached Maven3.9.11, `MAVEN_SKIP_RC=true`, `-o -B -s <root>/maven-user-settings.xml -gs <root>/maven-global-settings.xml -Dmaven.repo.local=/Users/leonardorozza/.m2/repository -f <root>/backend/pom.xml`; both settings files are empty configurations. No source/private environment files were imported.

Snapshot diagnostic: a raw-blob comparison initially failed on backend `mvnw.cmd`. Its tracked `.gitattributes` requires `*.cmd text eol=crlf`: archive output is 8,481 bytes versus the 8,292-byte blob (189 LF expansions). Fresh in-memory archive comparisons matched all 672 frontend and 1,323 backend regular files; no tracked application drift. No tests were repeated for this diagnostic.

Warnings retained: frontend main chunk 677.20 kB (195.19 kB gzip); existing backend compiler/framework warnings. No warning, assertion or limit was suppressed.
Not exercised: browser flow, real email receipt/links, provider connectivity, deployed configuration, public build gates or published end-to-end flow. The technical build explicitly emitted `PUBLIC_RELEASE_CHECK_SKIPPED` and `PUBLIC_ARTIFACT_CHECK_SKIPPED`; neither is a public-release pass.

Delivery: docs-only E1 work-unit commit pending on `codex/evaluation-release`; actual HEAD/index and unrelated work must remain unchanged. Native NONHEAD assessment is unavailable/pending, not an approval. Next: authorized read-only evaluation configuration review, then E2.
