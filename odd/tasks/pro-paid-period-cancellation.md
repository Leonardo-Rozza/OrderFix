# Cancel PRO renewal without losing paid access

## Objective and accepted decision
Cancel future renewal while retaining PRO until the existing paid month expires. The user explicitly selected the actual approval date on 2026-10-05: approval on October 8 means expiry on November 8, even if the debit was scheduled for October 5. Use a calendar month from the verified approval instant in UTC, not 30 fixed days or the scheduled debit.

## Scope and authorization
- Local implementation, synthetic tests and coherent work-unit commits only. No payment/provider/email activation, real charges, remote credentials/sessions, Railway/Vercel access, deploy, push, PR, merge or new native sharing grant.
- Actual approved payment evidence is distinct from provider authorization, invoice processing and debit scheduling. Never infer paid access from `authorized`, `processed`, `next_payment_date`, `debit_date`, creation/modification/receipt time, or missing-date fallback.
- Cancel renewal only after a confirmed provider result, keep the verified paid expiry unchanged, and enforce expiry on backend reads/access/limits rather than waiting for cron. Preserve trial and closed-workshop behavior.
- Bind payment evidence and cancellation to the captured current provider link. Freeze the first accepted approval anchor per payment; duplicate/out-of-order notifications or updated snapshots must not add months or restore canceled renewal. No invented legacy backfill.
- New paid terms require actual `approved` payment, correct binding/money/collector, explicit zero refund and a valid approval timestamp. Existing charged-back/reimbursed entitlement handling does not prove a new paid term; broad refund-policy redesign remains separate.
- Frontend capabilities remain server-authoritative. Display confirmed cancellation and server expiry; uncertainty must not promise stopped charges. Do not remove PRO caches until the server actually revokes capabilities.
- Historical V1–V42 migrations and frozen schema profiles stay immutable. V43 requires measured admission, registration, legal/photo/closure/erasure and recovery compatibility; never weaken existing gates or reopen a closed workshop.
- Preserve both `.atl/` inventories and unrelated dirty frontend email trackers/backend `odd/tasks/v38-deploy-fixes.md`. Parent owns this tracker, its full mirror, exact transfers, Git and native disposition.

## Baselines and policy
| Control | Value |
| --- | --- |
| Frontend baseline | `6add19efb4eb96745cf708bed0de1cce37347c19`, branch `codex/account-email-links` |
| Frontend reviewed boundary | `afd67c0243e72cb880c19a4f8b9527d601f6b8aa`; `6add19e` is a 199-line medium pending slice, not approved |
| Backend baseline/reviewed boundary | `3956ac2d989eedc7644aa7190bde585537b7ce01`, branch `codex/account-email-links` |
| TDD | ON, explicit prior choice at `odd/tasks/charge-session-expiry.md:15`; compilable assertion RED before production edits, GREEN, cleanup. Setup/compilation failures are not RED |
| Backend runner | Installed Java 21.0.10; `/Users/leonardorozza/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn`, offline, synthetic user/global settings and public-only owned snapshot. No bootstrap/downloads |
| Frontend runner | Installed Node 24.14.0/Vitest 3.2.6, safe public-only snapshot, `envDir: false`, owned caches/physical package-linked dependency folders |
| Native RDD | ON/global, freshly verified; assess each committed unit against the last reviewed boundary. New due candidates require their own consent; no old grant inherited |
| Delivery | Cached `ask-on-risk` / `feature-branch-chain`; no PR materialized. Four coherent units, forecast 1,800–3,500 authored lines including tests/docs; about 400 is advisory, never a code/test/readability cap. Future oversized PRs need ordinary slicing/exception policy |

## Tasks and acceptance
- [ ] **P1 Verify actual approved-payment evidence.**
  - Route: delegated direct; mapping/preparation spans provider DTO/client/validator/invoice/contracts and two non-trivial writer files. Writer edits only its owned backend snapshot; parent transfers exact allowed files.
  - Add `date_approved` parsing without breaking the legacy DTO constructor. Add an explicitly invoked, non-activating evidence client using the existing RestClient/properties/validator and controlled test clock.
  - Validate trusted invoice/preapproval binding before GET `/v1/payments/{payment.id}`, then matching actual ID/collector/money/currency, actual approved state, zero refund and present/nonfuture approval timestamp. Produce immutable redacted evidence; no paid deadline, persistence, access change or active-flow invocation yet.
  - Exact four backend paths: `service/dto/pago/mercadopago/MercadoPagoPaymentResponse.java`, `service/impl/MercadoPagoResponseValidator.java`, new `service/impl/MercadoPagoApprovedPaymentEvidenceClient.java` under `src/main/java/com/leonardorozza/mvgrreparacionesbackend/`; new `src/test/java/com/leonardorozza/mvgrreparacionesbackend/MercadoPagoApprovedPaymentEvidenceClientTests.java`.
  - TDD first assertion: deserializing `date_approved` must preserve it on the existing DTO; compile against the old DTO through AssertJ property introspection. Then client contracts cover offset normalization, delayed approval, missing/malformed/future/no-zone dates, disabled/no-request, nonapproved/refunded states, identity/money/collector mismatch and HTTP failures. No runtime network or provider authentication.
  - Focused runner selectors: `MercadoPagoApprovedPaymentEvidenceClientTests,MercadoPagoContractTests,SubscriptionEntitlementPolicyTests`; broader applicable offline Surefire/compile/regressions and new-file-inclusive whitespace at closure. Exact argv/results retained in proof.
  - Runtime: actual RestClient with MockRestServiceServer, no sockets/DB/startup/scheduler. PostgreSQL/schema/browser checks N/A for this schema-free evidence unit, not waived for P2/P4.
  - Rollback: remove evidence client/strict validation and new tests plus approval-date parsing together; preserve current provider flows and V42.
  - Commit/evidence/native disposition: pending. Forecast 250–500 authored lines plus tracker.
- [ ] **P2 Persist and enforce paid cancellation atomically with V43 compatibility.**
  - Route: delegated backend/schema writers with disjoint allowlists after design details are reconciled; mapping involves 4+ files and writers touch 2+ non-trivial files. Parent owns schema/behavior integration and one coherent working boundary, not an unbootable intermediate deployment.
  - Consume P1 evidence, persist stable approval/paid-expiry/current-link association, retain paid access on confirmed cancellation, fence replacement/late authorization, and enforce exact expiry through shared entitlement/repair limits. Legacy unknown gets no invented paid expiry; do not regrant through closure or reversal evidence.
  - Add immutable V43 metadata migration and independently measure latest-history/checksum/sentinel18 registration/legal/photo/closure/erasure and C/en_US migrated/restored recovery profiles. Preserve old constants, budgets, drift/future rejection and V33/V34 restrictions.
  - Checks: controlled-time domain RED/GREEN, real PostgreSQL clean/upgrade/restore positives, tampering/drift negatives, payment/cancel/replay/race/trial/closure/limits regressions, all applicable offline compilation/full checks and artifact identity. Owned local fixtures only; downloads/runtime resource changes need applicable authorization.
  - Rollback: pre-deployment P2 source/tests/admission changes together; never rewrite applied migrations or revert prior features/data. Commit/evidence/native disposition pending. Forecast 1,000–1,800 lines.
- [ ] **P3 Present canceled renewal and paid expiry without revoking valid PRO.**
  - Route: delegated frontend writer; DTO/mutation/cache plus both plan and unverified-titular UI/test surfaces trigger mapping/preparation/writer delegation.
  - Extend server DTO metadata, conditionally reconcile restricted caches, replace immediate-FREE copy with confirmed/pending renewal states and server expiry. Keep backend `funciones` authoritative, preserve unverified titular exit exception and FREE cleanup.
  - Checks: real assertion RED/GREEN in subscription/cache/payment/plan/preview suites, full Vitest/tooling/lint/types/technical build and isolated mocked browser cancellation test; no guessed browser entitlement dates/provider calls.
  - Rollback: frontend contract/presentation/reconciliation/tests together. Commit/evidence/native disposition pending. Forecast 430–750 lines plus docs.
- [ ] **P4 Close the current coordinated candidate and recovery evidence.**
  - Route: delegated ordinary verifiers; parent reconciles exact source/images/artifacts and records a documentary work unit only after observed outcomes.
  - Applicable full backend/frontend and local synthetic integration: successful payment, renewal, cancellation, delayed/replayed events, paid expiry, FREE limits, trial, isolation/closure and recovery compatibility. Preserve failed/skipped/pending checks individually, never sum historical runs.
  - Real provider/inbox/checkout/charges, staging/publication/build-public/cloud/deploy/activation remain separate operational gates. Do not resume or manipulate unrelated withdrawn/shared runtime resources.
  - Commit/evidence/native disposition pending; rollback documentary evidence only. Forecast 100–250 lines.

## Source evidence and decisions
- Official payment resource documents `date_approved` separately from creation: https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/get-payment/get . Invoice binding is preapproval → nested payment ID → actual resource: https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/get-authorized-payment/get . Public examples are not real-provider proof; missing approval dates remain unverified.
- User's actual approval-date choice supersedes the previously proposed programmed-debit anchor. August design/legal drafts remain contextual, not approved publication or authorization for their broader architecture.

## Progress and next step
Read-only source/provider mapping and product-anchor decision are complete. Next: P1 writer observes genuine DTO assertion RED before production edits, implements bounded evidence contracts, then focused/full applicable checks and commit. P2–P4 remain unimplemented; cancellation still uses the old immediate-FREE flow until those tasks are complete. All provider/payment flags remain unchanged.

## Recovery mirror
Locator `odd/tasks/pro-paid-period-cancellation.md`; full Engram topic `odd/pro-paid-period-cancellation/tasks`. Read back file and full mirror after updates. No authoritative runtime session ID supplied: omit `session_id`.
