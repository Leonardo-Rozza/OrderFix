# Preserve successful email retry state against obsolete reads

## Objective and authorization
The user accepted this separate local follow-up on 2026-10-05: cancel or fence competing reads before publishing a successful repair-email retry response, and add a held-GET regression before activating emails. The approved E3 receipt remains closed; this is a new candidate, not its correction or reopening.

## Accepted design and scope
- An exact repair/session-generation GET started during a POST must not replace the successful POST DTO when its obsolete response arrives later.
- Cancel that exact query before publishing the successful DTO. Recheck the active repair/account/session after the asynchronous cancellation, preserving existing cross-session and unmount isolation.
- Preserve the server DTO verbatim, including valid eligible 200 responses. Do not assume success means sent or newly queued, and do not impose a blanket retry prohibition.
- Keep the existing uncertain-error barrier until explicit refresh. A later explicit fresh GET remains authoritative.
- Allowed source paths: `src/api/queries/repairEmail.queries.ts` and its paired `.test.tsx`. Parent owns this tracker, commit and native assessment.
- No backend, UI markup, auth/store/storage, provider, SMTP, activation, Docker, private configuration, network, deployment, push, PR or merge changes. Preserve the unrelated dirty `repair-ready-email.md` and `.atl/`.

## Baseline and policy
- Repository: `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`; branch `codex/account-email-links`.
- Baseline/effective reviewed boundary: `afd67c0243e72cb880c19a4f8b9527d601f6b8aa`. Original E3 native approved boundary: `02f443d659c1ef4b96142378a9cebb0591b80993`.
- Original tracker/full Engram observation 840 reconciled exactly: 49,763 characters, SHA256 `f16e0fc26ced0012bf0f5be3a1104d0e2d571c1c1fab1f2d7d4986903244abbf`. Leave that document untouched; use this distinct follow-up identity.
- TDD **ON**, explicit prior choice in `odd/tasks/charge-session-expiry.md:15`. Require an observed compilable assertion RED before production edits, then GREEN and cleanup; setup failures do not count.
- Runner: installed Node 24.14.0 and Vitest 3.2.6 (`node node_modules/vitest/vitest.mjs run --config <own-TEMP-safe-config>`), adapted from public `vite.config.ts` with `envDir: false`, literal synthetic environment and owned caches.
- Use public-only snapshots and a physical owned TEMP `node_modules` directory with installed-package links, not a link of the whole directory. No downloads or private `.env`/npm configuration.
- Native RDD **ON/global**, freshly verified. New candidate assessment and consent are separate; no earlier sharing grant is inherited.
- Delivery: cached `ask-on-risk` / `feature-branch-chain`, forecast 120–250 authored source/test/document lines, one coherent work-unit commit. About 400 is advisory, not a test/readability cap. No remote delivery authorized.

## Task
- [x] **S1 Fence obsolete reads at successful retry publication.**
  - Route: delegated direct. Mapping/preparation spans hook, tests, API/Axios cancellation and runner files; writer owns two non-trivial source/test files. Parent owns product decisions, task/mirror, commit and native disposition.
  - Acceptance: held GET initiated during pending POST cannot overwrite successful `PENDIENTE` or `INCIERTO` DTOs or restore retry permission. Verify exact cache state, UI/hook state and no second POST. Preserve valid eligible 200 responses, explicit fresh refresh, uncertain-error and foreign-session protections.
  - Focused checks: hook plus API/Axios/cache-consistency/card/detail paired suites under installed Vitest. Observe RED and GREEN separately, without summing reruns.
  - Closure checks: full Vitest, `test:release`, lint, typecheck, technical build, source/new-file-inclusive whitespace and index hygiene. Record every failed/skipped/unavailable check.
  - Runtime boundary: the late-result regression deliberately models API completion that ignores AbortSignal and awaits its completion plus Query invalidation settlement. Eligible-200 and scope controls use local MSW. These are deterministic hook/Query and synthetic HTTP checks, not real backend/provider/inbox delivery. Browser/visual rerun N/A for unchanged markup; deployment/publication gates remain separate.
  - Rollback: remove this follow-up's successful-response cancellation and paired regression tests together, preserving E3 and all earlier receipts.
  - Commit: `6add19efb4eb96745cf708bed0de1cce37347c19`, `fix(notifications): fence stale reads after successful retry`; three paths, 197 additions/2 deletions = 199 authored lines. New-file-inclusive staged whitespace passed and index is empty. Native assessment: **medium / under_budget**, `review_due: false`; this slice remains pending, not reviewed or approved.

## Progress and next step
The bounded fix, independent ordinary full checks and coherent work-unit commit are complete. Sending remains off. Native assessment does not require immediate review; the medium slice remains pending against `afd67c0`, without sharing or actor execution. Next: separate authorized provider/activation and outstanding coordinated release work; do not infer production readiness. No fixture/setup failures occurred.

## Observed implementation evidence
- Production `onSuccess` cancels the exact repair/generation query and rechecks active repair/account/session after awaiting before publishing the server DTO unchanged.
- Genuine RED: 16 hook cases, 11 pass/5 expected assertion failures, exit 1, production hash unchanged. The two status-order cases reproduced obsolete eligibility; three additional cases covered repair/workshop/unmount changes while cancellation is awaited.
- GREEN: hook 16/16, final focused 207/10 physical files, zero failures/skips; scoped lint and source whitespace exit 0. Do not sum these reruns.
- Preserve both eligible `SIN_EMAIL`/`FALLO_PREVIO` successful 200 DTOs, later explicit fresh GET permission, prior uncertain-error barrier and existing foreign-session regressions.
- Proof: `/private/tmp/ordenfix-success-fence-writer-nnv0aole/summary.json`; exact commands/config/results retained in its phase directories. Source delta 143 additions/2 deletions = 145 authored lines in the two allowed paths.
- Final public331 map SHA256 `c0287efee7ac125005f2a58f00cdd24774d7701d5a265b9d1c6fae197083789f`; snapshot342 map `14bc083efb6c5ab8698ce86a2efb526bde704e081c95a8ac8c13eb5f9f6e77d9`. Parent inspected the bounded diff and phase summary; original E3 tracker remains unchanged.

## Independent closure checks
- `/private/tmp/ordenfix-success-fence-full-ve3xd_3s/receipt.json`, SHA256 `61463e5f72f2e0efe0f9d8acde17414402793982a66a94b92571d67c33ed657b`: all eight actual steps exit 0, one pass. Exact argv/environment/stdout/stderr retained there.
- Full Vitest **1,204/1,204 cases across 117 physical files**, zero failures/skips. Parameterized titles may repeat: 1,182 textual titles and 273 nested suites are not case/file counts. Focused reruns are not added.
- Release tooling **44/44**, no failures/skips; full lint, typecheck and technical build pass. Guards report `PUBLIC_RELEASE_CHECK_SKIPPED` / `PUBLIC_ARTIFACT_CHECK_SKIPPED`, so public/deployed readiness is not established.
- Existing informational bundle warning: largest 675.29 kB. Browser/visual rerun N/A for unchanged markup; actual backend/provider/inbox/activation/Docker/deploy checks not run.
- Writer342/local343/public original341 plus two known supplements remain unchanged before/after; exact two source hashes preserved. Receipt's nested initial pending label is superseded by its actual final status and verified comparisons.
- Aggregation-only correction read Node 24's actual spec-reporter summary after a TAP-assuming parser left release counts null; original retained, no test/setup failure or rerun.

## Native delivery checkpoint
- Exact committed-only range: `afd67c0243e72cb880c19a4f8b9527d601f6b8aa..6add19efb4eb96745cf708bed0de1cce37347c19`, three paths/199 lines. Cumulative prior feature work-unit count 7,047 + 199 = 7,246; this follow-up is a distinct coherent slice on the cached feature-branch chain, no PR created.
- `/private/tmp/ordenfix-success-fence-parent-2s3rhjb_/assess-permitted.json`: exit 0, empty stderr, native medium/executable_change and `review_due: false`, reason `under_budget`. Do not advance the reviewed boundary or claim an approval; no START/actor/sharing ran.
- Initial assessment failed safely on undeclared `.atl` files; canonical STATUS obtained exactly the two known unrelated registry paths and inventory `sha256:4425697ab74255760bb7c3b87dc13642263a59d4b65cc516abaa19765c94da71`. Two default-sandbox snapshot/index attempts failed on permissions before the permitted local STATUS/assessment succeeded. Failed assessments were treated as due, never as low risk.
- Native frozen target `sha256:aa60353744eab00191187381fedf7970bf4b1489aefd92e618eee02cd9c748fd`; base tree `962df7f57b0294bf38c8375266c143e6fcf4e379`, candidate tree `c5934ba3f2897515c0c16bc4a9ae01689ff22c3e`. Only the exact committed three-file unit was assessed; original tracker annotations and `.atl` remain excluded and preserved.
- These post-commit identity annotations are outside the immutable work-unit blob. No email/provider/activation/deploy/push/PR/merge or future review grant is implied.

## Recovery mirror
Repository-relative locator: `odd/tasks/repair-email-success-read-fence.md`. Full Engram topic: `odd/repair-email-success-read-fence/tasks`. Mirror and read back after each task update; no authoritative runtime session ID is available, so omit `session_id`.
