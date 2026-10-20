# Evaluation release without real charges

## Outcome and authorization
Ship a controlled version for product evaluation, then iterate. The user accepted this scope on 2026-10-19; zero users is their report, not a verified production count.
This does not certify a public/commercial release or reopen the advanced recovery/native-review lane.
On 2026-10-19 the user additionally authorized configuring the required variables in the existing Vercel and Railway projects using current sessions. No push, branch cleanup or deployment; the user will publish source later.
The user subsequently authorized reviewing the existing Resend account and reusing its sender/credential in Railway, then explicitly identified the personal Google account for sign-in. No new keys, live emails, deployment or push; do not inspect the alternate account or unrelated private environment files.

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
- Cloud scope: existing OrderFix Railway production backend and order-fix Vercel project variables only, using the current authenticated sessions. Preserve existing credentials and unrelated projects; no live emails, telemetry sends, push/PR/merge, branch cleanup or deployment. Do not create accounts, purchase services or fabricate credentials.
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
  - Route: delegated local configuration mapping (frontend/backend, 4+ files); parent owns bounded provider operations. One mechanical tracker update stays inline.
  - Checks: API/HTTPS/CORS/public URL/DB migrations/secrets and existing no-charge/mail flags; provider and deployed settings remain unverified until authorized.
  - Acceptance: a safe minimal configuration and explicit real email receipt/link/access check before accepting public self-registration.
  - [x] E2a: verify exact hosted projects/domains and variable names without exporting secrets.
  - [x] E2b: persist the verified safe API/origin/runtime variable subset; retain existing credentials and record genuinely missing values. The no-redeploy check failed and was mitigated as recorded below, not counted as a pass.
  - [ ] E2c: complete missing secret/provider/public-release prerequisites and verify deployment effects. Changed-value readback passed with the sensitive Vercel API value limitation below; real email acceptance remains pending.
    - [x] E2c-mail-domain: review the existing Resend sending domain and key metadata using the user-identified account.
    - [x] E2c-mail-sender: stage the verified business sender without deploying; keep mail disabled while the existing secret is unavailable.
    - [ ] E2c-mail-secret: securely obtain the user's saved full existing key and configure it without disclosure, key creation or rotation. Stop for user input if unavailable.
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
E1 local scope passed on 2026-10-19. No application or test changes were needed. E2 is in progress under the additional hosted-variable authorization; E3–E4 remain pending. No deployment or Git push is authorized.

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

Delivery: docs-only E1 work-unit `70c5811174aef72f6e60c162d59a7f4bd50d8eb6` on NONHEAD `codex/evaluation-release`, parent frontend candidate, only this tracker (75 additions). Delegated temporary-index publication preserved actual HEAD/index and all unrelated work; commit whitespace check passed. This commit identity is a subsequent local tracking annotation, not self-contained in that commit. Native NONHEAD assessment remains unavailable/pending, not an approval. E2 hosted-variable preparation is recorded below; E2 is not closed.

### E2 configuration design and current evidence
Preserve DB/admin/JWT secrets, set the actual HTTPS API/frontend origins, explicitly keep payments and destructive closure features off, and leave mail off until an existing valid SMTP credential and verified sender are available. Do not weaken release guards or fabricate legal contacts. No application behavior changes are planned; TDD RED/GREEN is N/A for provider settings. Checks are source-contract mapping, hosted-key/domain comparison, changed-value readback and absence of a new deployment.
Railway docs describe Alt+Deploy for committing staged configuration without redeploying; this failed to suppress a rebuild in the observed browser automation (incident below). Do not repeat that shortcut. Vercel changes affect new deployments only. References: https://docs.railway.com/deployments/staged-changes and https://vercel.com/docs/environment-variables.
Verified Railway: project `OrderFix` (`5dc9bc1c-c27f-415c-b3e9-ee2c4cb3fcd0`), environment `production` (`fac04bc6-9b14-4183-a8d4-aa6257c556a9`), backend `OrderFix-B` (`08dd3601-8ca6-423b-b131-30bf39af5efe`), public host `orderfix-b-production.up.railway.app`. Existing 13 service variables include DB/admin/JWT credentials; preserve them. APP_PUBLIC_URL incorrectly contains the backend host without a scheme; CORS_ORIGINS contains a trailing slash. No device encryption key, MAIL variables or explicit MP switches are present at this service scope; shared variables must still be checked before declaring secrets absent.
Verified Vercel CLI session: `leonardo-rozza`, team `leonardos-projects-46cce6d3`, project `order-fix` (`prj_gKRHZjiaIxvBpPvullDFWI8ChetG`). Verified canonical domain `www.orden-fix.com.ar`; apex redirects to it with 308; `order-fix.vercel.app` is also assigned. Browser Vercel session is logged out; no new login was needed while the authorized CLI session worked.
Local mapping found production builds require an approved tracked legal publication manifest and real matching contact values; none is tracked in the current candidate. Variables alone cannot satisfy that guard. Genuine Preview builds are distinct; never spoof provider metadata or replace the build command to bypass the gate.
Rollback scope: only E2 variable edits, using preserved provider values/references without putting credentials into this document. No existing credential rotation, DB mutation or source/index change is part of this work.

### E2 saved configuration and verification
Railway has 23 service variables after these 12 changes (two updates, ten additions); there are zero project shared variables. Existing DB/admin/JWT credentials and other original values were not changed or exported.

| Railway key | Saved value |
| --- | --- |
| `APP_PUBLIC_URL`, `CORS_ORIGINS` | `https://www.orden-fix.com.ar` |
| `MP_ENABLED`, `MP_CHECKOUT_ENABLED` | `false` |
| `MAIL_ENABLED` | `false` pending real provider credentials/sender |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME` | `smtp.resend.com`, `587`, `resend` |
| `RATE_LIMIT_ENABLED` | `true` |
| `ORDENFIX_CLOSURE_NOTIFICATIONS_ENABLED`, `ORDENFIX_CLOSURE_NOTIFICATIONS_SCHEDULED`, `ORDENFIX_CLOSURE_PROFILE_ERASURE_ENABLED` | `false` |

All 12 saved values matched subsequent UI readback after persistence/reload. Only nonsecret values were revealed. Previous nonsecret origins were `APP_PUBLIC_URL=orderfix-b-production.up.railway.app` and `CORS_ORIGINS=https://www.orden-fix.com.ar/`.

Vercel accepted these three variables for both Production and Preview: `VITE_API_BASE_URL=https://orderfix-b-production.up.railway.app` (existing sensitive type/id retained), `VITE_REGISTRATION_CONSENT=false`, `VITE_WORKSHOP_CLOSURE_ENABLED=false`. Metadata/targets and the two plain values matched readback. The sensitive API value was accepted in the write but not decrypted for readback; do not claim a deployed fetch succeeded. No other project, domain, build command, provider metadata or runtime version was changed.
The initial Vercel bulk request failed with HTTP400 Invalid JSON. Read-only inspection found installed CLI50.33.0 only serializes plain objects, not a parsed top-level array. Three ordinary single-object requests succeeded, with no CLI patch, upgrade, double-encoding workaround or API permission bypass.
Vercel latest deployment remained `dpl_9WdDjtNGeKMqYHDKwikKsoqtNXab`, already ERROR before this work; no Vercel deployment was created.

**Railway incident, not a no-deploy pass:** documented Alt+Deploy was attempted with the Alt modifier, but created rebuild `c16b1409-ac5a-4e7a-8cf4-ae93bcb89b20`. It was immediately aborted during BUILDING; history shows REMOVED. Reload confirmed the original active deployment `2620564f-9377-4be7-bd63-a9c32bfa9f01` still SLEEPING, with no ongoing build. Variables remain saved for a later deployment. No Git push was performed; this was an unintended provider-side build attempt, not publication of local source. The reason the shortcut did not suppress it is unproven.
Screenshots (temporary local evidence): `/private/tmp/ordenfix-railway-variables.jpg`, `/private/tmp/ordenfix-railway-deployment-aborted.jpg`.

### E2 still required before release
- `DEVICE_CREDENTIALS_ENCRYPTION_KEY` is missing at service/shared scope. Do not generate a replacement merely because the variable is absent: `DeviceCredentialLegacyMigration` validates existing ciphertext and atomically migrates plaintext; a wrong key rejects existing encrypted rows. Recover any prior key or establish backed-up safe initialization before deployment. No DB was read or modified here.
- `MAIL_PASSWORD`/`API_KEY_RESEND` is not configured. The verified `MAIL_FROM` is staged only, not applied or running. SMTP host/port/user alone do not enable delivery. Mail remains off; no real message or verification/reset link was tested.
- Production public build still lacks its approved tracked legal publication manifest and actual matching legal/privacy/support contacts. No fake manifest/contact or gate bypass was added; a genuine Preview is not Production approval.
- Existing DB/admin/JWT secret presence was observed, not database connectivity or full runtime validity. No new app tests were necessary for these provider/documentation-only edits; browser, real email, published smoke, monitoring activation and E3/E4 remain pending.

Next: obtain the missing sender/provider setup and safely resolve the device key before publication. E2 preparation work-unit `4fe3949455723abc6da3cf84f44d2144d86ad2d8` (parent `70c5811`, tracker only, 45 additions/4 deletions) is on NONHEAD `codex/evaluation-release`; commit whitespace passed. Actual HEAD/branch/index and all other refs stayed unchanged. This subsequent local annotation records the commit identity; it is not self-contained in that commit. Native assessment remains unavailable/pending, with no approval claimed. Never mark the overall E2 task complete on this partial result.

### E2 Resend follow-up
Route: parent-owned, bounded provider inspection and one sender-variable preparation; no application or test edits. Reuse the existing mapped SMTP/link contract; TDD RED/GREEN and app test reruns are N/A. Checks: current domain status, existing key permission, masked-token handling, sender draft readback and no deploy action. No new framework or recovery work.
The user's screenshots show a historical received reset email from `notificaciones@cuenta.orden-fix.com.ar` with a local loopback link, not a published reset-flow pass. Current authenticated Resend inspection confirms domain `cuenta.orden-fix.com.ar` is **Verified** (domain ID `6ad6313e-e713-48b0-8dff-bb82e51e71fd`). The existing key `Onboarding` has Sending access / All domains; it was not created, rotated, renamed or changed. Dashboard list/detail activity labels differ, so do not infer whether that key sent the historical message from those labels.
The existing token is masked and the detail page offers no reveal/copy control. Resend documents that existing API key values cannot be viewed again: https://resend.com/docs/dashboard/api-keys/introduction. No secret material was printed, stored or transferred. Resend authentication initially hit an expired OAuth state; restarting the normal flow once with the user-selected account succeeded without account creation or expanded scopes.
Sender preparation target: `MAIL_FROM=OrdenFix <notificaciones@cuenta.orden-fix.com.ar>`. Only stage this nonsecret value in the existing Railway production backend, preserve `MAIL_ENABLED=false`, and do not apply/redeploy changes or repeat the failed Alt+Deploy shortcut. Existing full key must come from the user's saved copy; do not probe local secrets or other sessions for it. Overall E2 remains pending.

Observed sender preparation: parent staged only `MAIL_FROM=OrdenFix <notificaciones@cuenta.orden-fix.com.ar>` in the existing Railway backend. Reload/readback confirmed the exact sender, `MAIL_ENABLED=false`, 24 displayed variables and **Apply 1 change**. This is an unapplied draft, not the running environment. Temporary screenshot: `/private/tmp/ordenfix-railway-mail-from-pending.jpg`.
No Apply/Deploy/Alt shortcut, live email, new key, secret read/transfer, source push or application/test change occurred in this follow-up. The existing Resend key stayed masked; contradictory activity labels do not establish its usage. Domain/sender verification does not prove delivery or a published account flow.
Next: securely obtain the user's saved full existing key through an authorized private handoff, without requesting raw secret text in chat or probing private environment files. Keep `E2c-mail-secret`, overall E2 and deployed email acceptance pending. TDD RED/GREEN and app test reruns remain N/A for this provider/documentation-only unit; native NONHEAD assessment is unavailable/pending, not approval.

Delivery: delegated docs-only sender-stage work-unit `3f0566675e3b3b71a81084c485cc6b0e16a11a30` (parent `4fe3949`, tracker only, 16 additions/2 deletions), routed to a bounded writer by the long-session backstop. Temporary-index publication and exact CAS preserved actual HEAD/branch/index and all other refs; whitespace passed and the file matched its committed blob at publication. This subsequent local annotation is not self-contained in that commit. No provider operation or test rerun was part of the documentation unit; overall E2 stays incomplete and native NONHEAD assessment stays unavailable/pending.
