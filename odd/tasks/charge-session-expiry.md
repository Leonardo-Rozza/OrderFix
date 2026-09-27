# Separate charge session identity from token expiry

## Objective and authorization
Fix the two expiration edge cases explicitly approved by the user: process an in-flight charge's current-session 401 normally after token expiry, and preserve unresolved charge recovery when the same account renews its expired token. This is a separate follow-up to informational review findings R3-expiry-session-guard, R4-001 and R4-002, not a reopened correction of the approved previous candidate.

## Scope and design
- Separate stable authenticated account identity (normalized JWT subject and positive safe workshop ID) from token validity. Keep the serialized account identity and stored snapshot schema unchanged.
- Use stable identity plus session generation for captured callbacks and identity-change decisions. Keep token-expiry validation for new charge dispatch and existing UI access.
- Current-session 401 still releases unsaved-change guards, logs out and purges pending recovery. Expired-token rehydration, explicit logout, account/workshop changes and existing role-change cleanup retain their behavior.
- Same-account renewal preserves the exact pending payload, operation ID and generation. Genuine session replacement must still prevent stale responses from clearing, notifying, closing or logging out the replacement session.
- No automatic renewal mechanism, backend/migration change, new storage format, UI feature, remote access, downloads, push, PR, merge or deploy.

## Baseline and policy
- Repository: mvgr-reparaciones-frontend. Baseline/review boundary: 374d2ae95097b7050f1faa67826653ef38eed85a. Reuse current feature branch codex/charge-retry-recovery for this bounded follow-up. Preserve unrelated untracked .atl files.
- TDD ON from prior explicit session approval: controlled-clock RED before production edits, then GREEN and cleanup. Use the installed Vitest runner, no downloads.
- Native RDD ON (global, verified with review mode status). The previous candidate's review consent does not authorize this new candidate. Parent owns commit and native assessment.
- Delivery: ask-on-risk, forecast 180–250 authored source/test lines plus this tracker (under 400). One coherent behavior-and-regression work unit; no size exception inherited. The line budget is a planning heuristic, not a reason to remove tests or readability.

## Task
- [x] E1 Correct expiry boundaries without weakening session isolation.
  - Route: delegated writer. Mapping/preparation spans six non-trivial source/test files; user AGENTS mapping, preparation and writer triggers apply. Parent owns this document and its full Engram mirror.
  - Sources: src/utils/pendingCharge.ts, src/store/auth.store.ts, src/api/axios.ts; tests alongside them. Modal/mutation/page callers should require no behavioral edits unless a proven regression requires them.
  - Acceptance: controlled-clock evidence for in-flight 401 after expiry, same-account renewal preserving exact pending state, and expired-before-dispatch rejection. Exercise the async 403 validation boundary; preserve existing logout/identity-change and stale-response regressions.
  - Focused runner: ./node_modules/.bin/vitest run src/utils/pendingCharge.test.ts src/store/auth.store.test.tsx src/api/axios.test.ts src/components/CobroFormModal.test.tsx src/api/mutations/cobros.mutations.test.tsx src/pages/ReparacionDetallePage.test.tsx.
  - Full checks: npm run typecheck; npm run lint; npm test (Vitest plus release checks); npm run build; git diff --check.
  - Runtime boundary: local MSW held-response tests with controlled Date.now prove request/response/session/storage behavior, not server persistence. Browser/deployed checks remain deferred.
  - Rollback: this follow-up's identity/validity separation and paired tests together, preserving previous charge-retry implementation and approved native receipt.
  - Commit bbed873407bb930569436d0faead192a14a5c3a4: 221 additions + 15 deletions = 236 authored lines, including 39 tracking lines. Native high / high_risk; user deferred review until after functional work. Exact native START consent=declined returned declined_this_candidate; no reviewer ran and no approval is claimed.

## Progress and next step
Implementation and automated checks are complete and committed. Parent inspected the six-file diff and test logs. The user explicitly deferred review and asked to resume functional closeout first. E1 is complete under ordinary delivery policy with review deferred, not reviewed or approved. Next: resume verified functional backlog; revisit this review after that work, without changing the global review-mode preference.

## Observed verification
- Root cause: expiration-dependent account extraction was reused for stable-session comparisons. Added chargeAccountIdentity for identity comparisons while preserving chargeAccount validity semantics; Axios dispatch now explicitly requires both current generation/identity and an unexpired token. No modal, page or mutation source change was needed.
- TDD RED: 4 expected failures out of 54 auth/Axios tests before source edits (in-flight 401 expiry, in-flight 403 validation expiry, same-account renewal losing recovery, captured identity invalidated by expiry). Expired-before-dispatch rejection already passed and remains a negative control.
- GREEN: 122 tests across the six focused suites. Full npm test: 1,107 Vitest tests across 114 files plus 43 release checks, all passed. Typecheck, lint, build and git diff --check passed.
- Controlled Date.now plus held MSW responses prove logout, pending snapshot purge, generation invalidation, query-cache cleanup and guard release. Renewal preserves the byte-identical stored request, operation ID, cache and generation. Rehydration of an expired token still logs out; logout and subject/workshop/role changes still purge.
- Logs: /private/tmp/charge-session-expiry-proof/{red,green,typecheck,lint,test,build}.log. Source/test delta: 182 additions plus 15 deletions = 197 authored lines across six files, plus tracking. No downloads or remote operations.
- Remaining limits: no real browser, backend or deployed checks. Build succeeds with the existing main-bundle size warning (668.23 kB); public release/artifact checks are skipped in local mode. No native review has run for this new unit; the previous approved candidate remains closed.

## Native delivery checkpoint
- Candidate: committed-only 374d2ae95097b7050f1faa67826653ef38eed85a..bbed873407bb930569436d0faead192a14a5c3a4; 7 files / 236 lines. Native assessment high, review_due=true, reason high_risk. Exact STATUS and START consent=relay observed. No size exception required and no previous review consent reused.
- Target sha256:568fdf2643bd6839717cd3430b12235b978b94fe84e54f6c93ea86d75d9fd0d9; lineage review-7253f669647fd09c; base tree 0d6b6f05e4396b1752b6c74eb69885b84c10fd3e; candidate tree 3af60a07582dcd8ce74b28880b25b5d9e54424a7; paths digest sha256:375062c260dc0bcd7d867b7b55bf5167078ea2408faa6dd79f7d8591b43e63c6.
- Only preexisting .atl files excluded; inventory sha256:4425697ab74255760bb7c3b87dc13642263a59d4b65cc516abaa19765c94da71. User response: defer review until functional work is finished. Native START consent=declined returned declined_this_candidate for this target; no review was run, and RDD mode remains unchanged. No push, merge or deploy.
