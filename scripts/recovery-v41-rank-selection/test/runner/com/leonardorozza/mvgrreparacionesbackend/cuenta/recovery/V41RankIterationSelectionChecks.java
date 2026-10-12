package com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.engine.JupiterTestEngine;
import org.junit.platform.engine.TestExecutionResult;
import org.junit.platform.engine.support.descriptor.MethodSource;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestIdentifier;
import org.junit.platform.launcher.TestPlan;
import org.junit.platform.launcher.core.LauncherConfig;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;

/** Actual cached-Jupiter checks. Only inert synthetic fixtures belong on this classpath. */
public final class V41RankIterationSelectionChecks {
    private static final String CLASS =
            "com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.RecoveryProfileDeletionIT";
    private static final String METHOD = "v41RecoveryRejectsRankOnlyHistoryDrift";
    private static final String PARAMETERS = "java.lang.String, boolean, java.lang.String";
    private static final String TEMPLATE = "[engine:junit-jupiter]/[class:" + CLASS
            + "]/[test-template:" + METHOD + "(" + PARAMETERS + ")]";
    private static final String INITIALIZED = "v41.rank.synthetic.initialized";
    private static final String[] ROWS = {
            "C,false,REORDER", "C,true,REORDER", "en_US.utf8,false,REORDER", "en_US.utf8,true,REORDER",
            "C,false,V41_NOT_LATEST", "C,true,V41_NOT_LATEST", "en_US.utf8,false,V41_NOT_LATEST", "en_US.utf8,true,V41_NOT_LATEST",
            "C,false,OLDER_TAIL", "C,true,OLDER_TAIL", "en_US.utf8,false,OLDER_TAIL", "en_US.utf8,true,OLDER_TAIL"};

    public static void main(String[] args) throws Exception {
        require(args.length == 2 || args.length == 3, "Expected mode, exact synthetic classes root, optional rejection");
        Path root = Path.of(args[1]).toRealPath();
        for (Class<?> type : List.of(V41RankIterationSelectionChecks.class,
                V41RankIterationSelection.class, RecoveryProfileDeletionIT.class)) {
            require(Path.of(type.getProtectionDomain().getCodeSource().getLocation().toURI()).toRealPath()
                    .equals(root), "Unexpected synthetic class code origin");
            require(type.getClassLoader() == ClassLoader.getSystemClassLoader(), "Unexpected class loader");
        }
        require(RecoveryProfileDeletionIT.SYNTHETIC_ONLY, "Real original fixture is forbidden");
        require(System.getProperty(INITIALIZED) == null, "Metadata setup initialized synthetic fixture");
        if (args[0].equals("negative")) {
            require(args.length == 3, "Expected exact negative rejection reason");
            expectRejected(() -> V41RankIterationSelection.select("0"), args[2]);
            require(System.getProperty(INITIALIZED) == null, "Rejected declaration initialized synthetic fixture");
            System.out.println("SYNTHETIC_NEGATIVE_PASS reason=" + args[2]);
            return;
        }
        require(args.length == 2 && args[0].equals("positive"), "Unsupported runner mode");
        List<String> failures = new ArrayList<>();
        int passed = 0;
        check(() -> {
            for (String invalid : new String[] {null, "", "-1", "12", "00", "01", "04", "010", "+0", "+1",
                    " 1", "1 ", "1\n", "0,1", "1.0", "١", "2147483647"}) {
                expectRejected(() -> V41RankIterationSelection.select(invalid), "Expected one canonical V41 iteration index");
            }
            require(System.getProperty(INITIALIZED) == null, "Invalid index initialized synthetic fixture");
        }, "invalid-indices", failures);
        if (failures.isEmpty()) passed++;
        int before = failures.size();
        check(() -> expectRejected(() -> V41RankIterationSelection.verifyDeclaration(
                V41RankIterationSelectionChecks.class), "Unexpected original class"), "wrong-class", failures);
        if (before == failures.size()) passed++;
        for (int index = 0; index < ROWS.length; index++) {
            final int selected = index;
            before = failures.size();
            check(() -> require(V41RankIterationSelection.parseIndex(Integer.toString(selected)) == selected,
                    "Canonical rank12 index was not accepted exactly"), "canonical-index=" + index, failures);
            if (before == failures.size()) passed++;
        }
        before = failures.size();
        check(() -> {
            V41RankIterationSelection.verifyDeclaration(RecoveryProfileDeletionIT.class);
            V41RankIterationSelection.select("0");
            require(System.getProperty(INITIALIZED) == null, "Valid metadata selection initialized synthetic fixture");
        }, "valid-rank12-declaration", failures);
        if (before == failures.size()) passed++;
        for (int index = 0; index < ROWS.length; index++) {
            final int selected = index;
            before = failures.size();
            check(() -> verifyOneInvocation(selected), "row=" + index, failures);
            if (before == failures.size()) passed++;
        }
        System.out.println("SYNTHETIC_ONLY passed=" + passed + " failures=" + failures.size());
        failures.forEach(message -> System.out.println("ASSERTION_FAILURE " + message));
        require(failures.isEmpty(), "Rank12 selection assertions failed: " + failures);
    }

    private static void verifyOneInvocation(int index) throws Exception {
        var selector = V41RankIterationSelection.select(Integer.toString(index));
        RecoveryProfileDeletionIT.CALLBACKS.clear();
        var request = LauncherDiscoveryRequestBuilder.request().selectors(selector)
                .configurationParameter("junit.jupiter.execution.parallel.enabled", "false")
                .configurationParameter("junit.jupiter.extensions.autodetection.enabled", "false").build();
        var config = LauncherConfig.builder().enableTestEngineAutoRegistration(false)
                .enableTestExecutionListenerAutoRegistration(false)
                .enableLauncherSessionListenerAutoRegistration(false)
                .enableLauncherDiscoveryListenerAutoRegistration(false)
                .addTestEngines(new JupiterTestEngine()).build();
        var launcher = LauncherFactory.create(config);
        TestPlan plan = launcher.discover(request);
        var discovered = plan.getRoots().stream().flatMap(id -> plan.getDescendants(id).stream())
                .filter(id -> id.getUniqueId().equals(TEMPLATE)).toList();
        require(discovered.size() == 1, "Expected exact rank12 method template during actual discovery");
        checkMethodSource(discovered.getFirst());
        require(plan.countTestIdentifiers(TestIdentifier::isTest) == 0,
                "Parameterized invocations must remain dynamic before execution");
        require(RecoveryProfileDeletionIT.CALLBACKS.isEmpty(), "Discovery executed fixture body");
        var summary = new SummaryGeneratingListener();
        var callbacks = new Callbacks();
        launcher.execute(plan, callbacks, summary);
        require(RecoveryProfileDeletionIT.CALLBACKS.equals(List.of(ROWS[index])),
                "Expected exactly original row " + index + " but observed " + RecoveryProfileDeletionIT.CALLBACKS);
        var result = summary.getSummary();
        require(result.getTestsFoundCount() == 1 && result.getTestsStartedCount() == 1
                && result.getTestsSucceededCount() == 1 && result.getTestsFailedCount() == 0
                && result.getTestsSkippedCount() == 0 && result.getTestsAbortedCount() == 0
                && result.getContainersFailedCount() == 0 && result.getContainersAbortedCount() == 0,
                "Expected exactly one successful actual synthetic invocation");
        require(callbacks.statuses.equals(List.of(TestExecutionResult.Status.SUCCESSFUL)),
                "Unexpected synthetic finish statuses");
        String expectedId = TEMPLATE + "/[test-template-invocation:#" + (index + 1) + "]";
        require(callbacks.registered.size() == 1 && callbacks.started.size() == 1 && callbacks.finished.size() == 1,
                "The other eleven invocations must not register, start, or finish");
        String[] row = ROWS[index].split(",");
        String display = "V41 recovery order locale=\"" + row[0] + "\", restored=\"" + row[1]
                + "\", drift=\"" + row[2] + "\"";
        for (TestIdentifier id : List.of(callbacks.registered.getFirst(), callbacks.started.getFirst(),
                callbacks.finished.getFirst())) {
            require(id.getUniqueId().equals(expectedId), "Unexpected original invocation ordinal or ancestry");
            require(id.getParentId().orElseThrow().equals(TEMPLATE), "Unexpected parent template");
            require(id.getDisplayName().equals(display), "Unexpected quoted display name: " + id.getDisplayName());
            checkMethodSource(id);
        }
        System.out.println("SYNTHETIC_ROW_PASS index=" + index + " uniqueId=" + expectedId + " display=" + display);
    }

    private static void checkMethodSource(TestIdentifier id) {
        require(id.getSource().orElseThrow() instanceof MethodSource, "Missing direct method source");
        MethodSource source = (MethodSource) id.getSource().orElseThrow();
        require(source.getClassName().equals(CLASS) && source.getMethodName().equals(METHOD)
                && source.getMethodParameterTypes().equals(PARAMETERS), "Unexpected exact original method source");
    }

    private interface Checked { void run() throws Exception; }

    private static void check(Checked action, String label, List<String> failures) {
        try {
            action.run();
        } catch (IllegalArgumentException | AssertionError failure) {
            failures.add(label + " " + failure.getMessage());
        } catch (Exception failure) {
            throw new AssertionError("Unexpected setup/runtime error in " + label, failure);
        }
    }

    private static void expectRejected(Checked action, String expected) throws Exception {
        try {
            action.run();
        } catch (IllegalArgumentException failure) {
            require(!expected.equals("SIGNATURE_REJECTED") && failure.getMessage().startsWith(expected),
                    "Wrong rejection reason: " + failure.getMessage());
            return;
        } catch (NoSuchMethodException failure) {
            require(expected.equals("SIGNATURE_REJECTED"), "Unexpected missing original method signature");
            return;
        }
        throw new AssertionError("Expected rejection: " + expected);
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static final class Callbacks implements TestExecutionListener {
        final List<TestIdentifier> registered = new ArrayList<>();
        final List<TestIdentifier> started = new ArrayList<>();
        final List<TestIdentifier> finished = new ArrayList<>();
        final List<TestExecutionResult.Status> statuses = new ArrayList<>();
        @Override public void dynamicTestRegistered(TestIdentifier id) {
            if (id.isTest()) registered.add(id);
        }
        @Override public void executionStarted(TestIdentifier id) {
            if (id.isTest()) started.add(id);
        }
        @Override public void executionFinished(TestIdentifier id, TestExecutionResult result) {
            if (id.isTest()) {
                finished.add(id);
                statuses.add(result.getStatus());
            }
        }
    }
}
