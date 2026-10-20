# Enforce shared email delivery guardrails before activation

## Authorized outcome
The user approved the design and defaults: **80 attempts per UTC calendar day**
across the application and **60 seconds between attempts to a recipient**. Both
values are configurable. Keep all mail switches off; no push or deployment.
The user's later "Si intégralos" also authorizes local backend main integration
of the three reviewed commits. It does not authorize other source changes,
branch/worktree deletion, remote operations, deployment or mail activation.

## Problem and scope
The existing IP limiter is instance-local and cannot protect the shared mail
quota. Account SMTP failures are logged but have no structured delivery outcome.
Three independent SMTP paths must share admission: account verification/reset,
repair-ready notifications, and account-closure notifications.

Implementation repository: `/Volumes/DiscoExtern/Desktop/mvrg-backend`, starting
at `fa36d1eddad329ce3e429b0eb88519d2c8a2528f` on main. This tracking document lives
in `/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend`; do not change its app.
Preserve the backend's dirty V38 document and `.atl`, and all frontend staged,
unstaged and untracked work. Branch before source changes. No reset, clean,
blanket staging, automatic stash, force-push or history rewrite.

## Approved design
- Persist a shared UTC-day budget and normalized-recipient digest/cooldown in the
  existing PostgreSQL database; no new external service or credentials.
- Reserve atomically and durably before attempting SMTP. Independent instances
  and restarts must not reset the budget. Use a consistent lock order, bounded
  transaction timeouts and no SMTP I/O while database locks are held.
- Fail closed on database/reservation uncertainty. Failed or ambiguous SMTP
  attempts consume their reservation; do not refund or immediately retry them.
- Apply account admission before invalidating an existing verification/reset
  token. A budget/cooldown denial must leave its existing link usable.
- Preserve generic public recovery responses and token expiration/single-use
  semantics. The previously disclosed policy after an actual SMTP failure is not
  redesigned into multiple simultaneously valid links in this feature.
- Reset admission precedes its independent token-issuer transaction. If a caller
  transaction exists, defer notification until its confirmed commit; rollback or
  uncertain commit performs no admission, token invalidation or SMTP. The
  notifier suspends the completed callback context before beginning this flow.
- Detect outcomes using bounded internal types, sanitized logs and Micrometer
  counters. Do not label metrics with email, token, message body or credentials.
  Do not expose metrics publicly or turn optional SMTP failures into global
  readiness failures/restart loops. No remote telemetry or alert activation.
- Keep existing repair/closure retries and state machines. Local admission denial
  is pre-send/retryable, not uncertain delivery. SMTP ambiguity remains uncertain.
- Add V44 and only the schema-compatibility changes genuinely required by the
  strict V43 verifiers. Preserve their historical profiles and rejection of
  unknown shapes/versions; do not weaken them or reopen recovery case matrices.

## Task and work plan
- [x] M1 — Deliver and verify the complete shared admission/failure policy locally.
  - Status: implementation and local verification complete. The original unsplit
    candidate stopped at the native context budget. Reduced R1, R2 and R3 are
    now natively approved and acknowledged. R2 has one informational,
    non-blocking observation. This closes local implementation and verification,
    not main integration, mail activation, deployment or production readiness.
    Do not retry or claim a native approval of the original unsplit candidate.
  - Route: delegated writer, after the delegated mapping of all three send paths,
    account transactions, schema guards and existing tests (4+ files). The writer
    owns backend source/tests/docs only; the parent owns this tracker and mirror.
  - Stage A: persistent atomic budget/cooldown, validated configuration, V44 and
    narrowly scoped schema compatibility, with new focused regressions.
  - Stage B: account admission before token changes, exactly one reservation per
    physical attempt, typed SMTP outcomes and protected public responses.
  - Stage C: repair/closure integration, sanitized failure instrumentation and
    complete cross-path verification. No path may bypass the shared gate.
  - Acceptance: the 81st eligible daily attempt is denied; the same normalized
    recipient is denied before 60 seconds and allowed at the boundary; a UTC day
    rollover restores the daily budget but does not bypass recipient cooldown.
  - Acceptance: concurrent callers/instances share exactly one durable budget;
    errors or uncertain commits cause zero SMTP calls; disabled mail consumes
    nothing; a denied account send preserves its previous token.
  - Acceptance: each SMTP attempt is charged once, failures are observable without
    sensitive metadata, uncertainty/retry bounds are preserved, and no provider
    or deployment action is performed.
- [x] M2 — Prepare the smaller review chain without changing the final feature.
  - Outcome: three local candidate refs published atomically, all boundary checks
    passed and the final tree is byte-identical to the original. All three are
    now reviewed/acknowledged. M2 preparation alone did not close M1; completion
    of M1 also required the separate verification and three review closures.
  - Authorization: the user approved this preparation after the native budget
    stop. This permits new local candidate commits/refs, not source changes,
    rewriting the original commit, remote reviews or delivery operations.
  - Route: delegated read-only dependency mapping followed by one bounded Git
    writer. Mapping required 4+ files; the parent retains this tracker/mirror.
  - One honest slicing pass selected three dependent behavior/test/doc units:
    `fa36 -> schema -> transports -> auth`. The complete feature is not released
    until the chain is integrated; partial units do not claim all guarantees.
  - R1: V44 schema compatibility, 11 paths, +373/-30 (403 lines), proposed ref
    `codex/email-guardrails-schema`.
  - R2: the shared guard and ALL three SMTP paths, 22 paths, +938/-52 (990 lines),
    proposed ref `codex/email-guardrails-transports`.
  - R3: account admission before token changes, 15 paths, +459/-205 (664 lines),
    proposed ref `codex/email-guardrails-auth`.
  - Overlapping doc/test paths explain 48 per-unit entries vs 44 distinct paths.
    The PostgreSQL test's auth import/method, the operational document and one
    notifier test's required SMTP constructor/import are staged by mechanical
    hunks; all assertions and final bytes remain unchanged. No stubs, bypasses,
    code-golf or test omissions at the tip.
  - Delivery remains `ask-on-risk / feature-branch-chain`. The cohesive units
    exceed the advisory 400-line planning heuristic; no PR or PR-size approval
    is created. Do not split behavior from its tests merely to reduce line count.
  - Construct non-HEAD refs using an isolated index. Preserve the primary HEAD,
    index bytes, working tree, all existing refs and unrelated dirty files.
    The final chain tree must equal `6f3d4e14dafeee07b0b58454161b37c4faa1f0e1`.
  - Checks: compile complete source/test snapshots at every boundary; run the
    focused 1 schema, 230 transport and 93 auth tests offline. Reuse prior 359
    final-tree results only after exact tree equality, without inflating counts.
    Do not start PostgreSQL, Docker, real SMTP or historical recovery cases.
  - Native sizing was UNPROVEN at preparation. Raw patches are about 44/82/77 kB; changed full
    files are about 165/187/164 kB. Neither is a complete lens/envelope measure.
    Installed CLI code confirms consent relay returns before its budget probe;
    no supported public pre-authority probe was found. R1 later passed admission
    and completed review. R2 and R3 later passed admission and completed their
    own reviews as recorded below; no budget limits were changed.
  - Prepare local assessment/consent relay for the first new candidate only.
    Successor review boundaries remain prospective until their predecessors
    are acknowledged. Never replay the old grant or advance review authority.
  - Progress: R1 snapshot compiled and passed its 1 focused test. The first R2
    compilation ran zero tests because an existing notifier test still used the
    legacy SMTP constructor. Advancing only its exact final import/constructor
    to R2 fixed composition; the fresh R2 snapshot passed 230 focused tests.
    This transferred 3 authored lines between R2/R3 without changing the total
    2,057 lines or any assertion. The fresh R3 snapshot then passed 93 tests;
    all three refs were published only after the boundary checks passed.
  - Work-unit evidence:

    | Unit | Commit | Parent | Authored lines | Focused tests |
    | --- | --- | --- | ---: | ---: |
    | R1 schema | `418b3b8b36d8ce308385e9bc20abf66daf3af110` | `fa36d1e` | 403 | 1 |
    | R2 transports | `bb29cf3eacb8d46af4fd62e962295e5eb1b516ee` | `418b3b8b` | 990 | 230 |
    | R3 auth | `bd2c0d8d3c122b36e2d80e3aa6bdbd902a5caa52` | `bb29cf3e` | 664 | 93 |

  - All three source/test snapshots compiled: R1 615/490 files, R2 617/496,
    R3 620/497. The 324 focused identities passed with zero failures/errors/skips;
    these repeat existing coverage. The prior 359 final-tree identities remain
    applicable only because R3 tree equals the original `6f3d4e14...` exactly.
  - Qualification, commands, report hashes and preservation evidence:
    `/private/tmp/ordenfix-mail-review-chain.hUkFK3/qualification-01.json`,
    SHA-256 `d0910c40ad9048170763f0ae41fca9e1d82d72cb5c208774f4f23d1509789d34`.
    Primary HEAD/main/index bytes, V38, `.atl` and all previous refs are unchanged.
  - One owned clean detached backend checkout is retained for R1 at
    `/private/tmp/ordenfix-mail-review-chain.hUkFK3/r1-review`. Do not confuse it
    with the unrelated frontend compiler worktree; keep it until review finishes.
  - Parent observed R1 local assessment: MEDIUM, 11 paths/403 lines,
    `review_due=true`, `slice_budget_reached`. Exact STATUS and consent relay
    returned `consent_required`, not an authority or context-budget pass.
    The boundary was initially `fa36...`; R2/R3 could not be treated as passive
    or inherit approval. The R1 acknowledgment recorded below advances it to R1.
  - R1 frozen target:
    `sha256:d7b095fb6c0ad09ef6a7628e56e74ae2ce4095145446bf4cdf9de05a9eabe1b9`,
    lineage `review-3cd6729e6a5962cc`. Exact new candidate-bound consent commands
    are saved in `/private/tmp/ordenfix-mail-review-chain.hUkFK3/native-r1-preflight.json`.
    At that preflight no grant was inferred and no remote review ran; the later
    explicit grant and native result are recorded below.
  - The user's subsequent "Si dale autorizo" explicitly grants review of ONLY
    R1 418b3b8b in Codex/OpenAI using the current session. Fresh readback confirms
    R1 clean, primary HEAD/main/index unchanged and global RDD ON. This does not
    authorize source corrections, successor reviews, integration or deployment.
  - Exact R1 START succeeded: `action=created`, `state=reviewing`, MEDIUM,
    `review-reliability` lens. Its initial context preflight passed, not the
    complete review. An authority now exists for `review-3cd6729e6a5962cc`;
    resume it using the opaque repository context from START, never as a fresh
    candidate or with the old unsplit lineage.
  - Authoritative START and first STATUS are saved as
    `/private/tmp/ordenfix-mail-review-chain.hUkFK3/native-r1-start.stdout.json`
    and `native-r1-status-01.stdout.json`. The first STATUS required the reviewer result
    for order 0 / subject
    `sha256:1a927f9752cf026ebb922ebcf202cae12c86b520c90a6671462ef55defa9a3e7`.
    A bounded operator is collecting only that fresh native Codex actor result;
    the source writer must not act as the semantic reviewer. No source edits,
    ref changes, production operations or ad-hoc review substitutions are allowed.
  - R1 native collection completed `approved`, findings `[]`, exit 0. The
    compiled wrapper internally corrected one first response with a mismatched
    subject; its rejected bytes are retained. The operator invoked capture once
    and authored no findings. This was transport/binding recovery, not a source
    correction or repeated functional test.
  - Before consuming the approval, the full native authority and complete
    admitted result were preserved in `native-r1-authority-observed-01.json`
    and `native-r1-admitted-artifact-01.json` under the preparation directory.
    The compiled adapter discards successful raw CLI bytes; the full admitted
    export is not misrepresented as those raw bytes. Binding/export proof is
    `native-r1-artifact-preservation-01.json`.
  - Parent executed the exact returned `acknowledge-approved` command. Terminal
    `native-r1-ack.stdout.json` reports `acknowledged`, `authority=burned`,
    consumed revision
    `sha256:2e738ff7d9d7e3393ba06320e2d6cb9af6bcc5af1853982584fe451112457989`.
    Do not replay ACK or require a post-burn STATUS. The acknowledged boundary
    advances to R1 `418b3b8b...`, not main or either successor candidate.
  - R1 result hash:
    `sha256:851e595211494283a7190e8acf4b96625c1f19fbfedca45b4b2ac13eeccff2ce`.
    The reviewer inspected supplied patches only; it ran no tests/commands and
    did not independently verify the migration checksum. Existing functional
    proof remains separate. No code changes or new runtime coverage are claimed.
  - R2 local checkout is now prepared and clean at
    `/private/tmp/ordenfix-mail-review-chain.hUkFK3/r2-review`, HEAD `bb29cf3e...`.
    Primary/R1 state, indices, refs and source pins remain unchanged. The first
    auxiliary checkout guard stopped before mutation because it resolved a
    relative Git-index path against the process cwd, not its repository; only
    that temporary checker was corrected. Actual worktree creation ran once.
    Proof: `r2-checkout-qualification-01.json` in the preparation directory.
  - R2 local assessment: MEDIUM, 22 paths/990 lines,
    `review_due=true`, `slice_budget_reached`, against acknowledged R1 `418...`.
    Exact STATUS/consent relay returned `consent_required`. At that preflight R2
    had no native authority, review or context-budget pass; the R1 grant was not
    transferred.
    Target `sha256:d5eaeab38a4c91b09e30b054324035acd374fe6ed5a5bdfa6d405359e9abcfce`,
    lineage `review-b20747f5dfccb10d`. All candidate-bound commands are saved in
    `/private/tmp/ordenfix-mail-review-chain.hUkFK3/native-r2-preflight.json`.
  - The user's subsequent "Si dale" grants review of ONLY R2 bb29cf3e in
    Codex/OpenAI using the current session. Fresh checks confirm R2 clean,
    primary HEAD/main/index unchanged, R1 already acknowledged and RDD ON.
    This grants native review, not source corrections, R3 review or delivery.
  - Exact R2 START succeeded: `action=created`, `state=reviewing`, MEDIUM,
    `review-reliability` lens. Initial context admission passed; final approval
    was still pending at that stage. Authority `review-b20747f5dfccb10d` existed. START and
    its exact next STATUS are saved in `native-r2-start.stdout.json` and
    `native-r2-status-01.stdout.json` under the preparation directory.
  - That STATUS required the native reviewer result for order 0 / subject
    `sha256:520ba9ed0944d11b5e3aced94eb188a1f4298f2dfdd5dd1c53fe9c2d2d1f4fce`.
    A bounded operator is collecting only that fresh native Codex actor result.
    Capture must use the initial revision/context in the exact collect tokens,
    not the top-level latest revision. The operator must not semantically review
    its own implementation, change source or consume ACK. Parent owns lifecycle
    closure after preserving the full admitted artifact.
  - R2 native collection completed once, exit 0 / `approved`; no rejected
    attempts or source corrections. The native actor inspected all 22 supplied
    immutable patches and ran no commands/tests. Its one `WARNING`,
    `R3-recipient-canonicalization`, is informational and does not open a
    correction or invalidate the receipt. The identifier does not mean the R3
    candidate was reviewed.
  - The observation is inferential: hashing the complete recipient string may
    yield distinct cooldown keys for a bare mailbox and accepted display-name
    syntax targeting that mailbox. Runtime reachability was not established.
    Keep this explicit as separate, unaccepted follow-up work; do not silently
    fix source, reopen R2 or represent the review as finding-free.
  - Full native authority and admitted role results were preserved before ACK
    in `native-r2-authority-observed-01.json` and
    `native-r2-admitted-artifacts-01.json`; proof is
    `native-r2-artifact-preservation-01.json`. As for R1, admitted exports are
    not misrepresented as the successful raw CLI bytes discarded by the adapter.
  - Parent independently verified hashes, byte-exact authority and full admitted
    object equality, then executed the exact returned ACK once. Terminal
    `native-r2-ack.stdout.json` reports `acknowledged`, `authority=burned`,
    consumed revision
    `sha256:4446d91a66f5abe66e973291079e7b8c1ec62625d9a92aac5f47dfe73f3a7d9d`.
    The reviewed boundary advances to R2 `bb29cf3e...`; do not replay ACK or
    require post-burn STATUS. No main integration or R3 approval is implied.
  - R2 result hash:
    `sha256:f4ad13ca375f86432379374eeec48c04aa987e64338212af904bdc6e11866f3e`.
    Primary HEAD/main/index, all source pins and clean review checkouts remained
    unchanged. Mail stays disabled; no functional tests or services were run.
  - R3 local checkout is now prepared and clean at
    `/private/tmp/ordenfix-mail-review-chain.hUkFK3/r3-review`, detached HEAD
    `bd2c0d8d3c122b36e2d80e3aa6bdbd902a5caa52`, parent R2 `bb29cf3e...`.
    Its tree remains exactly the original final tree `6f3d4e14...`. Worktree
    creation ran once without failure. Qualification/preservation proof is
    `r3-checkout-qualification-01.json`, SHA-256
    `a2b5cdf20a7254ecb4b8c645f07312dca36750ac1a45f9de337da2b9fdb3fc5e`.
  - R3 local assessment: MEDIUM, 15 paths/664 lines,
    `review_due=true`, `slice_budget_reached`, against acknowledged R2. Global
    RDD remained ON. Exact STATUS and consent relay returned `consent_required`;
    at that preflight no R3 authority or remote review existed and complete
    context fit was unproven. Neither predecessor's consent or approval transferred.
  - R3 frozen target:
    `sha256:3f47fb38909b3cfdeced43a8801f434794683c4445cfda6bf1029eaaaed33261`,
    lineage `review-d20e93402c7b474a`. Exact candidate-bound commands are saved in
    `/private/tmp/ordenfix-mail-review-chain.hUkFK3/native-r3-preflight.json`,
    SHA-256 `6f79820d95d84d4a55a9bafa3de0c4bfae2187bc083a2a9579dd1e7afc50224d`.
    No tests, services, credentials, source changes or delivery actions were
    needed for that local preflight. Fresh human remote-review consent was pending.
  - The user's subsequent "Si dale hacelo" grants review of ONLY R3 `bd2c0d8d`
    in Codex/OpenAI using the current session. Fresh readback confirms R3 clean,
    exact HEAD/parent/tree pins, primary HEAD/main/index unchanged, both previous
    reviews acknowledged and global RDD ON. This is review authorization, not
    source corrections, R2 follow-up implementation, integration or deployment.
  - Exact R3 START succeeded: `action=created`, `state=reviewing`, MEDIUM,
    `review-reliability` lens. Initial context admission passed, not final review
    approval. Authority `review-d20e93402c7b474a` was created. START and its exact
    next STATUS are saved as `native-r3-start.stdout.json` and
    `native-r3-status-01.stdout.json` under the preparation directory.
  - That STATUS required the native reviewer result for order 0 / subject
    `sha256:b8138f765ceebb1deb346c4ef7cfe45538edf0563b015bc1c353c270a1740d84`.
    Capture uses the initial revision and opaque context in its exact collect
    tokens, not a later top-level revision. A bounded operator collects a fresh
    native Codex actor result and must not semantically review its own source.
    Parent retains lifecycle and ACK after preserving the admitted artifact.
  - R3 native collection completed once, exit 0 / `approved`, findings `[]`.
    No rejected attempts, internal corrections or source changes occurred. The
    actor inspected all 15 supplied immutable patches, with no commands, external
    file inspection or test execution. Existing functional results are separate
    evidence; no new coverage or proof of unchanged details is claimed.
  - Before ACK, complete admitted role results and byte-exact native authority
    were preserved in `native-r3-admitted-artifacts-01.json` and
    `native-r3-authority-observed-01.json`. Preservation proof is
    `native-r3-artifact-preservation-01.json`, SHA-256
    `098e60a2641069b92b3b027e7dd2ac1dddb563ec1415462e0c2da930ae4733c5`.
    The export is not the successful raw CLI bytes discarded by the adapter.
  - Parent independently verified saved hashes, canonical authority byte
    equality and complete admitted object equality, then executed the exact
    returned ACK once. Terminal `native-r3-ack.stdout.json` reports
    `acknowledged`, `authority=burned`, consumed revision
    `sha256:b561e28bebd2caa5ac6155c9104fdeec1a3fb64fad384c58beed57517fe153bd`.
    All three reviews are now terminal. Do not replay START/ACK or run a
    post-burn STATUS. Reviewed boundary is R3 `bd2c0d8d...`, not main.
  - R3 result hash:
    `sha256:0cf290c04c35702d223d53961aa66f7c88936f44dbb40885202890c4759dfc0e`.
    Final tree equality preserves the prior functional evidence. Primary
    HEAD/main/index, all source pins and all review checkouts remained intact.
    No tests, services, SMTP, push, deployment or mail activation ran that turn.
- [x] M3 — Integrate the exact reviewed chain into backend main locally.
  - Authorization: "Si intégralos" answers the explicit backend-main integration
    question, retaining no push, deployment or mail activation. Preserve the
    original feature ref, existing review checkouts/evidence and unrelated work.
  - Route: one bounded delegated Git writer. Preparation and preservation cover
    44 source pins, four backend checkouts and the frontend's dirty/index state;
    the parent retains this task document, Engram mirror and scope decisions.
  - Integrate `fa36d1eddad329ce3e429b0eb88519d2c8a2528f` to reviewed R3 tip
    `bd2c0d8d3c122b36e2d80e3aa6bdbd902a5caa52` by fast-forward only. Inspect
    configured local hooks before invoking Git mutations; do not bypass them
    or allow remote/deployment side effects. Use ordinary `git switch main`
    and `git merge --ff-only` when the confirmed dirty paths do not overlap.
    Stop on divergence, conflicting local work or unexpected hooks; no reset,
    stash, automatic conflict resolution, rebase or source edits.
  - Acceptance: backend primary checkout is on main at the exact reviewed tip;
    its full tree equals original tested `6f3d4e14...`. All three reviewed
    commits are ancestors, with no new source or synthetic merge commit.
    Preserve all other refs, unrelated staged/unstaged/untracked content and
    frontend application/index state. No branch or checkout deletion.
  - Checks: exact parents/trees and three terminal native ACK artifacts; clean
    reviewed checkouts; main ancestry; all 44 tested source pins; pre/post dirty
    manifests, staged deltas and frontend refs/index/status; Git whitespace
    check of the integrated range. Snapshot evidence before mutations.
  - TDD remains ON for behavior changes, but no behavior/test changes are in
    this task. Reuse the existing functional evidence only after exact final
    tree/source equality; do not repeat tests, start services or claim new
    runtime coverage. Fast-forward reuses the three work-unit commits and
    native approvals; no new commit means no new candidate or review ceremony.
    Authored source delta beyond the reviewed chain: zero.
  - Outcome: `git switch main` and
    `git merge --ff-only codex/email-guardrails-auth` both returned exit 0.
    Backend primary checkout is now on main, HEAD
    `bd2c0d8d3c122b36e2d80e3aa6bdbd902a5caa52`; full tree remains
    `6f3d4e14dafeee07b0b58454161b37c4faa1f0e1`. All three reviewed work-unit
    commits are ancestors. Only the intended main ref changed; no new commit
    was created, and original feature `484e59b3` and all other refs remain.
  - Before/after verification passed: all 44 tested source Git/working-tree
    pins, full tree equality, staged delta and stage-0 entries/index flags,
    dirty content/deltas, frontend HEAD/main/refs/raw index/status/content and
    all three clean review checkouts. Git whitespace check returned exit 0.
    No configured hooks or relevant override/filter hazards were found; no
    hooks, policies or gates were disabled. Parent independently verified live
    main/HEAD/tree, ancestry, original feature ref, staged delta and index pin.
  - The primary raw index changed legitimately during switch/fast-forward:
    `299f8813...` to
    `5c70f277f1508c1b3cb1acca819fdc334860379b4becde8935963fd06590a3b1`,
    both 227,183 bytes. Its entries/flags and staged/unstaged deltas are exact.
    Do not misrepresent it as byte-unchanged. Pre-existing V38 and `.atl` work
    remains uncommitted and intact; main is not claimed completely clean.
  - Evidence:
    `/private/tmp/ordenfix-mail-review-chain.hUkFK3/integration-01/qualification.json`,
    59,414 bytes, SHA-256
    `341b073c13abde44d65b43b0153fdf3ba1f1d934b27ba2c3c445fa59b422eddc`.
    Both Git mutations and all integration checks passed. The parent's initial
    combined-output comparison added an extra newline; an exact standalone
    task read proved the mirror already matched before any mutation.
  - No new tests or native review were run: the exact reviewed commits were
    integrated without new code. Prior 359 unique functional results remain
    separate applicable evidence, not new coverage. No services, real SMTP,
    remote operations, push, deployment, branch cleanup or mail activation.

## Tests and verification
TDD **ON**, retained from `odd/tasks/charge-session-expiry.md:15`: observe RED for
new behavior, then GREEN and refactor without weakening existing assertions.
Runner: installed Maven Surefire/Failsafe and Corretto21, offline dependencies,
empty Maven settings and isolated HOME/TMPDIR. Do not import private `.env` files.
Use SMTP mocks only. New database tests must cover concurrency, independent
instances/restarts, UTC rollover, normalized recipients, database failure and
transaction completion before SMTP. Run compatible existing account/notification
tests and compile the whole backend. Record the actual commands and outcomes.
If cached local PostgreSQL is available, run only bounded isolated guardrail
checks, never Railway or the historical recovery cases. Do not download images or
reuse an unrelated application's database. If unavailable, state the limitation.
Frontend functional checks are N/A: no frontend app behavior changes are planned.

## Delivery, review and rollback
One end-to-end work unit keeps the global invariant and its three adapters
coherent; its internal stages are not independent release claims. Forecast:
1,300–2,200 authored lines including new tests. This is an estimate, not a reason
to omit tests, compress code or manufacture sub-400-line units. A future PR must
follow the retained `ask-on-risk / feature-branch-chain` strategy documented in
`odd/tasks/production-release.md:218`; no PR or remote operation is authorized now.
Commit coherent source/tests/docs on `codex/email-delivery-guardrails`, using a
Conventional Commit without AI attribution. Preserve main until integration is
explicitly authorized. Record the exact work-unit commit and test evidence here.
Native RDD is ON from the global switch. Assess the committed work unit against
the branch point with committed-only selectors and follow its local STATUS
continuation. Never change the mode or infer candidate consent. A required remote
review remains pending until specifically authorized; never fabricate approval.
Rollback: revert only this feature's source/config/compatibility unit; do not
remove existing application work. V44 is additive; never drop its tables from a
real database without separate authorization. No real database is migrated here.

## Progress
- Design and exact defaults approved by the user; brainstorming gate satisfied.
- Read-only mapping found all three adapters and the V43 schema coupling.
- Implementation used the feature branch while main stayed at the branch point;
  the later authorized M3 integration now leaves the primary checkout on main.
- RED observed against an isolated baseline snapshot: 2 tests, 2 failures,
  0 errors/skips. The SMTP regression expected 80 calls but observed 81; the
  migration contract rejected the absent V44 resource. Evidence:
  `/private/tmp/ordenfix-email-guardrails.soP1uS/logs/red-snapshot.log`.
- An earlier Maven invocation failed on sandbox writes to the existing backend
  target directory and ran zero tests; it is an environment failure, not RED.
- Approved mechanical test-fixture updates follow the mandatory one-use permit
  API, preserving recipients, content and call counts. The ordinary migration
  test may update its latest-version expectation from 43 to 44; historical
  recovery profiles, proof pins, cases and limits remain unchanged.
- Reset scheduling tests may reflect the independent issuer transaction while
  retaining zero SMTP on caller/issuer rollback or uncertain commit, immutable
  captured presentation data, generic responses and sanitized diagnostics.
- A synthetic PostgreSQL 16.15 cluster is ready at loopback only, with SCRAM,
  durable commits and isolated credentials. Its contract is local-only under
  `/private/tmp/ordenfix-mail-guardrails-pg.bdbbne0m`; a second owned database in
  the same cluster isolates schema tests. The owner will stop only that cluster.
- GREEN observed so far: 324 focused account/SMTP/repair/closure/configuration
  tests, 10 real PostgreSQL admission/concurrency tests and 25 V44 compatibility
  cases. XML comparison found 359 unique identities across 20 classes, with
  zero failures/errors/skips and no overlap. The complete source/test tree
  compiled in an isolated snapshot. Final reconciliation confirmed all 44 owned
  files match the tested snapshot. The final 324-test repetition passed again;
  it is not additional coverage. Compilation included 620 main and 497 test files.
- The first PostgreSQL invocation failed before behavior evaluation: sandbox
  loopback denial produced 10 setup errors. The identical scoped local runner
  subsequently passed with the required runtime permission; no assertions were
  weakened. Existing Testcontainers migration/recovery suites were not run.
- Verification logs and report identity inventory are under
  `/private/tmp/ordenfix-email-guardrails.soP1uS`; the inventory is
  `observed-reports-final-01.json`. Commands and scoped verification evidence are
  in `precommit-qualification-01.json` and `run-final-unit.sh` there.
- A third regression observed the prior second token invalidation despite local
  denial: 1 test/1 failure in `logs/red-account.log`, now GREEN. Ordinary
  `PostgresMigrationIT` changed only its two latest/list expectations to V44;
  its complete Testcontainers class was not run. A separate exact expectation
  probe observed 43 failing against 44, then 44 passing; this is not full IT proof.
- Work-unit commit: `484e59b36b8685812ab170efab2415a8230584ee` on
  `codex/email-delivery-guardrails`; tree
  `6f3d4e14dafeee07b0b58454161b37c4faa1f0e1`. Exactly 44 paths,
  +1,770/-287 authored lines (2,057 total), within the forecast. This is the
  cohesive policy unit; no PR or independent sub-400-line delivery is claimed.
- At the original implementation closure, backend main remained
  `fa36d1eddad329ce3e429b0eb88519d2c8a2528f`; M3 records its later fast-forward.
  The pre-existing V38 document, `.atl`, other refs and unrelated staging were
  preserved. Frontend application/main/index were not changed by implementation;
  this recovery document remains local and mirrored.
- PostgreSQL cleanup passed: exit 0, owned PID and `postmaster.pid` absent,
  `pg_ctl status` exit 3. Evidence:
  `/private/tmp/ordenfix-mail-guardrails-pg.bdbbne0m/cleanup-proof.json`.
- Final local native assessment: MEDIUM, `review_due=true`,
  `slice_budget_reached` for the exact committed-only 2,057-line unit. STATUS
  selected only the committed 44 paths and explicitly excluded pre-existing
  `.atl`. The consent relay returned `consent_required`; no remote review or
  approval receipt exists. Global RDD remains ON. Initial CLI argument,
  inventory and sandbox preflight errors were resolved without weakening policy.
- Frozen native target:
  `sha256:f25e300f0035262a780dad7ef7a89c159abe0c61fbfe7fd58584f959dfdbc59a`,
  lineage `review-459fe6aeb258794f`. Full local assessment, STATUS and exact
  candidate-bound consent commands are in
  `/private/tmp/ordenfix-email-guardrails.soP1uS/native-review-preflight.json`.
- No mail activation, real SMTP, provider operation, push, merge or deployment.
  Historical recovery profiles remain unaccredited for V44, not silently updated.
- Full Engram mirror: `odd/email-delivery-guardrails/tasks`.
- The user's subsequent "Si dale! Vamos" explicitly grants the candidate-scoped
  review requested above. HEAD, main, prior dirty files and the global ON mode
  were rechecked unchanged before execution. Source corrections, main integration,
  email activation, push and deployment are not included in that review grant.
- The exact granted START returned `lens_context_budget_exceeded` in preflight
  (exit 1, `mutation_outcome=not_started`, `authority_applicability=not_evaluated`,
  `next_action=stop`). No reviewer lens context or native authority was produced;
  this is not a code finding, failed functional test, or review approval.
- Native guidance says the same immutable candidate cannot fit on retry. It
  requires smaller chained candidates without truncating evidence or bypassing
  the context budget. No retry, history rewrite, splitting or new review grant
  was inferred. There is no authority to abandon or repair.
- The observed result copy is
  `/private/tmp/ordenfix-email-guardrails.soP1uS/native-review-start-result.json`.
  Post-command readback confirms all 44 source/test/doc hashes unchanged, the
  feature/main refs unchanged, and only the pre-existing backend dirty files.

## Next step
Local integration is complete: backend main and primary HEAD are `bd2c0d8d`,
with the exact reviewed/tested final tree. No further Git mutation is needed for
this request. Push, deployment and a real provider smoke test remain future
actions, not performed or authorized here. Preserve unrelated work, all other
refs and review checkouts; keep mail off. Do not replay the original unsplit
review or any of the three terminal review operations.
R2's informational observation remains separate and does not authorize source
changes. No source correction, push, deployment or mail
activation is authorized. Never replay old 484 or any burned ACK.
