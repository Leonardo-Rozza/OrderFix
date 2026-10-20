# Consolidate local application branches into main

## Outcome and authorization
The user authorized local merges into `main` and deletion of unnecessary branches
in the frontend and backend. Preserve necessary work; the user will push later.
Only local Git maintenance is authorized: no fetch, push, remote branch deletion,
provider configuration, deployment, email, or advanced recovery execution.

## Scope and preservation
- Frontend: `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`.
- Backend: `/Volumes/DiscoExtern/Desktop/mvrg-backend`.
- Preserve existing commits, staged/unstaged changes, untracked files and worktrees.
- Never use blanket staging, reset, clean, automatic stashing or history rewriting.
- Integrate the tested application history and the necessary existing PRO fix.
- Keep experimental compiler work out of main; preserve unique runtime histories
  with local archive tags before removing their redundant branch names.
- Remove an absent worktree registration only after verifying that its metadata
  contains no unpreserved staged work. Do not touch the occupied compiler worktree.
- Branch deletion requires verified reachability from main or an explicit archive
  tag. Record original tips and final refs; never infer redundancy from names.

## Tasks
- [x] C1 — Integrate the backend application and existing recurrent-payment fix.
  - Route: delegated writer; two non-trivial existing source/test files and
    divergent histories require bounded integration rather than an inline edit.
  - Start: main `391dd6330afdc2679afad1a93fbe066b1bc98e72`, application
    `69cb9716b64872d6959d90b4f6a7cbeea2d5a8c6`.
  - Include `d2d4dce524bca58b9e2e9039a7330e0400c05108`: reject a mismatched
    authorized-payment resource before fetching a payment or applying entitlement.
  - Acceptance: preserve both histories; final application tree equals the existing
    PRO tip; run the unchanged focused regression offline; retain the dirty V38
    document, untracked files and any unique worktree metadata.
- [x] C2 — Integrate the frontend application and release-tracking history.
  - Route: delegated Git writer after delegated multi-branch mapping; preserve the
    populated index and dirty files while changing refs/checkouts.
  - Start: application `7f615b73c963ffa31188232a7f3b709b9c00f0f0` and release
    tracker `3f0566675e3b3b71a81084c485cc6b0e16a11a30`.
  - Acceptance: main contains both histories and this maintenance record; application
    sources/tests/configuration stay identical to the tested application candidate.
- [x] C3 — Delete redundant local branches and verify both repositories.
  - Route: delegated bounded cleanup per repository, coordinated by the parent.
  - Acceptance: both primary checkouts are on main; deleted tips remain reachable;
    only genuinely necessary occupied branches remain; no original dirty content
    is lost; remote refs are unchanged; report retained branches/archive tags.

## Verification and delivery
TDD is ON from `odd/tasks/charge-session-expiry.md:15`; retain Vitest/Playwright
and Maven Surefire/Failsafe. This task integrates existing commits, not new behavior:
do not manufacture RED or edit assertions. Run the backend's existing focused mock
regression; frontend application reruns are unnecessary if tree identity is proved.
Runtime harness: N/A, local Git maintenance only; no Docker or provider calls.
RDD status is ON from the global setting in both clones. Never toggle it, infer
approval, or start a remote review without candidate authorization. Record actual
local assessment/continuation results for any new work-unit commit.
New authored forecast: under 150 documentation lines; existing application commits
are reused rather than rewritten. Delivery: single-pr vocabulary, but no PR or push
is requested. Conventional maintenance commits only, without AI attribution.
Rollback: restore named local refs to their recorded original tips; existing dirty
content remains in place or in verified local preservation copies. No source reset.

## Progress and evidence
- Mapping delegated separately for each repository before any source/ref change.
- Backend main is an ancestor of the application tip; the PRO delta is three source
  lines plus an existing 38-line regression. Its two base application trees match.
- Frontend has an occupied compiler worktree plus two unique historical runtime
  tips; preserve those histories without merging experimental tooling into main.
- C1 completed: backend main/checkout is `fa36d1eddad329ce3e429b0eb88519d2c8a2528f`,
  a Conventional merge of application `69cb9716` and PRO `d2d4dce`. Its tree is
  exactly `aa6f56f69bf5b25f0ba350d4aaca999b97c4706c` (the existing PRO tree).
  The one service conflict was resolved using existing PRO bytes, not new logic.
- Existing `recurrentWebhookRejectsUnexpectedInvoiceBeforePaymentFetch` passed:
  1 test, zero failures/errors/skips, Corretto21/offline Maven, 26.714 seconds.
  Logs and preservation proof: `/private/tmp/ordenfix-backend-consolidation.t1S4KX/`.
  Dirty V38 content, both `.atl` files and the stale worktree metadata survived.
- Backend local assessment initially required an explicit untracked inventory.
  Supported `--untracked-scope=exclude` with the exact inventory fingerprint
  selected only the committed merge: MEDIUM, 2 paths/41 lines, `under_budget`,
  `review_due=false`. No mode changes, remote review or native approval.
- C2 completed: frontend main/checkout is
  `c7d8e514f6ac6de88960c37c606893d063ac1d22`, a Conventional documentation
  commit parented by release `3f056667`. Only this 72-line tracker was added;
  application content remains identical to the tested frontend candidate.
  Local assessment: PASSIVE, `non_executable_only`, `review_due=false`.
- Frontend preservation checks retained all 643 original index entries and the
  bytes/modes of 48 original dirty/untracked paths. Two formerly untracked trackers
  now have tracked bases; the original release-tracker annotation remains dirty.
  Compiler worktree HEAD/index/status are unchanged. Twenty-three obsolete branch
  refs were removed only after verifying main/compiler/archive-tag coverage.
- C3 completed and independently inspected: backend has only main `fa36d1ed`;
  frontend has main `c7d8e514` plus the occupied, unchanged compiler branch
  `codex/compiler-global-native-context` at
  `7a762d9edf4e28dd4edc5e6032eba83bd798bfe5`. Both primary checkouts are on main.
  The temporary maintenance refs were also removed after their tips were absorbed.
- Frontend archive tags preserve the two unmerged runtime histories:
  `archive/pre-consolidation-frontend-runtime-unsplit` at
  `77b7d908a1e5718777f48983bb23a7832c13afad`, and
  `archive/pre-consolidation-frontend-runtime-review-chain` at
  `333c8b8a979ec9e03587b63a6df28e31508fbb66`.
  Twenty-three original frontend branches and ten original backend branches were
  removed, without dropping any original tip from retained-history reachability.
- The single absent backend PRO worktree registration was backed up and pruned
  only after its index matched PRO HEAD and all reflog commits were in main.
  The backend index, dirty V38 document, both `.atl` files and remote refs survived.
  Evidence: `/private/tmp/ordenfix-backend-consolidation.t1S4KX/c3/qualification.json`.
- Frontend deletion/preservation evidence:
  `/private/tmp/ordenfix-branch-consolidation-k08vc2c4/`.
  Parent verification confirmed both main checkouts, archive tips, the backend tree
  identical to PRO and the frontend delta restricted to its two tracking documents.
- Final publication of this record uses a temporary feature ref and a local
  documentation commit; remove that ref after advancing main. Its local assessment
  is separate from the already observed application/branch-cleanup outcomes.
- Not run: complete application suites, Docker, recovery cases or deployed smoke.
  These are unchanged-history Git maintenance checks, not production certification.
  No fetch, push, remote branch deletion, provider mutation or deployment occurred.
- Full Engram mirror: `odd/local-branch-consolidation/tasks`.

## Next step
The user may push the two local main branches when ready. Existing unrelated
uncommitted changes remain intact and are not included in these commits.
