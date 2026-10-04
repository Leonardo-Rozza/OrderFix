# Verify the current backend Docker image locally

Status: D1 attempted offline and failed on an uncached parent POM; D1 remains pending and D2 was not run. Further network-dependent work awaits explicit anonymous Maven Central authorization. No image build success or application defect is claimed.

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

Planning checkpoint951d55451f0c9dbb222102a26bf525cce2fd4691, parent397c955: 28 documentary authored lines, native passive/non_executable_only, review_due=false. Full actual document/Engram956 mirror matched before delegated verification; frontend passive boundary951d554.

### D1 observed offline dependency failure

Fresh proof `/private/tmp/ordenfix-docker-current.rw1d0dwp`; exact backendcb82a0b/public snapshot1,290files and unchanged Dockerfile/POM/ignore. Recorded canonical `docker build --pull=false --network=none --tag ordenfix-docker-current:rw1d0dwp --iidfile <proof>/build/image-id .` with legacy builder, explicit local socket and empty synthetic Docker config. Exit1 after4.82s at step4 `mvn dependency:go-offline`: missing `org.springframework.boot:spring-boot-starter-parent:pom:4.0.6`. No final image/iidfile; D2 artifact guards/non-root/heap/database/HTTP checks could not run. Existing source/JAR tests do not replace image checks. No retry, cache seeding, dependency download, source correction or cleanup occurred.

Parent independently verified all1,373frozenartifact hashes,1,290original/snapshot source hashes,sixprotected files,unchanged runtime JAR and the actual failure log. Frozen manifest SHA d63b67122e9830e763263658c6c0d19a7d698a279cab69966f33773769b978c5; result SHA c86d9462432eb81f36b8ee3f9c4ba7cf98ca6dd1f8bd628da31cbc3ddf5a7568; log SHA 778217a663966403a0d063bd071da4dbb1d0ff1f516a5af09181974f1c5d8ec4; parent integrity SHA 4db42a3e6b586e7a7541e8c330516bd463c1c2abeb80f9816965eb794e7c0c1d. The English sibling note is retained inside proof only, not transferred to the backend.

All37preexisting image IDs (tagged and intermediates) and seven existing containers/configurations were preserved. Two new owned intermediate images2de02fba7205/8745eb370c91 and exited failed buildera582426d1d2c remain; there are39image IDs after the attempt. No image/cache/prune/container cleanup. Requested PID11272 and its unchanged JAR stayed healthUP. Original backendHEAD/native range is unchanged; no new backend commit or approval.

Next: ask one explicit authorization for anonymous public dependency downloads from `https://repo.maven.apache.org/maven2`, without credentials or deployment. This first missing parent POM does not enumerate all uncached dependencies. Reuse the canonical Dockerfile and existing security gates if authorized; any cache-seeding/source workaround requires separately approved design. D1/D2 stay unchecked until observed acceptance and work-unit commits.
