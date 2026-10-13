package com.leonardorozza.mvgrreparacionesbackend.testing.owned;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.V41RankIterationSelection;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.engine.JupiterTestEngine;
import org.junit.platform.engine.TestDescriptor;
import org.junit.platform.engine.TestExecutionResult;
import org.junit.platform.engine.UniqueId;
import org.junit.platform.engine.support.descriptor.AbstractTestDescriptor;
import org.junit.platform.engine.support.descriptor.MethodSource;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestIdentifier;
import org.junit.platform.launcher.TestPlan;
import org.junit.platform.launcher.core.LauncherConfig;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

/** Pure actual launcher/driver checks. No main/executeSelected/owner/runtime admission is called. */
public final class V41RankLauncherBindingChecks {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String SOURCE = "/private/tmp/ordenfix-pro-review-chain-fueuys_0/source/src/test/java/"
            + "com/leonardorozza/mvgrreparacionesbackend/cuenta/recovery/RecoveryProfileDeletionIT.java";
    private static final String SHA = "40371265d3cd628985bf2bf40a29c2b5a755a2fed15ba6c857c69c9da3df750e";
    private static final List<String> ROWS = List.of(
            "C,false,REORDER", "C,true,REORDER", "en_US.utf8,false,REORDER", "en_US.utf8,true,REORDER",
            "C,false,V41_NOT_LATEST", "C,true,V41_NOT_LATEST", "en_US.utf8,false,V41_NOT_LATEST", "en_US.utf8,true,V41_NOT_LATEST",
            "C,false,OLDER_TAIL", "C,true,OLDER_TAIL", "en_US.utf8,false,OLDER_TAIL", "en_US.utf8,true,OLDER_TAIL");
    private static final List<String> KINDS = List.of("REORDER", "V41_NOT_LATEST", "OLDER_TAIL");
    private static final List<String> DISPLAYS = List.of(
            "V41 recovery order locale=\"C\", restored=\"false\", drift=\"REORDER\"",
            "V41 recovery order locale=\"C\", restored=\"true\", drift=\"REORDER\"",
            "V41 recovery order locale=\"en_US.utf8\", restored=\"false\", drift=\"REORDER\"",
            "V41 recovery order locale=\"en_US.utf8\", restored=\"true\", drift=\"REORDER\"",
            "V41 recovery order locale=\"C\", restored=\"false\", drift=\"V41_NOT_LATEST\"",
            "V41 recovery order locale=\"C\", restored=\"true\", drift=\"V41_NOT_LATEST\"",
            "V41 recovery order locale=\"en_US.utf8\", restored=\"false\", drift=\"V41_NOT_LATEST\"",
            "V41 recovery order locale=\"en_US.utf8\", restored=\"true\", drift=\"V41_NOT_LATEST\"",
            "V41 recovery order locale=\"C\", restored=\"false\", drift=\"OLDER_TAIL\"",
            "V41 recovery order locale=\"C\", restored=\"true\", drift=\"OLDER_TAIL\"",
            "V41 recovery order locale=\"en_US.utf8\", restored=\"false\", drift=\"OLDER_TAIL\"",
            "V41 recovery order locale=\"en_US.utf8\", restored=\"true\", drift=\"OLDER_TAIL\"");
    private static final Path FRESH_OWNER_ROOT = Path.of("/private/tmp/ordenfix-pro-recovery-v41-rank-runtime-eknsdkn0/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-cf3482320bfc461aa551b8da25272e92");
    private static final String FRESH_NONCE = "cf3482320bfc461aa551b8da25272e92";
    private static final Path CONSUMED_OWNER_ROOT = Path.of("/private/tmp/ordenfix-pro-recovery-v41-final-m3daoe_6/rows/row-1/ordenfix-pro-recovery-v41-drift4-python-owner-nosite-f829c8943d2f95bceb8330c4ef202e8c");
    private static Path data;
    private static int serial, passed, failed, errors;
    private interface Checked { void run() throws Exception; }
    private interface Mutation { void change(ObjectNode node); }

    public static void main(String[] args) throws Exception {
        require(args.length == 2, "Expected exact fresh compiled origin and new owned data root");
        Path origin = Path.of(args[0]); data = Path.of(args[1]);
        require(data.isAbsolute() && data.normalize().equals(data)
                && data.startsWith(Path.of("/private/tmp/ordenfix-pro-recovery-v41-rank-runtime-eknsdkn0/inputs"))
                && !Files.exists(data), "New explicit owned runtime data only");
        Files.createDirectory(data);
        for (Class<?> type : List.of(V41RankLauncherBindingChecks.class, RecoveryOwnedOwnerDriver.class,
                RecoveryV42CsvLauncher.class, RecoveryRuntimeIsolation.class, V41RankIterationSelection.class,
                Class.forName(V41RankIterationSelection.CLASS, false, V41RankLauncherBindingChecks.class.getClassLoader()))) {
            require(Path.of(type.getProtectionDomain().getCodeSource().getLocation().toURI()).equals(origin),
                    "Unexpected compiled origin " + type);
        }
        var toy = Class.forName(V41RankIterationSelection.CLASS, false, V41RankLauncherBindingChecks.class.getClassLoader());
        require(System.getProperty("v41.rank.synthetic.initialized") == null, "Synthetic body initialized before declaration guard");
        for (int i = 0; i < 12; i++) {
            final int index = i;
            check("pinned-row-" + i, () -> require(admitted(validSpec(index)) == index,
                    "Pinned single row must survive unchanged"));
        }
        check("closed-metadata-negatives", V41RankLauncherBindingChecks::metadataNegatives);
        check("pin-path-and-byte-negatives", V41RankLauncherBindingChecks::pinNegatives);
        check("exact-declaration-before-discovery", () -> {
            try { RecoveryRuntimeIsolation.admitSelectedDeclarations(); }
            catch (IllegalStateException denied) {
                throw new AssertionError("Exact original V41 declaration rejected by inherited runtime guard", denied);
            }
            require(System.getProperty("v41.rank.synthetic.initialized") == null, "Declaration guard initialized selected fixture");
            require(Boolean.TRUE.equals(RecoveryRuntimeIsolation.runtimeReport().get("selectedMetadataAdmittedWithoutInitialization")),
                    "Actual declaration guard must admit exact original metadata");
        });
        for (int i = 0; i < 12; i++) {
            final int index = i;
            check("actual-single-row-callback-" + i, () -> actualRow(index));
        }
        check("twelve-indexed-callback-lineage", V41RankLauncherBindingChecks::witnessPositives);
        check("strict-witness-negatives", V41RankLauncherBindingChecks::witnessNegatives);
        check("fresh-binding-and-consumed-identity-rejection", V41RankLauncherBindingChecks::bindingChecks);
        check("closed-owner-argv-and-disabled-launch", V41RankLauncherBindingChecks::argvChecks);
        check("exact-one-summary-counts", V41RankLauncherBindingChecks::summaryChecks);
        check("unchanged-owned-lifecycle-order", V41RankLauncherBindingChecks::lifecycleChecks);
        check("unchanged-min-shutdown-order", V41RankLauncherBindingChecks::shutdownChecks);
        System.out.println("SYNTHETIC_LAUNCHER_ONLY passed=" + passed + " failures=" + failed + " errors=" + errors);
        if (failed != 0 || errors != 0) System.exit(1);
    }

    private static void check(String name, Checked body) {
        try { body.run(); passed++; System.out.println("CHECK_PASS " + name); }
        catch (AssertionError failure) { failed++; System.out.println("CHECK_FAIL " + name + ": " + failure); }
        catch (Throwable error) { errors++; System.out.println("CHECK_ERROR " + name + ": " + error); error.printStackTrace(System.out); }
    }
    private static Method seam(Class<?> type, String name, Class<?>... args) {
        try { var method = type.getDeclaredMethod(name, args); method.setAccessible(true); return method; }
        catch (NoSuchMethodException absent) { throw new AssertionError("Required actual seam absent: " + name, absent); }
    }
    private static Object invoke(Method method, Object... args) throws Exception {
        try { return method.invoke(null, args); }
        catch (InvocationTargetException error) {
            if (error.getCause() instanceof Exception cause) throw cause;
            if (error.getCause() instanceof Error cause) throw cause;
            throw new AssertionError(error.getCause());
        }
    }
    private static int selected(RecoveryOwnedOwnerDriver.LaunchSpec spec) throws Exception {
        return (Integer) invoke(seam(RecoveryOwnedOwnerDriver.class, "selectedV41Row",
                RecoveryOwnedOwnerDriver.LaunchSpec.class), spec);
    }
    private static int admitted(RecoveryOwnedOwnerDriver.LaunchSpec spec) throws Exception {
        try { return selected(spec); }
        catch (java.io.IOException rejected) {
            throw new AssertionError("Valid fixed rank12 row metadata must be admitted", rejected);
        }
    }
    private static Object witness(int index) {
        try {
            var constructor = RecoveryV42CsvLauncher.SelectedExecutionWitness.class.getDeclaredConstructor(int.class);
            constructor.setAccessible(true); return constructor.newInstance(index);
        } catch (InvocationTargetException error) {
            if (error.getCause() instanceof IllegalArgumentException rejected) throw rejected;
            throw new AssertionError("Unexpected indexed witness construction failure", error.getCause());
        } catch (ReflectiveOperationException absent) { throw new AssertionError("Required indexed witness absent", absent); }
    }
    private static RecoveryV42CsvLauncher.SelectedExecutionWitness indexedWitness(int index) {
        return (RecoveryV42CsvLauncher.SelectedExecutionWitness) witness(index);
    }
    private static LauncherDiscoveryRequestBuilder request(int index) throws Exception {
        return (LauncherDiscoveryRequestBuilder) invoke(seam(RecoveryV42CsvLauncher.class,
                "configuredDiscoveryRequest", int.class), index);
    }
    private static ObjectNode metadata(int index) {
        ObjectNode n = JSON.createObjectNode();
        n.put("schema", 1); n.put("scope", "v41-recovery-fixed-single-csv-rank-history");
        n.put("selector", V41RankIterationSelection.CLASS + "#" + V41RankIterationSelection.METHOD + "(java.lang.String,boolean,java.lang.String)");
        n.put("selectionMarker", "SINGLE_ORIGINAL_V41_RANK_HISTORY_CSV_CASE");
        n.putObject("sourcePin").put("path", SOURCE).put("bytes", 59145).put("sha256", SHA);
        n.put("methodName", V41RankIterationSelection.METHOD);
        n.putArray("parameterTypes").add("java.lang.String").add("boolean").add("java.lang.String");
        var csv = n.putArray("csvSource"); ROWS.forEach(csv::add);
        n.put("originalRowIndex", index); n.put("originalInvocationOrdinal", index + 1);
        n.put("rankKind", KINDS.get(index / 4));
        n.put("maintenanceExec", true);
        var steps = n.putArray("steps"); var tokens = n.putArray("tokens");
        for (String phase : List.of("setup-create", "migrated-create")) { steps.add("case-" + (index + 1) + "-" + phase); tokens.add(7); }
        if (index % 2 == 1) {
            steps.add("case-" + (index + 1) + "-dump"); tokens.add(6);
            steps.add("case-" + (index + 1) + "-restored-create"); tokens.add(7);
            steps.add("case-" + (index + 1) + "-restore"); tokens.add(8);
        }
        n.putArray("vectors"); return n;
    }
    private static RecoveryOwnedOwnerDriver.LaunchSpec rawSpec(byte[] bytes) throws Exception {
        Path root = data.resolve("case-" + serial++); Files.createDirectory(root);
        Path file = root.resolve("exec-allowlist.json"); Files.write(file, bytes, StandardOpenOption.CREATE_NEW);
        return new RecoveryOwnedOwnerDriver.LaunchSpec(false, List.of(), Map.of(), root.toString(),
                Map.of(file.toString(), digest(bytes)), null);
    }
    private static RecoveryOwnedOwnerDriver.LaunchSpec validSpec(int index) throws Exception {
        ObjectNode n = metadata(index);
        require(n.get("steps").size() == (index % 2 == 0 ? 2 : 5), "Independent fixed operation count");
        return rawSpec(JSON.writeValueAsBytes(n));
    }
    private static void metadataNegatives() throws Exception {
        // Require the new seam before rejection checks; an absent implementation is genuine RED.
        seam(RecoveryOwnedOwnerDriver.class, "selectedV41Row", RecoveryOwnedOwnerDriver.LaunchSpec.class);
        List<Mutation> changes = List.of(
                n -> n.put("extra", true), n -> n.put("originalRowIndex", 0.0),
                n -> n.put("originalRowIndex", false), n -> n.put("originalRowIndex", "0"),
                n -> n.put("originalRowIndex", -1), n -> n.put("originalRowIndex", 12),
                n -> n.put("originalInvocationOrdinal", 2), n -> n.put("originalInvocationOrdinal", 1.0),
                n -> n.put("schema", 1.0), n -> n.put("maintenanceExec", "true"),
                n -> n.put("selectionMarker", "ALL_THREE_V42_DELIVERY_METADATA_CSV_CASES"),
                n -> n.put("scope", "other"), n -> n.put("selector", "other"),
                n -> n.put("methodName", "other"), n -> n.putArray("parameterTypes").add("boolean").add("java.lang.String"),
                n -> n.putArray("csvSource").add("C,true").add("C,false").add("en_US.utf8,false").add("en_US.utf8,true"),
                n -> ((ObjectNode) n.get("sourcePin")).put("bytes", 59145.0),
                n -> ((ObjectNode) n.get("sourcePin")).put("bytes", 59146),
                n -> ((ObjectNode) n.get("sourcePin")).put("path", SOURCE + ".alias"),
                n -> ((ObjectNode) n.get("sourcePin")).put("sha256", "0".repeat(64)),
                n -> ((ObjectNode) n.get("sourcePin")).put("extra", true),
                n -> n.withArray("steps").remove(1), n -> n.withArray("steps").set(1, JSON.getNodeFactory().textNode("case-2-migrated-create")),
                n -> n.withArray("steps").add("case-1-clone-COLUMN"),
                n -> n.put("rankKind", "V41_NOT_LATEST"), n -> n.put("rankKind", "COLUMN"), n -> n.put("rankKind", false),
                n -> n.withArray("tokens").set(1, JSON.getNodeFactory().numberNode(5.0)),
                n -> n.withArray("tokens").set(1, JSON.getNodeFactory().booleanNode(true)),
                n -> n.withArray("tokens").set(1, JSON.getNodeFactory().numberNode(5)),
                n -> n.withArray("vectors").add("extra"));
        for (Mutation change : changes) { ObjectNode n = metadata(0); change.change(n); var spec = rawSpec(JSON.writeValueAsBytes(n)); rejected(() -> selected(spec)); }
        for (int index = 0; index < 12; index++) {
            ObjectNode changed = metadata(index); changed.put("rankKind", KINDS.get((index / 4 + 1) % 3));
            var spec = rawSpec(JSON.writeValueAsBytes(changed)); rejected(() -> selected(spec));
            changed = metadata(index); changed.put("originalInvocationOrdinal", (index + 1) % 12 + 1);
            var wrongOrdinal = rawSpec(JSON.writeValueAsBytes(changed)); rejected(() -> selected(wrongOrdinal));
        }
        String original = JSON.writeValueAsString(metadata(0));
        for (String raw : List.of(original + " {}", original.replace("\"schema\":1", "\"schema\":1,\"schema\":1"))) {
            var spec = rawSpec(raw.getBytes(java.nio.charset.StandardCharsets.UTF_8)); rejected(() -> selected(spec));
        }
    }
    private static void pinNegatives() throws Exception {
        seam(RecoveryOwnedOwnerDriver.class, "selectedV41Row", RecoveryOwnedOwnerDriver.LaunchSpec.class);
        var valid = validSpec(0); String file = Path.of(valid.cwd()).resolve("exec-allowlist.json").toString();
        var noPin = new RecoveryOwnedOwnerDriver.LaunchSpec(false, List.of(), Map.of(), valid.cwd(), Map.of(), null);
        rejected(() -> selected(noPin));
        var badPin = new RecoveryOwnedOwnerDriver.LaunchSpec(false, List.of(), Map.of(), valid.cwd(), Map.of(file, "0".repeat(64)), null);
        rejected(() -> selected(badPin));
        for (String cwd : List.of("relative", valid.cwd() + "/../" + Path.of(valid.cwd()).getFileName())) {
            var alias = new RecoveryOwnedOwnerDriver.LaunchSpec(false, List.of(), Map.of(), cwd, valid.sourcePins(), null);
            rejected(() -> selected(alias));
        }
        Path linkRoot = data.resolve("symlink-case"); Files.createDirectory(linkRoot);
        Path link = linkRoot.resolve("exec-allowlist.json"); Files.createSymbolicLink(link, Path.of(file));
        var alias = new RecoveryOwnedOwnerDriver.LaunchSpec(false, List.of(), Map.of(), linkRoot.toString(), Map.of(link.toString(), valid.sourcePins().get(file)), null);
        rejected(() -> selected(alias)); Files.delete(link);
        // Mutate only new owned fixture DATA, never the original Recovery source or frozen tests.
        Path changed = data.resolve("changed-fixture.txt"); byte[] bytes = "before".getBytes(); Files.write(changed, bytes, StandardOpenOption.CREATE_NEW);
        var verifier = seam(RecoveryOwnedOwnerDriver.class, "verifyFile", Path.class, String.class);
        invoke(verifier, changed, digest(bytes)); Files.write(changed, "after".getBytes());
        rejected(() -> invoke(verifier, changed, digest(bytes)));
    }

    private static void actualRow(int index) throws Exception {
        var spec = validSpec(index); int admitted = admitted(spec); require(admitted == index, "Single source of index truth");
        var fixture = Class.forName(V41RankIterationSelection.CLASS);
        var marker = fixture.getDeclaredField("SYNTHETIC_ONLY"); marker.setAccessible(true);
        require(marker.getBoolean(null), "Only inert synthetic body may initialize");
        var field = fixture.getDeclaredField("CALLBACKS"); field.setAccessible(true);
        @SuppressWarnings("unchecked") List<String> bodies = (List<String>) field.get(null); bodies.clear();
        var launcher = LauncherFactory.create(LauncherConfig.builder().enableTestEngineAutoRegistration(false)
                .enableLauncherSessionListenerAutoRegistration(false).enableLauncherDiscoveryListenerAutoRegistration(false)
                .enableTestExecutionListenerAutoRegistration(false).enablePostDiscoveryFilterAutoRegistration(false)
                .addTestEngines(new JupiterTestEngine()).build());
        TestPlan plan = launcher.discover(request(admitted).build());
        require(plan.countTestIdentifiers(TestIdentifier::isTest) == 0 && bodies.isEmpty(), "No body during discovery");
        RecoveryRuntimeIsolation.admitDiscoveredMethods(plan);
        var observer = indexedWitness(admitted); observer.bindTemplate(plan);
        var summary = new SummaryGeneratingListener(); var registered = new ArrayList<TestIdentifier>();
        launcher.execute(plan, summary, new TestExecutionListener() {
            public void dynamicTestRegistered(TestIdentifier id) { if (id.isTest()) registered.add(id); }
            public void executionStarted(TestIdentifier id) { observer.started(id); }
            public void executionFinished(TestIdentifier id, TestExecutionResult result) { observer.finished(id, result); }
        });
        require(bodies.equals(List.of(ROWS.get(index))), "Actual fixture executed another original row " + bodies);
        require(registered.size() == 1 && registered.getFirst().getUniqueId().endsWith("[test-template-invocation:#" + (index + 1) + "]"), "Original ordinal changed");
        require(registered.getFirst().getDisplayName().equals(DISPLAYS.get(index)), "Display differs");
        require(registered.getFirst().getSource().orElseThrow() instanceof MethodSource source
                && source.getClassName().equals(V41RankIterationSelection.CLASS)
                && source.getMethodName().equals(V41RankIterationSelection.METHOD)
                && source.getMethodParameterTypes().equals("java.lang.String, boolean, java.lang.String"), "Direct actual source changed");
        require(RecoveryV42CsvLauncher.exactTestCounts(summary.getSummary()), "Actual one-success summary rejected");
        require(observer.complete() && observer.report().get("originalRowIndex").equals(index)
                && observer.report().get("originalInvocationOrdinal").equals(index + 1)
                && KINDS.get(index / 4).equals(observer.report().get("rankKind")), "Exact selected witness not complete");
        System.out.println("SYNTHETIC_ROW_PASS index=" + index + " uniqueId=" + registered.getFirst().getUniqueId());
    }
    private static TestPlan guardPlan() throws Exception {
        var launcher = LauncherFactory.create(LauncherConfig.builder().enableTestEngineAutoRegistration(false)
                .enableLauncherSessionListenerAutoRegistration(false).enableLauncherDiscoveryListenerAutoRegistration(false)
                .enableTestExecutionListenerAutoRegistration(false).enablePostDiscoveryFilterAutoRegistration(false)
                .addTestEngines(new JupiterTestEngine()).build());
        return launcher.discover(LauncherDiscoveryRequestBuilder.request().enableImplicitConfigurationParameters(false)
                .selectors(V41RankIterationSelection.select("0")).build());
    }
    private static TestIdentifier invocation(int ordinal, String display, String parameters) {
        UniqueId id = UniqueId.forEngine("junit-jupiter").append("class", V41RankIterationSelection.CLASS)
                .append("test-template", V41RankIterationSelection.METHOD + "(java.lang.String, boolean, java.lang.String)")
                .append("test-template-invocation", "#" + ordinal);
        return sourcedInvocation(id, display, V41RankIterationSelection.CLASS, V41RankIterationSelection.METHOD, parameters);
    }
    private static TestIdentifier sourcedInvocation(UniqueId id, String display, String type, String method, String parameters) {
        return TestIdentifier.from(new AbstractTestDescriptor(id, display,
                MethodSource.from(type, method, parameters)) {
            public TestDescriptor.Type getType() { return TestDescriptor.Type.TEST; }
        });
    }
    private static void witnessPositives() throws Exception {
        TestPlan plan = guardPlan();
        for (int index = 0; index < 12; index++) {
            RecoveryV42CsvLauncher.SelectedExecutionWitness observer;
            try { observer = indexedWitness(index); }
            catch (IllegalArgumentException rejected) { throw new AssertionError("Valid rank12 witness index rejected: " + index, rejected); }
            observer.bindTemplate(plan);
            TestIdentifier good = invocation(index + 1, DISPLAYS.get(index), "java.lang.String, boolean, java.lang.String");
            require(!observer.complete(), "Unexecuted witness cannot be complete");
            observer.started(good); require(!observer.complete(), "Unfinished witness cannot be complete");
            observer.finished(good, TestExecutionResult.successful());
            require(observer.complete() && KINDS.get(index / 4).equals(observer.report().get("rankKind")),
                    "Independent callback ordinal/display/signature/rank lineage rejected " + index);
        }
    }
    private static void witnessNegatives() throws Exception {
        TestPlan plan = guardPlan(); TestIdentifier good = invocation(1, DISPLAYS.get(0), "java.lang.String, boolean, java.lang.String");
        for (int mode = 0; mode < 11; mode++) {
            var observer = indexedWitness(0); observer.bindTemplate(plan);
            switch (mode) {
                case 0 -> { var wrong = invocation(2, DISPLAYS.get(1), "java.lang.String, boolean, java.lang.String"); observer.started(wrong); observer.finished(wrong, TestExecutionResult.successful()); }
                case 1 -> { var wrong = invocation(1, "wrong", "java.lang.String, boolean, java.lang.String"); observer.started(wrong); observer.finished(wrong, TestExecutionResult.successful()); }
                case 2 -> { var wrong = invocation(1, DISPLAYS.get(0), "java.lang.String"); observer.started(wrong); observer.finished(wrong, TestExecutionResult.successful()); }
                case 3 -> { observer.started(good); observer.started(good); observer.finished(good, TestExecutionResult.successful()); }
                case 4 -> observer.finished(good, TestExecutionResult.successful());
                case 5 -> { observer.started(good); observer.finished(good, TestExecutionResult.failed(new IllegalStateException("synthetic"))); }
                case 6 -> { observer.started(good); observer.finished(good, TestExecutionResult.aborted(new IllegalStateException("synthetic"))); }
                case 7 -> { observer.started(good); observer.finished(good, TestExecutionResult.successful()); observer.finished(good, TestExecutionResult.successful()); }
                case 8 -> { var wrong = sourcedInvocation(UniqueId.parse(good.getUniqueId()), DISPLAYS.get(0), "foreign.Class", V41RankIterationSelection.METHOD, "java.lang.String, boolean, java.lang.String"); observer.started(wrong); observer.finished(wrong, TestExecutionResult.successful()); }
                case 9 -> { var wrong = sourcedInvocation(UniqueId.parse(good.getUniqueId()), DISPLAYS.get(0), V41RankIterationSelection.CLASS, "foreignMethod", "java.lang.String, boolean, java.lang.String"); observer.started(wrong); observer.finished(wrong, TestExecutionResult.successful()); }
                case 10 -> { var wrong = invocation(13, DISPLAYS.get(0), "java.lang.String, boolean, java.lang.String"); observer.started(wrong); observer.finished(wrong, TestExecutionResult.successful()); }
                default -> throw new AssertionError("Unknown synthetic mode");
            }
            require(!observer.complete(), "Invalid witness accredited mode " + mode);
        }
        var observer = indexedWitness(0); observer.bindTemplate(plan); rejected(() -> observer.bindTemplate(plan));
        for (int index : List.of(-1, 12)) rejected(() -> witness(index));
    }
    private static OwnedFixtureProtocol.Binding binding(String nonce, Path root) {
        String owner = "pro-recovery-v41-rank12-owned-" + nonce;
        return new OwnedFixtureProtocol.Binding(owner, nonce, "ordenfix-pro-recovery-v41-rank12-pg-" + nonce,
                "ordenfix-pro-recovery-v41-rank12-net-" + nonce, RecoveryPostgreSQLFixture.CACHED_IMAGE, false,
                Map.of("com.ordenfix.fixture-owner", owner, "com.ordenfix.fixture-purpose", "recovery-v41-rank12-single",
                        "com.ordenfix.fixture-root", root.toString()), "b".repeat(64));
    }
    private static void fixtureBinding(OwnedFixtureProtocol.Binding binding) throws Exception {
        invoke(seam(RecoveryPostgreSQLFixture.class, "validateBinding", OwnedFixtureProtocol.Binding.class), binding);
    }
    private static void bindingChecks() throws Exception {
        var fresh = binding(FRESH_NONCE, FRESH_OWNER_ROOT);
        RecoveryOwnedOwnerDriver.verifyExpectedBinding(fresh, FRESH_OWNER_ROOT);
        try { fixtureBinding(fresh); }
        catch (IllegalStateException rejected) { throw new AssertionError("Fresh exact rank root must replace consumed fixture authority", rejected); }
        var old = new OwnedFixtureProtocol.Binding("pro-recovery-v41-drift4-owned-f829c8943d2f95bceb8330c4ef202e8c",
                "f829c8943d2f95bceb8330c4ef202e8c", "ordenfix-pro-recovery-v41-drift4-pg-f829c8943d2f95bceb8330c4ef202e8c",
                "ordenfix-pro-recovery-v41-drift4-net-f829c8943d2f95bceb8330c4ef202e8c", RecoveryPostgreSQLFixture.CACHED_IMAGE,
                false, Map.of("com.ordenfix.fixture-owner", "pro-recovery-v41-drift4-owned-f829c8943d2f95bceb8330c4ef202e8c",
                        "com.ordenfix.fixture-purpose", "recovery-v41-drift4-single", "com.ordenfix.fixture-root", CONSUMED_OWNER_ROOT.toString()), "b".repeat(64));
        rejected(() -> RecoveryOwnedOwnerDriver.verifyExpectedBinding(old, CONSUMED_OWNER_ROOT));
        rejected(() -> fixtureBinding(old));
        Path foreign = FRESH_OWNER_ROOT.resolveSibling("ordenfix-pro-recovery-v41-rank12-python-owner-nosite-" + "d".repeat(32));
        var foreignBinding = binding("d".repeat(32), foreign);
        rejected(() -> fixtureBinding(foreignBinding));
        rejected(() -> RecoveryOwnedOwnerDriver.verifyExpectedBinding(binding("e".repeat(32), FRESH_OWNER_ROOT), FRESH_OWNER_ROOT));
        var labels = new java.util.HashMap<>(fresh.labels()); labels.put("extra", "true");
        var extra = new OwnedFixtureProtocol.Binding(fresh.owner(), fresh.nonce(), fresh.containerName(), fresh.networkName(),
                fresh.cachedImageId(), false, labels, fresh.bootstrapNetworkId());
        rejected(() -> RecoveryOwnedOwnerDriver.verifyExpectedBinding(extra, FRESH_OWNER_ROOT)); rejected(() -> fixtureBinding(extra));
        for (String nonce : List.of("A".repeat(32), "a".repeat(31), "")) {
            var invalid = binding(nonce, FRESH_OWNER_ROOT);
            rejected(() -> RecoveryOwnedOwnerDriver.verifyExpectedBinding(invalid, FRESH_OWNER_ROOT)); rejected(() -> fixtureBinding(invalid));
        }
    }
    private static void argvChecks() throws Exception {
        List<String> good = List.of("/Library/Frameworks/Python.framework/Versions/3.10/bin/python3", "-B", "-S",
                FRESH_OWNER_ROOT.resolve("owner_main.py").toString(), "--execute-parent-approved-recovery-v41-rank12-owned-stdio",
                "--config", FRESH_OWNER_ROOT.resolve("request.json").toString(), "--config-sha", "a".repeat(64),
                "--runtime-pins-sha", "b".repeat(64));
        RecoveryOwnedOwnerDriver.verifyFullArgv(good, FRESH_OWNER_ROOT);
        for (int slot : List.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)) {
            var wrong = new ArrayList<>(good); wrong.set(slot, "wrong");
            rejected(() -> RecoveryOwnedOwnerDriver.verifyFullArgv(wrong, FRESH_OWNER_ROOT));
        }
        var extra = new ArrayList<>(good); extra.add("--retry"); rejected(() -> RecoveryOwnedOwnerDriver.verifyFullArgv(extra, FRESH_OWNER_ROOT));
        var disabled = validSpec(0); rejected(() -> RecoveryOwnedOwnerDriver.launch(disabled));
    }
    private static void summaryChecks() {
        Map<String, Long> good = Map.of("getTestsFoundCount", 1L, "getTestsStartedCount", 1L, "getTestsSucceededCount", 1L);
        require(RecoveryV42CsvLauncher.exactTestCounts(summary(good)), "One successful selected test must pass");
        require(!RecoveryV42CsvLauncher.exactTestCounts(null), "Null summary rejected");
        for (String key : List.of("getTestsFoundCount", "getTestsStartedCount", "getTestsSucceededCount",
                "getTestsFailedCount", "getTestsSkippedCount", "getTestsAbortedCount", "getContainersFailedCount", "getContainersAbortedCount")) {
            var changed = new java.util.HashMap<>(good); changed.put(key, key.startsWith("getTests") && good.containsKey(key) ? 3L : 1L);
            require(!RecoveryV42CsvLauncher.exactTestCounts(summary(changed)), "Unexpected count accepted " + key);
        }
    }
    private static TestExecutionSummary summary(Map<String, Long> counts) {
        return (TestExecutionSummary) Proxy.newProxyInstance(V41RankLauncherBindingChecks.class.getClassLoader(),
                new Class<?>[]{TestExecutionSummary.class}, (proxy, method, args) -> {
                    if (method.getReturnType() == long.class) return counts.getOrDefault(method.getName(), 0L);
                    if (method.getReturnType() == List.class) return List.of();
                    return null;
                });
    }
    private static void lifecycleChecks() throws Exception {
        var order = new ArrayList<String>();
        try { RecoveryV42CsvLauncher.runOwned(new RecoveryV42CsvLauncher.Lifecycle() {
            public void install() { order.add("install"); }
            public void execute() { order.add("execute"); throw new IllegalArgumentException("synthetic"); }
            public void close() { order.add("close"); }
            public void clear() { order.add("clear"); }
        }); throw new AssertionError("Original execution failure must propagate"); }
        catch (IllegalArgumentException expected) {
            require(order.equals(List.of("install", "execute", "close", "clear")), "Owned lifecycle order changed");
        }
    }
    private static void shutdownChecks() {
        var order = new ArrayList<String>(); var deadlines = new ArrayList<Long>();
        RecoveryV42CsvLauncher.finishShutdown(new RecoveryV42CsvLauncher.ShutdownLifecycle() {
            public long beginDeadline() { order.add("begin"); return 100; }
            public long currentDeadline() { return 80; }
            public void beginApplication(long d) { order.add("application-begin"); deadlines.add(d); }
            public void closeOwner() { order.add("owner-close"); }
            public boolean joinWatchdog(long d) { order.add("watchdog-join"); deadlines.add(d); return true; }
            public void finishApplication(long d) { order.add("application-finish"); deadlines.add(d); }
        });
        require(order.equals(List.of("begin", "application-begin", "owner-close", "watchdog-join", "application-finish"))
                && deadlines.equals(List.of(100L, 80L, 80L)), "Cleanup order/earliest deadline changed");
    }
    private static void rejected(Checked body) throws Exception {
        try { body.run(); }
        catch (java.io.IOException | IllegalArgumentException | IllegalStateException expected) { return; }
        throw new AssertionError("Malformed input was not rejected");
    }
    private static String digest(byte[] b) throws Exception { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(b)); }
    private static void require(boolean condition, String message) { if (!condition) throw new AssertionError(message); }
}
