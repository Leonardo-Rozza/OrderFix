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
- [ ] C1 — Integrate the backend application and existing recurrent-payment fix.
  - Route: delegated writer; two non-trivial existing source/test files and
    divergent histories require bounded integration rather than an inline edit.
  - Start: main `391dd6330afdc2679afad1a93fbe066b1bc98e72`, application
    `69cb9716b64872d6959d90b4f6a7cbeea2d5a8c6`.
  - Include `d2d4dce524bca58b9e2e9039a7330e0400c05108`: reject a mismatched
    authorized-payment resource before fetching a payment or applying entitlement.
  - Acceptance: preserve both histories; final application tree equals the existing
    PRO tip; run the unchanged focused regression offline; retain the dirty V38
    document, untracked files and any unique worktree metadata.
- [ ] C2 — Integrate the frontend application and release-tracking history.
  - Route: delegated Git writer after delegated multi-branch mapping; preserve the
    populated index and dirty files while changing refs/checkouts.
  - Start: application `7f615b73c963ffa31188232a7f3b709b9c00f0f0` and release
    tracker `3f0566675e3b3b71a81084c485cc6b0e16a11a30`.
  - Acceptance: main contains both histories and this maintenance record; application
    sources/tests/configuration stay identical to the tested application candidate.
- [ ] C3 — Delete redundant local branches and verify both repositories.
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
- Implementation and Git verification are pending. Full Engram mirror:
  `odd/local-branch-consolidation/tasks`.

## Next step
Perform isolated backend integration and frontend consolidation, then remove only
verified redundant refs. Stop for a real content conflict or preservation failure.
