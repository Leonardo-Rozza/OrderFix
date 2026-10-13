package com.leonardorozza.mvgrreparacionesbackend.testing.owned;

import java.lang.reflect.Method;
import com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.V41RankIterationSelection;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.TestFactory;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.TestTemplate;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.platform.engine.UniqueId;
import org.junit.platform.engine.support.descriptor.MethodSource;
import org.junit.platform.launcher.TestPlan;
import org.postgresql.util.LazyCleanerImpl;

/** PG-only inert runtime admission and conservative Thread-identity witness. This suite creates NO Boot context. */
public final class RecoveryRuntimeIsolation {
    private static final String PG_JAR = "/Users/leonardorozza/.m2/repository/org/postgresql/postgresql/42.7.10/postgresql-42.7.10.jar";
    private static final String PG_SHA = "cab1cd67cfa25c25de4348e532298028288a877ba01c77d1619fe45416193387";
    private static final String PG_ENTRY = "META-INF/versions/11/org/postgresql/util/LazyCleanerImpl.class";
    private static final String PG_ENTRY_SHA = "6b281c645d004a6f3875310b681bce2a689daa84952d14df4decff12f1127f26";
    private static final AtomicReference<Witness> CURRENT = new AtomicReference<>();
    private static volatile Map<String,Object> runtimeReport = Map.of("runtimeAdmissionComplete",false);
    private static Object retainedPgSingleton;
    private RecoveryRuntimeIsolation() { }

    record RuntimeEvidence(String pgOrigin,String pgJarSha,String pgEntryUrl,String pgEntrySha,
            String singletonClass,Object first,Object second,int javaFeature) { }

    static Map<String,Object> verifyRuntimeEvidence(RuntimeEvidence evidence) {
        require(evidence.javaFeature()==21,"Pinned Java21 is required.");
        require(PG_JAR.equals(evidence.pgOrigin())&&PG_SHA.equals(evidence.pgJarSha()),"PostgreSQL class origin/pin differs.");
        require(("jar:file:"+PG_JAR+"!/"+PG_ENTRY).equals(evidence.pgEntryUrl())&&PG_ENTRY_SHA.equals(evidence.pgEntrySha()),
                "Actual MR11 PostgreSQL cleaner resource differs.");
        require("org.postgresql.util.LazyCleanerImpl".equals(evidence.singletonClass())&&evidence.first()!=null&&evidence.first()==evidence.second(),
                "Actual cleaner singleton identity differs.");
        Map<String,Object> values=new LinkedHashMap<>();
        values.put("runtimeAdmissionComplete",true);values.put("javaFeature",evidence.javaFeature());
        values.put("pgCodeSource",evidence.pgOrigin());values.put("pgJarSha256",evidence.pgJarSha());
        values.put("pgActualResource",evidence.pgEntryUrl());values.put("pgActualResourceSha256",evidence.pgEntrySha());
        values.put("pgSingletonClass",evidence.singletonClass());values.put("pgSingletonStableIdentity",true);
        values.put("pgSingletonIdentityHash",System.identityHashCode(evidence.first()));
        return Collections.unmodifiableMap(values);
    }

    /** No JDBC driver/connection, application, Mockito or provider is initialized by this admission. */
    static synchronized void admitRuntimeBeforeDiscovery(Path reportRoot) throws Exception {
        Map<String,Object> argumentPolicy = verifyZeroAgentArguments(
                java.lang.management.ManagementFactory.getRuntimeMXBean().getInputArguments(), reportRoot);
        require(retainedPgSingleton==null,"Runtime admission cannot be repeated or moved after discovery.");
        Class<?> pg=LazyCleanerImpl.class;
        require(pg.getClassLoader()==RecoveryRuntimeIsolation.class.getClassLoader(),"Runtime class loader differs.");
        var source=pg.getProtectionDomain().getCodeSource();
        require(source!=null&&source.getLocation()!=null,"Runtime CodeSource is missing.");
        String origin=Path.of(source.getLocation().toURI()).toString();
        require(PG_JAR.equals(origin),"Cached PostgreSQL runtime origin differs.");
        String jarSha=digest(Files.readAllBytes(Path.of(origin)));
        require(PG_SHA.equals(jarSha),"Cached PostgreSQL jar bytes differ.");
        var resource=pg.getResource("LazyCleanerImpl.class");
        require(resource!=null&&("jar:file:"+PG_JAR+"!/"+PG_ENTRY).equals(resource.toExternalForm()),
                "Actual Java21 cleaner resource is not the pinned MR11 entry.");
        byte[] entry;
        try(var input=resource.openStream()){entry=input.readAllBytes();}
        require(entry.length==3831&&PG_ENTRY_SHA.equals(digest(entry)),"Actual cleaner entry bytes differ.");
        Map<Thread,StackTraceElement[]> before=Thread.getAllStackTraces();long started=System.nanoTime();
        Object first=LazyCleanerImpl.getInstance(),second=LazyCleanerImpl.getInstance();
        require(first.getClass()==pg,"Actual cleaner singleton class differs.");
        Map<String,Object> values=new LinkedHashMap<>(verifyRuntimeEvidence(new RuntimeEvidence(origin,jarSha,resource.toExternalForm(),digest(entry),
                first.getClass().getName(),first,second,Runtime.version().feature())));
        values.putAll(argumentPolicy);
        Map<Thread,StackTraceElement[]> after=Thread.getAllStackTraces();List<Map<String,Object>> newThreads=new ArrayList<>();
        for(var item:after.entrySet())if(!before.containsKey(item.getKey())){
            Map<String,Object> identity=new LinkedHashMap<>();identity.put("threadId",item.getKey().threadId());
            identity.put("threadIdentityHash",System.identityHashCode(item.getKey()));
            identity.put("frames",Arrays.stream(item.getValue()).map(StackTraceElement::toString).toList());
            newThreads.add(Collections.unmodifiableMap(identity));
        }
        // Exact initialization preceded discovery; these identities are not name/daemon exemptions.
        values.put("preInitializationThreadIds",before.keySet().stream().map(Thread::threadId).sorted().toList());
        values.put("postInitializationThreadIds",after.keySet().stream().map(Thread::threadId).sorted().toList());
        values.put("newThreadsDuringExactSingletonInitialization",List.copyOf(newThreads));
        values.put("singletonInitializationStartedNanos",started);values.put("runtimeAdmissionFinishedNanos",System.nanoTime());
        values.put("initializedBeforeSelectedDiscovery",true);retainedPgSingleton=first;
        runtimeReport=Collections.unmodifiableMap(values);
    }
    private static String digest(byte[] bytes)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}
    static Map<String,Object> runtimeReport(){return runtimeReport;}

    /** Exact parent-owned five-option JVM contract, not a scan for a few agent spellings. */
    static Map<String,Object> verifyZeroAgentArguments(List<String> arguments, Path reportRoot) {
        require(reportRoot != null && reportRoot.isAbsolute() && reportRoot.normalize().equals(reportRoot),
                "Explicit normalized parent report root required.");
        List<String> expected = List.of("-Xmx512m", "-Duser.home=" + reportRoot.resolve("home"),
                "-Djava.io.tmpdir=" + reportRoot.resolve("tmp"), "-Dfile.encoding=UTF-8",
                "-Xlog:class+init=info:file=" + reportRoot.resolve("class-init.log") + ":uptime,level,tags");
        require(expected.equals(arguments), "Only the exact zero-agent JVM argument contract is admitted.");
        return Map.of("runtimeInputArguments", List.copyOf(arguments), "zeroAgentPolicyAdmitted", true,
                "admissionMockitoWarmupPerformed", false);
    }

    static Map<String,List<String>> expectedDeclarations() {
        return Map.of(RecoveryV42CsvLauncher.SELECTED_METHOD + "(" + RecoveryV42CsvLauncher.SELECTED_PARAMETER_TYPES + ")",
                RecoveryV42CsvLauncher.ORDERED_CSV_SOURCE);
    }
    static void admitDeclared(Map<String,List<String>> methods) {
        require(expectedDeclarations().equals(methods), "Exactly the selected original signature and ordered twelve-row CsvSource are required.");
    }

    /** Pure controlled reflection; actual selected class loading remains false-initialize. */
    static void verifySelectedMethod(Method method, Timeout timeout) {
        require(timeout != null && timeout.value() == 120 && timeout.unit() == TimeUnit.SECONDS,
                "Original class Timeout120 changed.");
        require(RecoveryV42CsvLauncher.SELECTED_METHOD.equals(method.getName())
                && Arrays.equals(method.getParameterTypes(), new Class<?>[]{String.class, boolean.class, String.class})
                && method.getReturnType() == void.class && !method.isSynthetic()
                && method.isAnnotationPresent(ParameterizedTest.class)
                && Arrays.stream(method.getDeclaredAnnotations()).allMatch(annotation ->
                    annotation.annotationType() == ParameterizedTest.class || annotation.annotationType() == CsvSource.class),
                "Selected original method must remain the exact CSV12 parameterized test.");
        require(RecoveryV42CsvLauncher.PARAMETERIZED_NAME.equals(method.getAnnotation(ParameterizedTest.class).name()),
                "Original parameterized display name changed.");
        CsvSource csv = method.getAnnotation(CsvSource.class);
        require(csv != null && csv.textBlock().isEmpty() && !csv.useHeadersInDisplayName()
                && csv.quoteCharacter() == '\'' && csv.delimiter() == '\0' && csv.delimiterString().isEmpty()
                && csv.emptyValue().isEmpty() && csv.nullValues().length == 0
                && csv.maxCharsPerColumn() == 4096 && csv.ignoreLeadingAndTrailingWhitespace(),
                "Only the exact original ordered CSV12 rows and default CSV options are permitted.");
        admitDeclared(Map.of(method.getName() + "(" + RecoveryV42CsvLauncher.SELECTED_PARAMETER_TYPES + ")", List.of(csv.value())));
    }

    /** Metadata cannot initialize the selected fixture or release unrelated source-declared methods. */
    static void admitSelectedDeclarations() {
        try {
            Class<?> selected = Class.forName(RecoveryV42CsvLauncher.SELECTED_CLASS, false,
                    RecoveryRuntimeIsolation.class.getClassLoader());
            Method method = selected.getDeclaredMethod(RecoveryV42CsvLauncher.SELECTED_METHOD, String.class, boolean.class, String.class);
            V41RankIterationSelection.verifyDeclaration(selected);
            verifySelectedMethod(method, selected.getAnnotation(Timeout.class));
            Map<String,Object> values = new LinkedHashMap<>(runtimeReport);
            values.put("selectedClass", selected.getName()); values.put("selectedMethod", method.getName());
            values.put("selectedMethods", RecoveryV42CsvLauncher.SELECTED_METHODS);
            values.put("selectedParameterTypes", RecoveryV42CsvLauncher.SELECTED_PARAMETER_TYPES);
            values.put("selectionMarker", RecoveryV42CsvLauncher.SELECTION_MARKER);
            values.put("selectedCsvSource", List.of(method.getAnnotation(CsvSource.class).value()));
            values.put("selectedParameterizedName", method.getAnnotation(ParameterizedTest.class).name());
            values.put("selectedOriginalTimeoutSeconds", selected.getAnnotation(Timeout.class).value());
            values.put("selectedMetadataAdmittedWithoutInitialization", true);
            runtimeReport = Collections.unmodifiableMap(values);
        } catch (ReflectiveOperationException error) {
            throw new IllegalStateException("Selected original V41 CSV12 method unavailable.", error);
        }
    }

    /** Exactly one original CSV template and zero pre-execution tests, never predicted executed counts. */
    static void admitDiscoveredMethods(TestPlan plan) {
        require(plan.getRoots().size() == 1 && plan.getRoots().iterator().next().getUniqueId().equals("[engine:junit-jupiter]"),
                "Exactly the explicit Jupiter engine is required.");
        Set<String> discovered = new LinkedHashSet<>(); long tests = 0;
        for (var root : plan.getRoots()) for (var id : plan.getDescendants(root)) {
            if (id.isTest()) tests++;
            var segments = UniqueId.parse(id.getUniqueId()).getSegments();
            boolean template = segments.getLast().getType().equals("test-template");
            if (template) require(id.getSource().orElse(null) instanceof MethodSource, "Template source missing.");
            if (id.getSource().orElse(null) instanceof MethodSource method) {
                require(template && id.isContainer() && !id.isTest() && segments.size() == 3
                        && segments.getFirst().getType().equals("engine")
                        && segments.getFirst().getValue().equals("junit-jupiter")
                        && segments.get(1).getType().equals("class") && segments.get(1).getValue().equals(RecoveryV42CsvLauncher.SELECTED_CLASS)
                        && RecoveryV42CsvLauncher.SELECTED_CLASS.equals(method.getClassName()), "Foreign ordinary/invocation/class metadata denied.");
                String signature = method.getMethodName() + "(" + method.getMethodParameterTypes().replace(" ", "") + ")";
                require(expectedDeclarations().containsKey(signature), "Unexpected discovered source signature.");
                require(segments.getLast().getValue().replace(" ", "").equals(signature), "Template identity and source signature differ.");
                require(discovered.add(signature), "Duplicate selected template metadata.");
            }
        }
        require(tests == 0 && discovered.equals(expectedDeclarations().keySet()), "Only one unexecuted original preflight template is released.");
    }

    /** Called after explicit owner install/bootstrap/watchdog start, but before selected discovery. */
    static void captureBaselineBeforeDiscovery(){
        require(Boolean.TRUE.equals(runtimeReport.get("runtimeAdmissionComplete")),"Pinned PG admission must precede the worker baseline.");
        Witness witness=new Witness(threads(),RecoveryRuntimeIsolation::threads);
        require(CURRENT.compareAndSet(null,witness),"Selected worker baseline cannot be replaced.");
    }
    static void observe(){Witness witness=CURRENT.get();if(witness!=null)witness.observe();}
    static void beginCleanup(long deadline){Witness witness=CURRENT.get();if(witness!=null)witness.begin(deadline);}
    static void closeAndVerify(long deadline){
        Witness witness=CURRENT.get();require(witness!=null,"No pre-discovery worker baseline captured.");
        require(Boolean.TRUE.equals(witness.finish(deadline).get("applicationShutdownComplete")),"Actual selected worker shutdown was not proven complete.");
    }
    static Map<String,Object> report(){Witness witness=CURRENT.get();return witness==null?Map.of("contextCaptured",false,"applicationShutdownComplete",false):witness.report;}
    private static Set<Thread> threads(){return Set.copyOf(Thread.getAllStackTraces().keySet());}

    static final class Witness {
        private final long baselineCaptured=System.nanoTime();
        private final Set<Thread> baseline;
        private final Supplier<Set<Thread>> threads;
        private final Set<Thread> observed=new LinkedHashSet<>();
        private boolean begun,finished;
        private long started,cleanupDeadline=Long.MAX_VALUE;
        private volatile Map<String,Object> report=Map.of("contextCaptured",false,"applicationShutdownComplete",false);
        Witness(Set<Thread> baseline,Supplier<Set<Thread>> threads){this.baseline=Set.copyOf(baseline);this.threads=threads;}
        void observe(){synchronized(observed){for(Thread thread:threads.get())if(!baseline.contains(thread)&&thread!=Thread.currentThread())observed.add(thread);}}
        private Set<Thread> workers(){synchronized(observed){return Set.copyOf(observed);}}
        synchronized void begin(long deadline){cleanupDeadline=Math.min(cleanupDeadline,deadline);if(begun)return;begun=true;started=System.nanoTime();observe();}
        synchronized Map<String,Object> finish(long deadline){
            if(finished)return report;
            begin(deadline);finished=true;deadline=cleanupDeadline;
            long joinsStarted=System.nanoTime();observe();boolean joined=true;
            for(Thread worker:workers())joined=join(worker,deadline)&&joined;
            observe();
            // A worker discovered after the join snapshot is not silently accepted; it must also actually retire.
            for(Thread worker:workers())joined=join(worker,deadline)&&joined;
            observe();List<String> live=workers().stream().filter(Thread::isAlive).map(t->t.threadId()+":"+t.getName()).toList();
            long completed=System.nanoTime();boolean passed=joined&&live.isEmpty()&&completed<=deadline;
            Map<String,Object> values=new LinkedHashMap<>();values.put("contextCaptured",false);values.put("bootContextExpected",false);
            values.put("applicationBaselineCapturedNanos",baselineCaptured);
            values.put("applicationBaselineThreadIds",baseline.stream().map(Thread::threadId).sorted().toList());
            values.put("applicationBaselineThreadIdentityHashes",baseline.stream().map(System::identityHashCode).sorted().toList());
            values.put("observedNewWorkers",workers().size());values.put("observedNewWorkerThreadIds",workers().stream().map(Thread::threadId).sorted().toList());
            values.put("observedNewWorkersJoined",joined&&live.isEmpty());values.put("newLiveWorkers",live);
            values.put("applicationExhaustiveJoinsStartedNanos",joinsStarted);values.put("applicationCleanupStartedNanos",started);
            values.put("applicationCleanupDeadlineNanos",deadline);values.put("applicationCleanupFinishedNanos",completed);
            values.put("applicationCleanupDurationNanos",completed-started);values.put("applicationShutdownComplete",passed);
            report=Collections.unmodifiableMap(values);return report;
        }
        private static boolean join(Thread thread,long deadline){
            if(!thread.isAlive())return true;long remaining=deadline-System.nanoTime();if(remaining<=0)return false;
            try{TimeUnit.NANOSECONDS.timedJoin(thread,remaining);}catch(InterruptedException error){Thread.currentThread().interrupt();return false;}
            return !thread.isAlive();
        }
    }
    private static void require(boolean valid,String message){if(!valid)throw new IllegalStateException(message);}
}
