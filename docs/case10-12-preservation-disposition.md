# Cases 10–12: failed preservation disposition

## Decision

This record closes the documentary investigation only (P5-G1). Physical preservation remains FAILED.
It does not close P5-C0, P5-C10, P5-C11 or P5-C12, restore custody, or grant execution or review authority.
No original test, assertion, limit, contract payload, prior proof or frozen commit is changed.

## Original expectation versus observation

| Archive-post scope | Available exact pins | Missing identities | Physical comparison |
|---|---:|---:|---|
| Original frozen expectation | 8839 | 5601 | Required expectation, unchanged |
| Observed after the global commit | 8834 | 5606 | FAILED |

Both rows concern the same 14440-pin archive. The observed row is NOT a replacement passing baseline.
Original expected missing-path digest:
`16411500f18096df945cb61d72a6f376b80696fcf8b1bd8cfed8e30a76a2639e`.
Observed missing-path digest:
`4973614208ec05b01df988df339083a9298fe9eb2f602f92aa2fc1b0464d4423`.
Digests use sorted missing paths joined by LF, without a final LF. Removing exactly the five new paths reproduces the original set/digest.

## Five additional physical losses

Each missing path is relative to the repository root. Its old full physical pin remains in the audit.
The logical value and packed value agree; this does not recreate the old inode, timestamps or loose-file identity.

| Missing physical path | Exact logical and packed commit value |
|---|---|
| `.git/refs/heads/codex/v41-rank-launcher-integrated` | `7f615b73c963ffa31188232a7f3b709b9c00f0f0` |
| `.git/refs/heads/codex/v41-rank-registry-review` | `38ec32b6f8686ede35faa13f61c4ccaa7534af54` |
| `.git/refs/heads/codex/v41-rank-runtime-review-chain` | `333c8b8a979ec9e03587b63a6df28e31508fbb66` |
| `.git/refs/heads/codex/v41-rank-runtime-unsplit` | `77b7d908a1e5718777f48983bb23a7832c13afad` |
| `.git/refs/heads/codex/v41-registry-completion-fix` | `65c9cac07a2899c50bf39c94a7509b2a6766673e` |

`packed-refs` is evidence of the current representation, not proof of the packing actor or cause.
Automatic Git maintenance is a hypothesis only. No lost loose ref is restored and no pin is rewritten.

## Additional packed-refs metadata mismatch

The immutable Q0/Q12 expected packed-refs pin is 2110 bytes, SHA256 d6143e93b734e54062fa299b773f79988502e221128e7e5e67e21e7bf2518f41, inode4524050.
The later observed representation is 1790 bytes, SHA256 b904cf5e39ae01e32fb87f5c29713e7f1f26d707d285149ef3cea192316847ae, inode4524357.
`packedRefsHistoricalPinMatches=false`: the original expected pin remains unchanged and the observed pin is evidence only, NOT an accepted baseline.
All HEAD refs still equal the recorded Q12 values. Old raw packed bytes are unavailable; the exact removed nonHEAD entries and actor remain UNKNOWN.
The minus320-byte delta does not justify inventing removed entries or attributing a cause.
Initial G1 attempt6778a3 stopped on this fullpin mismatch before any document, DATA package or ref write.
Read-only diagnostics853f53/088783 recorded the mismatch; this documentary continuation carries the failure instead of making it disappear.

## Separate facts, separate results

- Logical reference values remain exact; the original main HEAD and both actual indices remain frozen.
- The four contract commits, changed-file bytes, full-index diffs and existing durable source/control pins are exact.
- The independent compiler inventory contains 3005 pins: 2954 available exact pins and 51 expected missing private pins.
- That inventory is a different union: never add its 51 missing pins to the archive count.
- All 108 durable classes retain their full pins and Java 21 headers; 108 private class identities remain absent.
- All 51 durable materialized source/metadata pins are exact; their 51 private counterparts remain absent.
- All 27 closed inventories, 24 durable empty runtime directories and old/new execution absences remain unchanged.
- All 80 consumed case9 runtime identities remain missing. Case9 is not replayed.
- These content and logical-reference facts do not make physical preservation pass.

## Frozen contract lineage

| Unit | Immutable commit |
|---|---|
| Global | `941f05cc08fa9eb9870331c96b5a4dd903ee4359` |
| Row10 | `c0048e04d4ff00fc79aa11adf0c3d5ee686fa779` |
| Row11 | `2e53a63aa3f5825bfeb1ba682810f07417442047` |
| Row12 | `48a8323f2cebb8cbeebccefc0162cc97eebd8cc5` |

No commit/ref above is amended, rebased, replaced or activated by this disposition.
The current managed worktree remains on the global commit; row commits and this document remain NONHEAD.

## Historical global scope and native-context limitation

The 5601 statement in global941 `review-context/compiler-contracts/global/SCOPE.md` describes the pre-loss historical state.
It must not be presented as proof that only 5601 identities are currently missing.
This new document is NOT automatically supplied context for a native changed-patch review of941.
The row notes already carry explicit 5601-historical/5606-observed addenda; all existing notes remain immutable.
Future candidate composition and all four native execution-contract reviews remain pending.
No prior receipt is reopened or extended, and no hash or documentary statement substitutes for actual review.
The original 2090450-byte compiler JSON is not natively approved; the native context cap stays 204800 bytes.

## Authoritative disposition flags

- `documentaryClosureRecorded=true` applies only to this record, subject to independent parent verification.
- `logicalReferencesExact=true` and exact content/readback facts are separate, limited observations.
- `preservationPassed=false`, `snapshotPreparationQualified=false` and `allChecksPassed=false` remain explicit.
- Physical custody, runtime admission, P6, launch readiness, future execution and production authority remain false/BLOCKED.
- Original-JSON native approval and execution-contract native approval remain false.
- No waiver, restored identity, baseline acceptance, new guard behavior or new execution authority is created.

## Immutable audit and checks

Audit path: `release-validation.local/rank12-preservation-disposition-t13ft_1a/preservation-audit-01.json`.
Audit bytes: 10818307.
Audit SHA256: `4422bea533f25c2a8f0f8764c2c0f6e8d3c41bbf8eb102cbc8446fe51fd141c9`.
The audit carries full current available pins, historical missing pins, exact five-path delta, packed values and all four commit/diff bindings.
TDD remains ON from `odd/tasks/charge-session-expiry.md:15`; RED/GREEN is N/A for DATA/documentation with no application behavior change.
Static checks use the fixed Python 3.10 runner with `-B -S`, 65536-byte reads and unchanged 120-second run/150-second total bounds.
Fresh fullpin hashing, strict JSON readback, class headers, inventories, missing-path digests and Git blob/commit/index checks are required.
Existing tests were neither edited nor run. Caller imports, compilation, pure metadata execution, JVM, Docker and SQL were not run.
No provider, remote, credential, Railway, Vercel, native CLI, new worktree or setup operation is performed.
Historical unit2 whitespace remains FAIL2; the document has its own whitespace result in the delivery proof.
Native assessment for this NONHEAD candidate is UNAVAILABLE/PENDING until proper activation; the wrong current HEAD must not be assessed.

## Next boundary and rollback

Only P5-G1 may close after independent verification; all affected contract qualification tasks stay unchecked.
Before any review activation, separately resolve the exact reviewer candidate/context and obtain required authorization.
Rollback removes only this unused new document/ref/DATA package after preserving evidence, never original or consumed records.
