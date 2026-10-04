# Verify the current backend Docker image locally

Status: D1/D2 passed on the exact current canonical image and their verified evidence was committed. The required native review is due and awaits fresh human consent; local functional completion is not native approval or deployment readiness. The prior offline failure remains preserved.

## Objective and authorization

The user requested “Bueno avanza con docker” after the V41 correction passed full local verification. Build and run the current backend image without replacing the existing runtime or accessing deployment services. Backend baseline cb82a0bb9e714e9c1142651de6e3a1753144b35a; behavior364a90a already passed 10,605 canonical cases and 22 real-browser cases. Frontend baseline397c955d971c03eec28f97dec77dee1c17ba8738.

The subsequent “Si” explicitly grants public dependency downloads only from `https://repo.maven.apache.org/maven2`, anonymously without credentials or deployment. Read-only mapping must verify the previously used bounded relay procedure before the retry; this grant does not authorize other destinations, source upload, pulls or cache-seeding workarounds.

Reuse the existing approved design unchanged: canonical multi-stage Dockerfile, Maven-built JAR, private-configuration artifact guards, required migration, non-root appuser and 75% maximum heap. No source or Dockerfile change is proposed. Earlier builder lacked MapStruct processor1.6.3 POM despite a valid host cache; deleted intermediate layers prevent assuming a complete current builder cache.

## Scope, safety and policy

- Local public-only snapshot and exact Dockerfile; no host-JAR substitution or weakened gates. Preserve the failed cached-base, pull=false, network=none attempt. The retry may download only anonymous public Maven Central artifacts through the verified bounded route, retaining cached bases and pull=false.
- Explicit local Docker socket and fresh empty synthetic client config. Preserve the pre-attempt baseline of eight containers (including the owned failed builder), 39 tagged/intermediate image IDs, six unrelated dirty files and PID11272/backend52184/ownedPG52183 with its unchanged running JAR. Do not clean its target directory. The successful attempt retained all nine new image IDs as well.
- No other downloads, pulls, credential inspection, cache/image removal, prune, global cleanup, source changes, providers, remote execution, Railway/Vercel access, deployment, push/PR/merge. A required dependency outside the approved destination pauses that route; any cache-seeding/source workaround needs separately approved design.
- TDD ON from odd/tasks/charge-session-expiry.md:15. Existing-code verification needs no invented new RED/GREEN. Runner: installed Docker CLI/local daemon; Java21/Maven3.9.11 canonical image build; scoped runtime HTTP checks. Tests already passed on the exact behavior; image checks remain independent.
- Native RDD ON/global. Backend reviewed boundary fe1bec7; the pending range is now 429 authored lines, medium/review_due, not approved. The previous 365-line C2/C3 under-budget state is historical. New work-unit commits require native committed assessment from that boundary; never reuse C1 consent. Frontend passive boundary3d20b66 before this tracking checkpoint.
- Initial forecast: 40–90 documentary lines, no source changes. Running authored count: 150 (28-line planning checkpoint, 14-line offline checkpoint, 64-line backend note and 44-line documentary closure). Delivery ask-on-risk with cached feature-branch-chain; no PRs authorized. Parent owns exact transfer/work-unit commits, tracker/full Engram mirror and native gates. About400 is advisory, not code-golf.
- Persistence: this document and full project-scoped topic odd/docker-current-candidate/tasks. No authoritative runtime session ID supplied; omit session_id.

## Tasks

- [x] **D1 Build the exact current canonical Dockerfile.** Route: delegated verification; mapping/preparation spans Dockerfile/POM/ignore/packaging/runtime files (4+). Recorded source/resource baseline, exact command/environment/context, build exit0 and immutable image identity. Original Dockerfile and gates unchanged; anonymous Central-only relay and retained failures verified. Evidence work-unit commit4c847abec4081c69094922b20ee4c3155b564074.
- [x] **D2 Inspect and smoke the resulting image with synthetic data.** Route: same bounded verifier after D1. Built JAR/config/private-config/migration guards, non-root/heap checks and fresh owned PostgreSQL/app on an internal network with no published ports passed. Flyway41/JPA validation and three health probes passed; 27 configured opt-in/provider flags OFF, not universal scheduler shutdown. Requests, exits, hashes, ownership and scoped cleanup recorded. Same coherent verification-note commit4c847ab; no SMTP/payment/deployed-readiness claim. Native approval remains pending below.

## Progress and next step

Read-only mapping verified the old failed log SHA8019608d8c3392bea5ebbe294726d0bdf49b2cdf10548f81ec840a6f67ff2b78 and current public build-input preservation. No original source, Docker resource or credential was mutated by mapping. The delegated D1/D2 continuation is now complete below. CI's25-minute timeout versus local56m38 full verification is a separate unproven launch risk, not authorized Docker scope expansion.

Planning checkpoint951d55451f0c9dbb222102a26bf525cce2fd4691, parent397c955: 28 documentary authored lines, native passive/non_executable_only, review_due=false. Full actual document/Engram956 mirror matched before delegated verification; frontend passive boundary951d554.

### D1 observed offline dependency failure

Fresh proof `/private/tmp/ordenfix-docker-current.rw1d0dwp`; exact backendcb82a0b/public snapshot1,290files and unchanged Dockerfile/POM/ignore. Recorded canonical `docker build --pull=false --network=none --tag ordenfix-docker-current:rw1d0dwp --iidfile <proof>/build/image-id .` with legacy builder, explicit local socket and empty synthetic Docker config. Exit1 after4.82s at step4 `mvn dependency:go-offline`: missing `org.springframework.boot:spring-boot-starter-parent:pom:4.0.6`. No final image/iidfile; D2 artifact guards/non-root/heap/database/HTTP checks could not run. Existing source/JAR tests do not replace image checks. No retry, cache seeding, dependency download, source correction or cleanup occurred.

Parent independently verified all1,373frozenartifact hashes,1,290original/snapshot source hashes,sixprotected files,unchanged runtime JAR and the actual failure log. Frozen manifest SHA d63b67122e9830e763263658c6c0d19a7d698a279cab69966f33773769b978c5; result SHA c86d9462432eb81f36b8ee3f9c4ba7cf98ca6dd1f8bd628da31cbc3ddf5a7568; log SHA 778217a663966403a0d063bd071da4dbb1d0ff1f516a5af09181974f1c5d8ec4; parent integrity SHA 4db42a3e6b586e7a7541e8c330516bd463c1c2abeb80f9816965eb794e7c0c1d. The English sibling note is retained inside proof only, not transferred to the backend.

All37preexisting image IDs (tagged and intermediates) and seven existing containers/configurations were preserved. Two new owned intermediate images2de02fba7205/8745eb370c91 and exited failed buildera582426d1d2c remain; there are39image IDs after the attempt. No image/cache/prune/container cleanup. Requested PID11272 and its unchanged JAR stayed healthUP. Original backendHEAD/native range is unchanged; no new backend commit or approval.

Offline checkpoint3d20b66d1c17854b9b50127b9ff1d864a1c13098, parent951d554: 14 documentary authored lines, native passive/non_executable_only, review_due=false; frontend passive boundary3d20b66.

At the offline checkpoint, the next step was delegated mapping of the prior T2 relay and a fresh Central-only retry. The first missing parent POM did not enumerate all uncached dependencies. The unchanged canonical Dockerfile and gates were subsequently verified; no cache-seeding/source workaround was used. D1/D2 completion is recorded below, rather than relabeling this failed attempt.

### Authorized networked retry procedure

Delegated mapping found the historical T2 proof directory unavailable; observations750/766 and production-release.md preserve the approved design and successful outcome, not the executable helper. Reconstruct a temporary helper in a new proof root under that unchanged design: internal build network, fixed `repo.maven.apache.org:443` TLS passthrough relay, cached original bases and synthetic empty Docker client configuration. Label the helper as new; do not claim the old script was recovered.

Before enabling its upstream, verify the selected public builder's standard Maven configuration establishes anonymous `/maven2/` requests, with no extra repositories, settings, extensions or proxy credentials, and verify routing/ownership offline. The relay enforces the host/port, not decrypted request paths or headers; Maven configuration supplies the separate anonymous/path evidence. If these checks fail or another destination is required, stop rather than broaden the route. Preserve the prior frozen failure and all existing resources. No original source or Dockerfile changes, host-JAR substitution, cache seeding or registry pull.

### D1/D2 observed completion and review boundary

Fresh frozen proof `/private/tmp/ordenfix-docker-central.mhl8gcf8`: exact 1,290 public source files, build exit 0 in 91.01s, immutable image `sha256:60c5265c1a50aa20e7999bfd7d02c9576deb667e4cc1a0b803c42fce66f51c1d`. All 14 canonical steps and artifact gates passed. Three built JARs plus runtime main JAR contain exact public config and 41 source-matching migrations, no forbidden private config; runtime main SHA `301be54239edeca46f1e6b81de521980b8d6b2ccf519c95a71ab74494a4fb876`.

Actual PostgreSQL 16.14/Flyway 41/JPA validate startup and health/readiness/liveness HTTP200 UP passed. Runtime UID999/appuser and 75% heap measured 402,653,184 bytes under 512MiB. All 27 configured opt-in/provider flags OFF. SuscripcionScheduler remains unconditional at 03:00; the isolated synthetic DB measured zero TRIAL/eligible expired TRIAL rows and one PRO/ACTIVA row at `2026-10-04T11:45:41.504376Z`. No behavior workaround or existing DB access.

Parent independently verified all 1,809 frozen artifact hashes/sizes, all 1,290 original/snapshot files, four JAR/config/migration inspections, six protected files, raw HTTP/SQL/logs and live Docker inventory. All 39 prior image IDs retained, 48 total; eight prior containers/config/restart/runtime/network identities preserved. Only captured newly owned containers/three networks cleaned, no image/cache removal. Existing PID11272/backend52184 remains UP with unchanged JAR. Helper failures (README preflight, unstarted relay IP, missing file utility, SQL boolean formatting) remain separate. Parent's initial Env-only flags assertion also failed without mutation; actual Spring Cmd verification then passed.

ManifestSHA1c5a5324f758b795a945565a6304adf902b8d35d2cbd5d944fb1001990036ec0; resultSHAb2f33e240c6e4fdd861febe8243e44ab8d4a32ac9f5c09ff55df87b401c14d9d; buildlogSHA84f7e2d1e1617354aa6ba45764d246a01134608de01ac3e427de953eafe7ebf6. Separate parentintegrity `/private/tmp/ordenfix-docker-central-parent-integrity.json` SHAe6742d63a206e40fb12af48ae531041e37b38a800b2736cd82c11603678a9591. Exact64-line English note transferred to backend `docs/verification/docker-current-verification.md`, SHAb87d0c3d6d9ee66b4d51775a3f06eb9ee3f1464e13d2b5e2e9ec5cf591b37687, commit4c847ab(parentcb82a0b). No source behavior changed; full10605cases/22browserchecks were not repeated or recounted. Rollback removes this documentary note only, not source behavior or retained image.

Native committed assessment fe1bec7→4c847ab: medium/executable_change, five paths/429 authored lines, consumed=false, review_due=true/slice_budget_reached. Cached feature-branch-chain retained; this pending slice contains 364a90a, cb82a0b and 4c847ab, no PR created. Exact returned STATUS followed; two unrelated .atl files excluded against verified inventory. Target `sha256:54faab80c13cb8f950e0acc85cb3a73020c0e3a0a532d3f61c152a95611e51c8`; lineage `review-7efcd93cf6c78fb6`. Auto-review rejected the returned start/relay-consent command before execution because this new candidate/provider lacks direct human authorization. No retry/bypass or new code sharing/review occurred; reviewed boundary stays fe1bec7, not 4c847ab.

Next: request fresh explicit consent for that candidate and Codex/OpenAI session, then follow native transitions only if granted. Railway/Vercel deployment/config, real SMTP/Cloudinary/MercadoPago and deployed checks remain separate and unauthorized here.
