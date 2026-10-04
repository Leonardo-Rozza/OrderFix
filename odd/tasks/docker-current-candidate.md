# Verify the current backend Docker image locally

Status: authorized local verification; D1 pending. Prior offline dependency failure is retained, not treated as a source defect or a successful image build.

## Objective and authorization

The user requested “Bueno avanza con docker” after the V41 correction passed full local verification. Build and run the current backend image without replacing the existing runtime or accessing deployment services. Backend baseline cb82a0bb9e714e9c1142651de6e3a1753144b35a; behavior364a90a already passed 10,605 canonical cases and 22 real-browser cases. Frontend baseline397c955d971c03eec28f97dec77dee1c17ba8738.

Reuse the existing approved design unchanged: canonical multi-stage Dockerfile, Maven-built JAR, private-configuration artifact guards, required migration, non-root appuser and 75% maximum heap. No source or Dockerfile change is proposed. Earlier builder lacked MapStruct processor1.6.3 POM despite a valid host cache; deleted intermediate layers prevent assuming a complete current builder cache.

## Scope, safety and policy

- Local public-only snapshot and exact Dockerfile; no host-JAR substitution or weakened gates. Build uses cached base images, pull=false and network=none first.
- Explicit local Docker socket and fresh empty synthetic client config. Preserve all seven existing containers, all current tagged/intermediate image IDs, six unrelated dirty files and PID11272/backend52184/ownedPG52183 with its unchanged running JAR. Do not clean its target directory.
- No downloads, pulls, credential inspection, cache/image removal, prune, global cleanup, source changes, providers, remote execution, Railway/Vercel access, deployment, push/PR/merge. A dependency failure pauses that route for explicit anonymous Maven Central authorization or separately approved cache-seeding design.
- TDD ON from odd/tasks/charge-session-expiry.md:15. Existing-code verification needs no invented new RED/GREEN. Runner: installed Docker CLI/local daemon; Java21/Maven3.9.11 canonical image build; scoped runtime HTTP checks. Tests already passed on the exact behavior; image checks remain independent.
- Native RDD ON/global. Backend reviewed boundaryfe1bec7; pending C2/C3 range365 authored lines is medium/under_budget, not approved. New work-unit commits require native committed assessment from that boundary; never reuse C1 consent. Frontend passive boundary397c955.
- Forecast40–90 documentary lines, no source changes. Delivery ask-on-risk with cached feature-branch-chain; no PRs authorized. Parent owns exact transfer/work-unit commits, tracker/full Engram mirror and native gates. About400 is advisory, not code-golf.
- Persistence: this document and full project-scoped topic odd/docker-current-candidate/tasks. No authoritative runtime session ID supplied; omit session_id.

## Tasks

- [ ] **D1 Build the exact current canonical Dockerfile.** Route: delegated verification; mapping/preparation spans Dockerfile/POM/ignore/packaging/runtime files (4+). Acceptance: recorded current source hashes, all-image/container baseline, exact command/environment/context, unique tag/iidfile, build exit0 and resulting image identity. Preserve every failed attempt. If cached dependencies are insufficient, report the precise missing artifacts and stop network-dependent work; do not check this off. Parent commits observed successful build evidence with its note.
- [ ] **D2 Inspect and smoke the resulting image with synthetic data.** Route: same bounded verifier after D1. Acceptance: built image JAR/config hashes and private-config/migration guards; runtime non-root/heap checks; fresh owned PostgreSQL/app on loopback, providers/jobs disabled, Flyway41/JPA validation and health/readiness/liveness; no existing runtime replacement. Record requests/exits/hashes/resource ownership and scoped cleanup. No SMTP/payment/deployed-readiness claim. Parent closes with a coherent verification-note commit.

## Progress and next step

Read-only mapping verified the old failed log SHA8019608d8c3392bea5ebbe294726d0bdf49b2cdf10548f81ec840a6f67ff2b78 and current public build-input preservation. No original source, Docker resource or credential was mutated by mapping. Next: delegated D1 in a fresh owned proof root; if it succeeds, continue D2 unchanged. CI's25-minute timeout versus local56m38 full verification is a separate unproven launch risk, not authorized Docker scope expansion.
