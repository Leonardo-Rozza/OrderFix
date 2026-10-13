package com.leonardorozza.mvgrreparacionesbackend.testing.owned;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.V41RankIterationSelection;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.engine.JupiterTestEngine;
import org.junit.platform.commons.PreconditionViolationException;
import org.junit.platform.engine.TestExecutionResult;
import org.junit.platform.engine.discovery.DiscoverySelectors;
import org.junit.platform.engine.support.descriptor.ClassSource;
import org.junit.platform.engine.support.descriptor.MethodSource;
import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.TestExecutionListener;
import org.junit.platform.launcher.TestIdentifier;
import org.junit.platform.launcher.TestPlan;
import org.junit.platform.launcher.core.LauncherConfig;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

/** One explicit engine and one named suite. No owner is discovered from ambient state. */
public final class RecoveryV42CsvLauncher {
    public static final String SELECTED_CLASS =
        "com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.RecoveryProfileDeletionIT";
    public static final String SELECTED_METHOD = "v41RecoveryRejectsRankOnlyHistoryDrift";
    public static final String SELECTION_MARKER = "SINGLE_ORIGINAL_V41_RANK_HISTORY_CSV_CASE";
    public static final List<String> SELECTED_METHODS = List.of(SELECTED_METHOD);
    public static final String SELECTED_PARAMETER_TYPES = "java.lang.String,boolean,java.lang.String";
    public static final List<String> ORDERED_CSV_SOURCE = List.of(
            "C,false,REORDER", "C,true,REORDER", "en_US.utf8,false,REORDER", "en_US.utf8,true,REORDER",
            "C,false,V41_NOT_LATEST", "C,true,V41_NOT_LATEST", "en_US.utf8,false,V41_NOT_LATEST", "en_US.utf8,true,V41_NOT_LATEST",
            "C,false,OLDER_TAIL", "C,true,OLDER_TAIL", "en_US.utf8,false,OLDER_TAIL", "en_US.utf8,true,OLDER_TAIL");
    public static final String PARAMETERIZED_NAME = "V41 recovery order locale={0}, restored={1}, drift={2}";
    private static final List<String> RANK_KINDS = List.of("REORDER", "V41_NOT_LATEST", "OLDER_TAIL");
    public static final List<String> EXPECTED_DISPLAY_NAMES = List.of(
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

    static String rankKind(int originalRowIndex) {
        if (originalRowIndex < 0 || originalRowIndex > 11)
            throw new IllegalArgumentException("One original V41 rank row index from 0 through 11 required.");
        return RANK_KINDS.get(originalRowIndex / 4);
    }
    private RecoveryV42CsvLauncher() { }

    interface Lifecycle {
        void install() throws Exception;
        void execute() throws Exception;
        void close() throws Exception;
        void clear() throws Exception;
    }

    /** This shared ordering seam is exercised without any engine or selected class in pure unit tests. */
    static void runOwned(Lifecycle lifecycle) throws Exception {
        Throwable failure=null;boolean installed=false;
        try { lifecycle.install();installed=true;lifecycle.execute(); }
        catch(Throwable error) { failure=error; }
        finally {
            try { lifecycle.close(); } catch(Throwable error) { failure=combine(failure,error); }
            if(installed)try { lifecycle.clear(); } catch(Throwable error) { failure=combine(failure,error); }
        }
        if(failure instanceof Error error)throw error;
        if(failure instanceof Exception error)throw error;
        if(failure!=null)throw new IllegalStateException(failure);
    }
    private static Throwable combine(Throwable first,Throwable next) {
        if(first==null)return next;if(first!=next)first.addSuppressed(next);return first;
    }

    /** Parent only, after the independent physical release and frozen full-classpath gates. */
    public static void main(String[] args) throws Exception {
        if(args.length!=3)throw new IllegalArgumentException("Expected frozen spec path, SHA256 and new report path.");
        Path report=Path.of(args[2]);
        if(!report.isAbsolute() || Files.exists(report) || !Files.isDirectory(report.getParent()))
            throw new IllegalArgumentException("Explicit fresh report path required.");
        RecoveryOwnedOwnerDriver.LaunchSpec spec = RecoveryOwnedOwnerDriver.readFrozenSpec(Path.of(args[0]), args[1]);
        final int originalRowIndex = RecoveryOwnedOwnerDriver.selectedV41Row(spec);
        RecoveryRuntimeIsolation.admitRuntimeBeforeDiscovery(report.getParent());
        // Exact original declaration is admitted without fixture initialization BEFORE owner launch.
        RecoveryRuntimeIsolation.admitSelectedDeclarations();
        RecoveryOwnedOwnerDriver driver = RecoveryOwnedOwnerDriver.launch(spec);
        SummaryGeneratingListener summary=new SummaryGeneratingListener();
        SelectedExecutionWitness selectedExecution=new SelectedExecutionWitness(originalRowIndex);
        Thread main=Thread.currentThread();
        Watchdog watchdog=new Watchdog(driver.lifetimeDeadlineNanos(),expiredWatchdog->{
            Throwable cleanupFailure=null;
            try {closeApplicationAndOwner(driver, expiredWatchdog);}catch(Throwable error){cleanupFailure=error;}
            SummaryCapture captured=captureSummary(summary,cleanupFailure);
            Map<String,Object> marker=counts(captured.summary());marker.put("watchdogExpired",true);
            marker.put("summaryAvailable",captured.summary()!=null);
            marker.put("selectedClass",SELECTED_CLASS); marker.put("selectedMethod",SELECTED_METHOD);
            marker.put("selectedParameterTypes",SELECTED_PARAMETER_TYPES);marker.put("selectedMethods",SELECTED_METHODS);
            marker.put("selectionMarker",SELECTION_MARKER);marker.put("orderedCsvSource",ORDERED_CSV_SOURCE);
            marker.put("originalRowIndex",originalRowIndex);marker.put("originalInvocationOrdinal",originalRowIndex+1);
            marker.put("rankKind", rankKind(originalRowIndex));
            marker.put("selectedExecution",selectedExecution.report());
            marker.put("applicationShutdown",RecoveryRuntimeIsolation.report());
            marker.put("runtimeAdmission",RecoveryRuntimeIsolation.runtimeReport());
            marker.put("cleanupComplete",driver.cleanupComplete());marker.put("quiescent",driver.quiescent());
            marker.put("failure",captured.failure()==null?null:stack(captured.failure()));
            try(var output=Files.newOutputStream(Path.of(report+".watchdog"),StandardOpenOption.CREATE_NEW)){
                new ObjectMapper().writeValue(output,marker);
                Files.write(Path.of(report+".owner-stderr"),driver.ownerStderr(),StandardOpenOption.CREATE_NEW);
            }
            catch(Exception error){error.printStackTrace(System.err);}
            main.interrupt();
            // A stuck application cannot extend 180s per phase or the fixed owner lifetime.
            // Nonzero halt is failure evidence, never a successful quiescence assertion.
            Runtime.getRuntime().halt(2);
        });
        Throwable failure=null;boolean watchdogJoined=false;
        try {
            watchdog.start();
            runOwned(new Lifecycle(){
                public void install(){RecoveryPostgreSQLFixture.installOwner(driver);}
                public void execute(){RecoveryRuntimeIsolation.captureBaselineBeforeDiscovery();executeSelected(summary,selectedExecution,watchdog);}
                public void close(){closeApplicationAndOwner(driver, watchdog);}
                public void clear(){RecoveryPostgreSQLFixture.clearOwner(driver);}
            });
        } catch(Throwable error){failure=error;}
        finally {
            try { closeApplicationAndOwner(driver, watchdog); } catch(Throwable error) { failure=combine(failure,error); }
            watchdogJoined=watchdog.stopAndJoin(driver.cleanupDeadlineNanos());
            if(!watchdogJoined)failure=combine(failure,new IllegalStateException("Watchdog did not join before cleanup deadline."));
        }
        SummaryCapture captured=captureSummary(summary,failure);
        TestExecutionSummary result=captured.summary();failure=captured.failure();
        Map<String,Object> receipt=counts(result);
        receipt.put("summaryAvailable",result!=null);
        receipt.put("selectedClass",SELECTED_CLASS);receipt.put("selectedMethod",SELECTED_METHOD);
        receipt.put("selectedParameterTypes",SELECTED_PARAMETER_TYPES);receipt.put("selectedMethods",SELECTED_METHODS);
        receipt.put("selectionMarker",SELECTION_MARKER);receipt.put("orderedCsvSource",ORDERED_CSV_SOURCE);
        receipt.put("originalRowIndex",originalRowIndex);receipt.put("originalInvocationOrdinal",originalRowIndex+1);
        receipt.put("rankKind", rankKind(originalRowIndex));
        receipt.put("selectedExecution",selectedExecution.report());receipt.put("cleanupComplete",driver.cleanupComplete());
        receipt.put("processWorkersQuiescent",driver.quiescent());receipt.put("watchdogJoined",watchdogJoined);
        receipt.put("launcherFailure",failure==null?null:stack(failure));
        List<String> testFailures=new ArrayList<>();
        if(result!=null)for(var item:result.getFailures())testFailures.add(item.getTestIdentifier().getUniqueId()+"\n"+stack(item.getException()));
        receipt.put("testFailures",testFailures);
        receipt.put("applicationShutdown",RecoveryRuntimeIsolation.report());
        receipt.put("runtimeAdmission",RecoveryRuntimeIsolation.runtimeReport());
        Files.write(Path.of(report+".owner-stderr"),driver.ownerStderr(),StandardOpenOption.CREATE_NEW);
        try(var output=Files.newOutputStream(report,StandardOpenOption.CREATE_NEW)){new ObjectMapper().writeValue(output,receipt);}
        boolean passed=failure==null && exactTestCounts(result) && selectedExecution.complete() && driver.cleanupComplete() && driver.quiescent() && watchdogJoined
            && Boolean.TRUE.equals(RecoveryRuntimeIsolation.report().get("applicationShutdownComplete"));
        System.out.println(new ObjectMapper().writeValueAsString(receipt));
        System.exit(passed?0:1);
    }

    static boolean exactTestCounts(TestExecutionSummary result) {
        return result != null && result.getTestsFoundCount() == 1 && result.getTestsStartedCount() == 1
                && result.getTestsSucceededCount() == 1 && result.getTestsFailedCount() == 0
                && result.getTestsSkippedCount() == 0 && result.getTestsAbortedCount() == 0
                && result.getContainersFailedCount() == 0 && result.getContainersAbortedCount() == 0;
    }

    interface ShutdownLifecycle {
        long beginDeadline();
        long currentDeadline();
        void beginApplication(long deadline);
        void closeOwner();
        boolean joinWatchdog(long deadline);
        void finishApplication(long deadline);
    }

    static void finishShutdown(ShutdownLifecycle lifecycle) {
        long deadline = lifecycle.beginDeadline();
        Throwable failure = null;
        try { lifecycle.beginApplication(deadline); }
        catch (Throwable error) { failure = error; }
        // Owner close exchanges, EOF/process/channel joins must not wait behind exhaustive application joins.
        try { lifecycle.closeOwner(); }
        catch (Throwable error) { failure = combine(failure, error); }
        try {
            if (!lifecycle.joinWatchdog(Math.min(deadline, lifecycle.currentDeadline())))
                throw new IllegalStateException("Watchdog did not join before cleanup deadline.");
        } catch (Throwable error) { failure = combine(failure, error); }
        try { lifecycle.finishApplication(Math.min(deadline, lifecycle.currentDeadline())); }
        catch (Throwable error) { failure = combine(failure, error); }
        if (failure instanceof Error error) throw error;
        if (failure instanceof RuntimeException error) throw error;
        if (failure != null) throw new IllegalStateException(failure);
    }

    private static void closeApplicationAndOwner(RecoveryOwnedOwnerDriver driver, Watchdog watchdog) {
        finishShutdown(new ShutdownLifecycle() {
            public long beginDeadline() { return driver.beginApplicationCleanup(); }
            public long currentDeadline() { return driver.cleanupDeadlineNanos(); }
            public void beginApplication(long deadline) { RecoveryRuntimeIsolation.beginCleanup(deadline); }
            public void closeOwner() { driver.close(); }
            public boolean joinWatchdog(long deadline) { return watchdog.stopAndJoin(deadline); }
            public void finishApplication(long deadline) { RecoveryRuntimeIsolation.closeAndVerify(deadline); }
        });
    }

    /** Called only after installOwner succeeds. Unit tests never call this physical entry. */
    private static void executeSelected(SummaryGeneratingListener summary,SelectedExecutionWitness selectedExecution,Watchdog watchdog) {
        RecoveryRuntimeIsolation.admitSelectedDeclarations();
        LauncherConfig config=LauncherConfig.builder()
            .enableLauncherSessionListenerAutoRegistration(false)
            .enableLauncherDiscoveryListenerAutoRegistration(false)
            .enableTestExecutionListenerAutoRegistration(false)
            .enableTestEngineAutoRegistration(false)
            .enablePostDiscoveryFilterAutoRegistration(false)
            .addTestEngines(new JupiterTestEngine()).build();
        Launcher launcher=LauncherFactory.create(config);
        var request=configuredDiscoveryRequest(selectedExecution.originalRowIndex).build();
        TestPlan plan=launcher.discover(request);
        if(plan.getRoots().size()!=1 || !plan.getRoots().iterator().next().getUniqueId().equals("[engine:junit-jupiter]"))
            throw new IllegalStateException("Discovery includes an unexpected engine.");
        for(TestIdentifier root:plan.getRoots())for(TestIdentifier id:plan.getDescendants(root)) {
            id.getSource().ifPresent(source->{
                String name=source instanceof ClassSource c?c.getClassName():source instanceof MethodSource m?m.getClassName():null;
                if(name!=null && !SELECTED_CLASS.equals(name))throw new IllegalStateException("Discovery includes another class.");
            });
        }
        // Only the original CSV template is released; the pinned selector permits exactly its chosen invocation.
        // The separate callback witness retains actual identities/displays/source lineage, not Java arguments.
        RecoveryRuntimeIsolation.admitDiscoveredMethods(plan);
        selectedExecution.bindTemplate(plan);
        launcher.execute(plan,summary,new TestExecutionListener(){
            @Override public void executionStarted(TestIdentifier id){RecoveryRuntimeIsolation.observe();if(id.isTest())watchdog.arm();selectedExecution.started(id);}
            @Override public void executionFinished(TestIdentifier id,TestExecutionResult result){RecoveryRuntimeIsolation.observe();if(id.isTest())watchdog.arm();selectedExecution.finished(id,result);}
        });
    }
    static LauncherDiscoveryRequestBuilder configuredDiscoveryRequest(int originalRowIndex) {
        org.junit.platform.engine.DiscoverySelector selector;
        try { selector = V41RankIterationSelection.select(Integer.toString(originalRowIndex)); }
        catch (ReflectiveOperationException error) { throw new IllegalStateException("Original V41 declaration unavailable.", error); }
        return LauncherDiscoveryRequestBuilder.request().selectors(selector)
            .enableImplicitConfigurationParameters(false)
            .configurationParameter("junit.jupiter.extensions.autodetection.enabled","false")
            .configurationParameter("junit.jupiter.execution.parallel.enabled","false")
            .configurationParameter("junit.jupiter.execution.parallel.mode.default","same_thread")
            .configurationParameter("junit.jupiter.execution.parallel.mode.classes.default","same_thread")
            .configurationParameter("junit.platform.discovery.listener.default","abortOnFailure");
    }

    /** Actual invocation observations, not argument introspection or a discovery-count substitution. */
    static final class SelectedExecutionWitness {
        private final int originalRowIndex;
        SelectedExecutionWitness(int originalRowIndex) {
            if (originalRowIndex < 0 || originalRowIndex > 11)
                throw new IllegalArgumentException("One original V41 rank row index from 0 through 11 required.");
            this.originalRowIndex = originalRowIndex;
        }
        private String admittedTemplate;
        private MethodSource admittedTemplateSource;
        private final List<Map<String,Object>> started = new ArrayList<>();
        private final List<Map<String,Object>> finished = new ArrayList<>();
        private final List<Map<String,Object>> succeeded = new ArrayList<>();
        private final List<String> violations = new ArrayList<>();

        synchronized void bindTemplate(TestPlan plan) {
            if (admittedTemplate != null) throw new IllegalStateException("Callback template cannot be rebound.");
            RecoveryRuntimeIsolation.admitDiscoveredMethods(plan);
            for (var root : plan.getRoots()) for (var id : plan.getDescendants(root)) {
                if (id.getSource().orElse(null) instanceof MethodSource source) {
                    admittedTemplate = id.getUniqueId();
                    admittedTemplateSource = source;
                }
            }
            if (admittedTemplate == null) throw new IllegalStateException("No exact selected template admitted.");
        }
        private Map<String,Object> observation(TestIdentifier id) {
            if (!id.isTest()) return null;
            var unique = org.junit.platform.engine.UniqueId.parse(id.getUniqueId());
            var segments = unique.getSegments();
            if (admittedTemplate == null || segments.size() != 4
                    || !segments.getFirst().getType().equals("engine")
                    || !segments.getFirst().getValue().equals("junit-jupiter")
                    || !segments.get(1).getType().equals("class")
                    || !SELECTED_CLASS.equals(segments.get(1).getValue())
                    || !segments.get(2).getType().equals("test-template")
                    || !segments.getLast().getType().equals("test-template-invocation")
                    || !segments.getLast().getValue().equals("#" + (originalRowIndex + 1))) {
                violations.add("Unexpected executed invocation identity: " + id.getUniqueId());
                return null;
            }
            String ancestor = org.junit.platform.engine.UniqueId.forEngine(segments.getFirst().getValue())
                    .append(segments.get(1).getType(), segments.get(1).getValue())
                    .append(segments.get(2).getType(), segments.get(2).getValue()).toString();
            if (!admittedTemplate.equals(ancestor)) {
                violations.add("Invocation ancestor differs from admitted template: " + id.getUniqueId());
                return null;
            }
            int index = Integer.parseInt(segments.getLast().getValue().substring(1));
            if (!EXPECTED_DISPLAY_NAMES.get(index - 1).equals(id.getDisplayName())) {
                violations.add("Observed display differs for " + id.getUniqueId() + ":" + id.getDisplayName());
                return null;
            }
            MethodSource source;
            String evidence;
            var actual = id.getSource();
            if (actual.isPresent()) {
                if (!(actual.get() instanceof MethodSource direct)) {
                    violations.add("Foreign invocation source: " + id.getUniqueId());
                    return null;
                }
                source = direct; evidence = "DIRECT_METHOD_SOURCE";
            } else {
                source = admittedTemplateSource; evidence = "EXACT_ADMITTED_TEMPLATE_ANCESTOR";
            }
            if (!SELECTED_CLASS.equals(source.getClassName()) || !SELECTED_METHOD.equals(source.getMethodName())
                    || !SELECTED_PARAMETER_TYPES.equals(source.getMethodParameterTypes().replace(" ", ""))) {
                violations.add("Executed source signature differs: " + id.getUniqueId());
                return null;
            }
            return Map.of("uniqueId", id.getUniqueId(), "invocationIndex", index,
                    "observedDisplayName", id.getDisplayName(), "templateUniqueId", ancestor,
                    "sourceEvidence", evidence, "methodSource", Map.of("className", source.getClassName(),
                    "methodName", source.getMethodName(), "methodParameterTypes", source.getMethodParameterTypes()));
        }
        private boolean contains(List<Map<String,Object>> observations, String id) {
            return observations.stream().anyMatch(row -> id.equals(row.get("uniqueId")));
        }
        synchronized void started(TestIdentifier id) {
            var row = observation(id);
            if (row == null) return;
            if (contains(started, id.getUniqueId())) violations.add("Duplicate started invocation: " + id.getUniqueId());
            started.add(row);
        }
        synchronized void finished(TestIdentifier id, TestExecutionResult result) {
            var row = observation(id);
            if (row == null) return;
            var start = started.stream().filter(item -> id.getUniqueId().equals(item.get("uniqueId"))).findFirst();
            if (start.isEmpty() || !start.get().equals(row) || contains(finished, id.getUniqueId()))
                violations.add("Missing/changed start or duplicate finish: " + id.getUniqueId());
            finished.add(row);
            if (result.getStatus() == TestExecutionResult.Status.SUCCESSFUL) succeeded.add(row);
            else violations.add("Non-successful selected invocation: " + id.getUniqueId() + ":" + result.getStatus());
        }
        private boolean exact(List<Map<String,Object>> rows) {
            return rows.size() == 1 && rows.stream().map(row -> row.get("uniqueId")).distinct().count() == 1
                    && new java.util.HashSet<>(rows.stream().map(row -> row.get("invocationIndex")).toList())
                    .equals(java.util.Set.of(originalRowIndex + 1));
        }
        synchronized boolean complete() {
            return admittedTemplate != null && violations.isEmpty() && exact(started) && exact(finished) && exact(succeeded);
        }
        synchronized Map<String,Object> report() {
            Map<String,Object> values = new LinkedHashMap<>();
            values.put("selectedClass", SELECTED_CLASS); values.put("selectedMethod", SELECTED_METHOD);
            values.put("selectedParameterTypes", SELECTED_PARAMETER_TYPES); values.put("selectionMarker", SELECTION_MARKER);
            values.put("expectedCsvSource", ORDERED_CSV_SOURCE); values.put("expectedDisplayNames", EXPECTED_DISPLAY_NAMES);
            values.put("originalRowIndex", originalRowIndex); values.put("originalInvocationOrdinal", originalRowIndex + 1);
            values.put("rankKind", rankKind(originalRowIndex));
            values.put("admittedTemplateUniqueId", admittedTemplate);
            values.put("startedInvocations", List.copyOf(started)); values.put("finishedInvocations", List.copyOf(finished));
            values.put("succeededInvocations", List.copyOf(succeeded)); values.put("violations", List.copyOf(violations));
            values.put("complete", complete());
            return java.util.Collections.unmodifiableMap(values);
        }
    }

    record SummaryCapture(TestExecutionSummary summary, Throwable failure) { }

    static SummaryCapture captureSummary(SummaryGeneratingListener listener, Throwable original) {
        try {
            return new SummaryCapture(listener.getSummary(), original);
        } catch (PreconditionViolationException unavailable) {
            if ("No tests have yet been executed".equals(unavailable.getMessage())) {
                return new SummaryCapture(null, original);
            }
            return new SummaryCapture(null, combine(original, unavailable));
        } catch (Throwable reportingFailure) {
            return new SummaryCapture(null, combine(original, reportingFailure));
        }
    }

    static Map<String,Object> counts(TestExecutionSummary result) {
        Map<String,Object> values=new LinkedHashMap<>();
        values.put("testsFound",result==null?0:result.getTestsFoundCount());values.put("testsStarted",result==null?0:result.getTestsStartedCount());
        values.put("testsSucceeded",result==null?0:result.getTestsSucceededCount());values.put("testsFailed",result==null?0:result.getTestsFailedCount());
        values.put("testsSkipped",result==null?0:result.getTestsSkippedCount());values.put("testsAborted",result==null?0:result.getTestsAbortedCount());
        values.put("containersFailed",result==null?0:result.getContainersFailedCount());values.put("containersAborted",result==null?0:result.getContainersAbortedCount());
        return values;
    }
    private static String stack(Throwable error) {StringWriter text=new StringWriter();error.printStackTrace(new PrintWriter(text));return text.toString();}

    static final class Watchdog {
        private final long horizon;
        private final java.util.function.Consumer<Watchdog> expired;
        private final AtomicBoolean stopped=new AtomicBoolean();
        private final Thread thread;
        private long phaseDeadline;
        Watchdog(long horizon,java.util.function.Consumer<Watchdog> expired){this.horizon=horizon;this.expired=expired;arm();thread=new Thread(this::watch,"owned-recovery-watchdog");thread.setDaemon(true);}
        synchronized void arm(){phaseDeadline=Math.min(horizon,System.nanoTime()+TimeUnit.SECONDS.toNanos(180));notifyAll();}
        void start(){thread.start();}
        private void watch(){
            try {
                synchronized(this){while(!stopped.get()){
                    long remaining=phaseDeadline-System.nanoTime();if(remaining<=0)break;
                    TimeUnit.NANOSECONDS.timedWait(this,remaining);
                }}
                if(!stopped.get())expired.accept(this);
            }catch(InterruptedException error){if(!stopped.get()){Thread.currentThread().interrupt();expired.accept(this);}}
        }
        boolean stopAndJoin(long deadline){
            stopped.set(true);synchronized(this){notifyAll();}thread.interrupt();
            // The expiry path cannot join itself; it remains an honest nonzero watchdog failure.
            if (Thread.currentThread() == thread) return false;
            try {long remaining=deadline-System.nanoTime();if(remaining>0)TimeUnit.NANOSECONDS.timedJoin(thread,remaining);}
            catch(InterruptedException error){Thread.currentThread().interrupt();return false;}
            return !thread.isAlive();
        }
    }
}
