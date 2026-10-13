package com.leonardorozza.mvgrreparacionesbackend.testing.owned;

import static com.leonardorozza.mvgrreparacionesbackend.testing.owned.OwnedFixtureProtocol.*;
import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.StreamReadFeature;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/** Explicit, single-flight owner port. The only launch input is a parent-frozen local spec. */
public final class RecoveryOwnedOwnerDriver implements Owner, AutoCloseable {
    public static final String PROTOCOL = "ordenfix-owned-pg/1";
    private static final long SECOND = TimeUnit.SECONDS.toNanos(1);
    private static final ObjectMapper JSON = new ObjectMapper(JsonFactory.builder()
        .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION).build())
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS);
    private final OwnerProcessChannel channel;
    private final Binding expected;
    private final long launchDeadline;
    private final long lifetimeDeadline;
    private final AtomicLong cleanupDeadline = new AtomicLong(Long.MAX_VALUE);
    private Binding binding;
    private Handle handle;
    private StartRequest request;
    private long sequence;
    private boolean tainted;
    private boolean closed;
    private boolean cleanupComplete;
    private StopResult stopped;
    private StartRequest stopRequest;
    private Handle stopHandle;
    private String diagnostic = "";
    private Double ownerLaunch;
    private Double ownerFirstStop;
    private Double ownerCleanup;
    private double ownerFinished = -1;

    private RecoveryOwnedOwnerDriver(Process process, Binding expected, long started) {
        this.expected = expected;
        launchDeadline = started + 60 * SECOND;
        lifetimeDeadline = started + 240 * SECOND;
        channel = new OwnerProcessChannel(process, 2 * 1024 * 1024, 64 * 1024);
        try {
            binding = parseBinding(rpc("bootstrap", Map.of(), launchDeadline));
            if (!sameBinding(binding, expected) || !id(binding.bootstrapNetworkId()))
                throw invalid("Bootstrap binding differs from frozen parent values.");
        } catch (RuntimeException error) { emergency(error); throw error; }
    }

    /** Package-private injection accepts only an already supplied Process; unit tests supply memory pipes. */
    static RecoveryOwnedOwnerDriver fromProcess(Process process, Binding expected, long started) {
        return new RecoveryOwnedOwnerDriver(process, expected, started);
    }

    public record LaunchSpec(boolean enabled, List<String> argv, Map<String,String> environment,
                             String cwd, Map<String,String> sourcePins, Binding expectedBinding) {
        public LaunchSpec { argv=List.copyOf(argv); environment=Map.copyOf(environment); sourcePins=Map.copyOf(sourcePins); }
    }

    public static LaunchSpec readFrozenSpec(Path path, String sha256) throws IOException {
        verifyFile(path, sha256);
        if (Files.size(path) > 65536) throw new IOException("Launch spec cap exceeded.");
        JsonNode node = JSON.readTree(Files.readAllBytes(path));
        keys(node,"enabled","argv","environment","cwd","sourcePins","expectedBinding");
        return new LaunchSpec(bool(node,"enabled"), strings(node.get("argv")), stringMap(node.get("environment")),
            text(node,"cwd"), stringMap(node.get("sourcePins")), parseBinding(node.get("expectedBinding")));
    }

    /** One immutable row source: the canonical SOURCE-pinned owner allowlist, never a CLI index. */
    static int selectedV41Row(LaunchSpec spec) throws IOException {
        Path root = Path.of(spec.cwd());
        if (!root.isAbsolute() || !root.normalize().equals(root)
                || !Files.isDirectory(root, LinkOption.NOFOLLOW_LINKS))
            throw new IOException("Canonical owner directory required for V41 selection.");
        Path allowlist = root.resolve("exec-allowlist.json");
        String pin = spec.sourcePins().get(allowlist.toString());
        requireBoundedRegular(allowlist, 65536);
        verifyFile(allowlist, pin);
        byte[] bytes = Files.readAllBytes(allowlist);
        if (bytes.length > 65536 || !pin.equals(sha256(bytes)))
            throw new IOException("V41 allowlist changed during pinned read.");
        JsonNode metadata = JSON.readTree(bytes);
        if (metadata == null || !metadata.isObject())
            throw new IOException("Exact V41 allowlist object required.");
        JsonNode row = metadata.get("originalRowIndex");
        if (row == null || !row.isIntegralNumber() || !row.canConvertToInt()
                || row.intValue() < 0 || row.intValue() > 11)
            throw new IOException("One genuine original V41 row index required.");
        int index = row.intValue();
        if (!expectedV41Metadata(index).equals(metadata))
            throw new IOException("Fixed V41 source/declaration/row/rank-kind/no-clone-plan metadata differs.");
        Path original = Path.of(V41_ORIGINAL_SOURCE);
        requireBoundedRegular(original, 59145);
        if (Files.size(original) != 59145)
            throw new IOException("Original V41 source size differs.");
        verifyFile(original, V41_ORIGINAL_SHA);
        return index;
    }

    private static final String V41_ORIGINAL_SOURCE =
            "/private/tmp/ordenfix-pro-review-chain-fueuys_0/source/src/test/java/"
            + "com/leonardorozza/mvgrreparacionesbackend/cuenta/recovery/RecoveryProfileDeletionIT.java";
    private static final String V41_ORIGINAL_SHA =
            "40371265d3cd628985bf2bf40a29c2b5a755a2fed15ba6c857c69c9da3df750e";
    private static JsonNode expectedV41Metadata(int index) {
        List<String> steps = new ArrayList<>();
        List<Integer> tokens = new ArrayList<>();
        String prefix = "case-" + (index + 1) + "-";
        steps.add(prefix + "setup-create"); tokens.add(7);
        steps.add(prefix + "migrated-create"); tokens.add(7);
        if (index % 2 == 1) {
            steps.add(prefix + "dump"); tokens.add(6);
            steps.add(prefix + "restored-create"); tokens.add(7);
            steps.add(prefix + "restore"); tokens.add(8);
        }
        return JSON.valueToTree(Map.ofEntries(
                Map.entry("schema", 1), Map.entry("scope", "v41-recovery-fixed-single-csv-rank-history"),
                Map.entry("selector", RecoveryV42CsvLauncher.SELECTED_CLASS + "#"
                        + RecoveryV42CsvLauncher.SELECTED_METHOD + "(java.lang.String,boolean,java.lang.String)"),
                Map.entry("selectionMarker", RecoveryV42CsvLauncher.SELECTION_MARKER),
                Map.entry("sourcePin", Map.of("path", V41_ORIGINAL_SOURCE, "bytes", 59145, "sha256", V41_ORIGINAL_SHA)),
                Map.entry("methodName", RecoveryV42CsvLauncher.SELECTED_METHOD),
                Map.entry("parameterTypes", List.of("java.lang.String", "boolean", "java.lang.String")),
                Map.entry("csvSource", RecoveryV42CsvLauncher.ORDERED_CSV_SOURCE),
                Map.entry("originalRowIndex", index), Map.entry("originalInvocationOrdinal", index + 1),
                Map.entry("rankKind", RecoveryV42CsvLauncher.rankKind(index)),
                Map.entry("maintenanceExec", true), Map.entry("steps", steps), Map.entry("tokens", tokens),
                Map.entry("vectors", List.of())));
    }

    /** Size and path guards precede all full-byte reads of selection metadata or original source. */
    private static void requireBoundedRegular(Path path, long cap) throws IOException {
        if (!path.isAbsolute() || !path.normalize().equals(path))
            throw new IOException("Canonical absolute V41 input required.");
        for (Path current = path; current != null; current = current.getParent())
            if (Files.isSymbolicLink(current)) throw new IOException("Symlink V41 input rejected.");
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || Files.size(path) > cap)
            throw new IOException("Bounded regular V41 input required.");
    }
    private static String sha256(byte[] bytes) throws IOException {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (java.security.NoSuchAlgorithmException error) { throw new IOException(error); }
    }

    /** Never invoked by unit tests. Authorization and all physical gates remain parent-owned. */
    public static RecoveryOwnedOwnerDriver launch(LaunchSpec spec) throws IOException {
        verifyLaunch(spec);
        ProcessBuilder builder = new ProcessBuilder(spec.argv());
        builder.directory(Path.of(spec.cwd()).toFile());
        builder.environment().clear();
        builder.environment().putAll(spec.environment());
        long started = System.nanoTime();
        return new RecoveryOwnedOwnerDriver(builder.start(), spec.expectedBinding(), started);
    }

    private static void verifyLaunch(LaunchSpec spec) throws IOException {
        if (!spec.enabled()) throw new IOException("Physical launch remains disabled.");
        selectedV41Row(spec);
        Path root=Path.of(spec.cwd());
        if (!root.isAbsolute() || !root.getFileName().toString().startsWith("ordenfix-pro-recovery-v41-rank12-python-owner-nosite-"))
            throw new IOException("Owner root is not explicit fresh owner TEMP.");
        List<String> argv=spec.argv();
        verifyFullArgv(argv,root);
        Map<String,String> clean=Map.of("HOME",root.resolve("home").toString(),"TMPDIR",root.resolve("tmp").toString(),
            "PATH","/usr/bin:/bin","LANG","C","LC_ALL","C","PYTHONDONTWRITEBYTECODE","1",
            "__CF_USER_TEXT_ENCODING","0x1F5:0x0:0x8");
        if (!clean.equals(spec.environment())) throw new IOException("Owner environment differs from frozen clean values.");
        for (Path directory:List.of(root,root.resolve("home"),root.resolve("tmp")))
            if (!Files.isDirectory(directory,LinkOption.NOFOLLOW_LINKS) || Files.isSymbolicLink(directory))
                throw new IOException("Owned regular directory required.");
        if (spec.sourcePins().isEmpty()) throw new IOException("Owned source pins are required.");
        for (var entry:spec.sourcePins().entrySet()) {
            Path file=Path.of(entry.getKey());
            if (!file.isAbsolute() || !file.normalize().startsWith(root)) throw new IOException("Pin outside owner root.");
            verifyFile(file,entry.getValue());
        }
        if (!spec.sourcePins().containsKey(argv.get(3))) throw new IOException("Owner script pin missing.");
        verifyFile(Path.of(argv.get(6)),argv.get(8));
        verifyFile(root.resolve("runtime-pins.json"),argv.get(10));
        if (!spec.expectedBinding().bootstrapNetworkId().isEmpty() || spec.expectedBinding().internal())
            throw new IOException("Frozen standard-network binding must have no pre-adopted network ID.");
        verifyExpectedBinding(spec.expectedBinding(), root);
    }
    static void verifyExpectedBinding(Binding binding, Path root) throws IOException {
        String nonce = binding.nonce();
        if (nonce == null || !nonce.matches("[0-9a-f]{32}") || !root.normalize().equals(root)
                || !root.isAbsolute()
                || !root.getFileName().toString().equals("ordenfix-pro-recovery-v41-rank12-python-owner-nosite-" + nonce)
                || !binding.owner().equals("pro-recovery-v41-rank12-owned-" + nonce)
                || !binding.containerName().equals("ordenfix-pro-recovery-v41-rank12-pg-" + nonce)
                || !binding.networkName().equals("ordenfix-pro-recovery-v41-rank12-net-" + nonce)
                || binding.internal() || !binding.cachedImageId().equals(RecoveryPostgreSQLFixture.CACHED_IMAGE)
                || !binding.labels().equals(Map.of("com.ordenfix.fixture-owner", binding.owner(),
                    "com.ordenfix.fixture-purpose", "recovery-v41-rank12-single",
                    "com.ordenfix.fixture-root", root.toString())))
            throw new IOException("Frozen recovery owner identity or complete labels differ.");
    }
    static void verifyFullArgv(List<String> argv,Path root) throws IOException {
        if (argv.size()!=11 || !argv.get(0).equals("/Library/Frameworks/Python.framework/Versions/3.10/bin/python3")
            || !argv.get(1).equals("-B") || !argv.get(2).equals("-S")
            || !argv.get(3).equals(root.resolve("owner_main.py").toString())
            || !argv.get(4).equals("--execute-parent-approved-recovery-v41-rank12-owned-stdio") || !argv.get(5).equals("--config")
            || !argv.get(6).equals(root.resolve("request.json").toString()) || !argv.get(7).equals("--config-sha")
            || !hex(argv.get(8)) || !argv.get(9).equals("--runtime-pins-sha") || !hex(argv.get(10)))
            throw new IOException("Owner argv differs from the exact frozen no-site direct Python shape.");
    }
    private static void verifyFile(Path path,String sha) throws IOException {
        if (!path.isAbsolute() || !hex(sha)) throw new IOException("Absolute pin and full SHA256 required.");
        for (Path current=path;current!=null;current=current.getParent())
            if (Files.isSymbolicLink(current)) throw new IOException("Symlink pin path rejected.");
        if (!Files.isRegularFile(path,LinkOption.NOFOLLOW_LINKS)) throw new IOException("Regular pinned file required.");
        try {
            String actual=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(path)));
            if (!sha.equals(actual)) throw new IOException("Pinned file SHA mismatch: "+path);
        } catch (java.security.NoSuchAlgorithmException error) { throw new IOException(error); }
    }

    @Override public synchronized Binding binding() { requireUsable(); return binding; }
    @Override public synchronized Handle start(StartRequest input) {
        validateRequest(input);
        if (request!=null) throw invalid("Start may be issued only once.");
        request=input;
        try {
            Handle result=parseHandle(rpc("start",Map.of("request",input),launchDeadline),false);
            if (!result.networkId().equals(binding.bootstrapNetworkId())) throw invalid("Start changed bootstrap network.");
            handle=result; return result;
        } catch (RuntimeException error) { emergency(error); throw error; }
    }
    @Override public synchronized Inspection inspect(StartRequest input,Handle supplied) {
        validateActive(input,supplied);
        try {
            JsonNode value=rpc("inspect",Map.of("request",input,"handle",supplied),operationDeadline(10));
            keys(value,"requestKey","handle","rawContainer","rawNetwork");
            requireNonce(value); Handle returned=parseHandle(value.get("handle"),false); requireHandle(returned,supplied);
            return new Inspection(text(value,"requestKey"),returned,jsonMap(value.get("rawContainer")),jsonMap(value.get("rawNetwork")));
        } catch (RuntimeException error) { emergency(error); throw error; }
    }
    @Override public synchronized ExecResult exec(StartRequest input,Handle supplied,List<String> argv) {
        validateActive(input,supplied); List<String> owned=List.copyOf(argv);
        if (owned.isEmpty() || owned.stream().anyMatch(value->value==null || value.indexOf('\0')>=0)) throw invalid("Invalid exec argv.");
        try {
            JsonNode value=rpc("exec",Map.of("request",input,"handle",supplied,"argv",owned),operationDeadline(45));
            keys(value,"requestKey","handle","argv","exitCode","stdout","stderr");
            requireNonce(value); Handle returned=parseHandle(value.get("handle"),false); requireHandle(returned,supplied);
            if (!owned.equals(strings(value.get("argv")))) throw invalid("Exec argv changed.");
            return new ExecResult(text(value,"requestKey"),returned,owned,integer(value,"exitCode"),binary(value,"stdout"),binary(value,"stderr"));
        } catch (RuntimeException error) { emergency(error); throw error; }
    }
    @Override public StopResult stop(StartRequest input,Handle supplied) {
        beginCleanup();
        synchronized (this) {
        if (stopped!=null && input!=null && input.equals(stopRequest) && Objects.equals(supplied,stopHandle)) return stopped;
        validateRequest(input);
        if (request!=null && !request.equals(input)) throw invalid("Stop request differs from original start.");
        if (supplied!=null) requireHandle(supplied,handle);
        if (stopped!=null) return stopped;
        try {
            stopRequest=input;stopHandle=supplied;
            Map<String,Object> payload=new LinkedHashMap<>();payload.put("request",input);payload.put("handle",supplied);
            stopped=parseStop(rpc("stop",payload,cleanupDeadline.get()),supplied);
            if (!stopped.complete() || stopped.unknownResources()) tainted=true;
            return stopped;
        } catch (RuntimeException error) { emergency(error); throw error; }
    }
        }
    private JsonNode rpc(String op,Map<String,?> payload,long deadline) {
        requireUsable();
        try {
            long seq=++sequence;
            byte[] frame=JSON.writeValueAsBytes(Map.of("protocol",PROTOCOL,"seq",seq,"nonce",expected.nonce(),"op",op,"payload",payload));
            long sentAt=System.nanoTime();
            JsonNode reply=JSON.readTree(channel.exchange(frame,Math.min(deadline,lifetimeDeadline+30*SECOND)));
            keys(reply,"protocol","seq","nonce","op","status","value","error","lifecycle");
            if (!PROTOCOL.equals(text(reply,"protocol")) || integer(reply,"seq")!=seq || !expected.nonce().equals(text(reply,"nonce"))
                || !op.equals(text(reply,"op"))) throw invalid("Owner response envelope binding mismatch.");
            parseLifecycle(reply.get("lifecycle"),sentAt);
            if ((op.equals("bootstrap") || op.equals("start")) && ownerFinished>ownerLaunch) throw invalid("Shared owner launch60 overrun.");
            if ((op.equals("stop") || op.equals("close")) && ownerFirstStop==null) throw invalid("Cleanup deadline missing for cleanup response.");
            String status=text(reply,"status");
            if (status.equals("error")) {
                if (!reply.get("value").isNull()) throw invalid("Error response has non-null value.");
                keys(reply.get("error"),"kind","message");
                throw invalid("Owner error "+text(reply.get("error"),"kind")+": "+text(reply.get("error"),"message"));
            }
            if (!status.equals("ok") || !reply.get("error").isNull() || reply.get("value").isNull()) throw invalid("Invalid owner status/value/error.");
            return reply.get("value");
        } catch (IOException error) { throw invalid("Owner JSON/pipe failure.",error); }
    }
    private void parseLifecycle(JsonNode node,long sentAt) {
        keys(node,"launchDeadlineMonotonic","firstStopMonotonic","cleanupDeadlineMonotonic","finishedMonotonic","unknownResources");
        Double launch=nullableNumber(node,"launchDeadlineMonotonic"),first=nullableNumber(node,"firstStopMonotonic"),cleanup=nullableNumber(node,"cleanupDeadlineMonotonic");
        double finished=number(node,"finishedMonotonic");
        if (launch==null || launch-finished>60.000001 || finished<ownerFinished || (ownerLaunch!=null && !ownerLaunch.equals(launch))
            || (ownerFirstStop!=null && !ownerFirstStop.equals(first)) || (ownerCleanup!=null && (cleanup==null || cleanup>ownerCleanup))
            || (first==null)!=(cleanup==null) || (first!=null && (cleanup>first+30.000001 || finished>cleanup)))
            throw invalid("Owner lifecycle deadline reset/overrun.");
        ownerLaunch=launch;ownerFirstStop=first;ownerCleanup=cleanup;ownerFinished=finished;
        if (cleanup!=null) {
            // Compare durations, never Python and JVM monotonic epochs. Using pre-send time is conservative.
            long translated=sentAt+(long)Math.floor((cleanup-finished)*SECOND);
            cleanupDeadline.accumulateAndGet(translated,Math::min);
            channel.boundCleanup(cleanupDeadline.get());
        }
        if (bool(node,"unknownResources")) throw invalid("Owner reports unknown resources.");
    }
    private StopResult parseStop(JsonNode value,Handle supplied) {
        keys(value,"requestKey","handle","complete","unknownResources");requireNonce(value);
        Handle returned=parseHandle(value.get("handle"),true);
        if (!Objects.equals(returned,supplied)) throw invalid("Cleanup receipt changed the supplied nullable handle.");
        boolean complete=bool(value,"complete"),unknown=bool(value,"unknownResources");
        if (complete && unknown) throw invalid("Unknown resources cannot be complete.");
        return new StopResult(text(value,"requestKey"),returned,complete,unknown);
    }
    private void validateRequest(StartRequest input) {
        requireUsable();
        if (input==null || !expected.nonce().equals(input.requestKey()) || !"postgres:16-alpine".equals(input.image())
            || !"profile_recovery".equals(input.databaseName()) || !"fixture".equals(input.username()) || !"fixture-password".equals(input.password()))
            throw invalid("Request differs from exact selected-suite primary fixture.");
    }
    private void validateActive(StartRequest input,Handle supplied) {
        validateRequest(input); if (!input.equals(request)) throw invalid("Operation changed StartRequest."); requireHandle(supplied,handle);
    }
    private void requireNonce(JsonNode value) { if (!expected.nonce().equals(text(value,"requestKey"))) throw invalid("Response requestKey mismatch."); }
    private static void requireHandle(Handle value,Handle expected) {
        if (expected==null || !expected.equals(value)) throw invalid("Response/operation handle mismatch.");
    }
    private void requireUsable() { if (closed || tainted) throw invalid("Owner driver is closed or failed."); }
    private long operationDeadline(int seconds) { return Math.min(System.nanoTime()+seconds*SECOND,lifetimeDeadline); }
    private void beginCleanup() {
        cleanupDeadline.accumulateAndGet(Math.min(System.nanoTime()+30*SECOND,lifetimeDeadline+30*SECOND),Math::min);
        channel.boundCleanup(cleanupDeadline.get());
    }
    private void emergency(RuntimeException error) {
        tainted=true;diagnostic=error.toString();beginCleanup();
        channel.close(cleanupDeadline.get());closed=true;cleanupComplete=false;
    }
    @Override public void close() {
        beginCleanup();
        synchronized (this) {
        if (closed) { if (!cleanupComplete) throw invalid("Owner cleanup is not accredited: "+diagnostic); return; }
        try {
            StopResult result=parseStop(rpc("close",Map.of(),cleanupDeadline.get()),handle);
            cleanupComplete=result.complete() && !result.unknownResources() && !tainted;
        } catch (RuntimeException error) { tainted=true;diagnostic=error.toString();cleanupComplete=false; }
        finally { cleanupComplete=channel.close(cleanupDeadline.get()) && cleanupComplete;closed=true; }
        if (!cleanupComplete) throw invalid("Owner cleanup is not accredited: "+diagnostic);
    }
        }
    public synchronized boolean cleanupComplete() { return closed && cleanupComplete; }
    public boolean quiescent() { return channel.quiescent(); }
    public byte[] ownerStderr() { return channel.stderrBytes(); }
    public long lifetimeDeadlineNanos() { return lifetimeDeadline; }
    public long cleanupDeadlineNanos() { return cleanupDeadline.get(); }
    /** Starts the same earliest/min cleanup horizon before any application fallback close. */
    public long beginApplicationCleanup() {
        beginCleanup();
        return cleanupDeadline.get();
    }

    private static Binding parseBinding(JsonNode value) {
        keys(value,"owner","nonce","containerName","networkName","cachedImageId","internal","labels","bootstrapNetworkId");
        return new Binding(text(value,"owner"),text(value,"nonce"),text(value,"containerName"),text(value,"networkName"),
            text(value,"cachedImageId"),bool(value,"internal"),stringMap(value.get("labels")),text(value,"bootstrapNetworkId"));
    }
    private static boolean sameBinding(Binding a,Binding b) {
        return a.owner().equals(b.owner()) && a.nonce().equals(b.nonce()) && a.containerName().equals(b.containerName())
            && a.networkName().equals(b.networkName()) && a.cachedImageId().equals(b.cachedImageId()) && a.internal()==b.internal() && a.labels().equals(b.labels());
    }
    private static Handle parseHandle(JsonNode node,boolean nullable) {
        if (node.isNull() && nullable) return null;keys(node,"containerId","networkId");
        String container=text(node,"containerId"),network=text(node,"networkId");
        if (!id(container)||!id(network)) throw invalid("Full genuine resource IDs required.");return new Handle(container,network);
    }
    private static void keys(JsonNode node,String... expected) {
        if (node==null || !node.isObject()) throw invalid("Required JSON object missing.");
        Set<String> wanted=Set.of(expected);List<String> actual=new ArrayList<>();node.fieldNames().forEachRemaining(actual::add);
        if (!wanted.equals(Set.copyOf(actual))) throw invalid("JSON required fields differ: "+wanted);
    }
    private static String text(JsonNode node,String key) {
        JsonNode value=node.get(key);if (value==null || !value.isTextual()) throw invalid("Required string: "+key);return value.textValue();
    }
    private static boolean bool(JsonNode node,String key) {
        JsonNode value=node.get(key);if (value==null || !value.isBoolean()) throw invalid("Required boolean: "+key);return value.booleanValue();
    }
    private static long integer(JsonNode node,String key) {
        JsonNode value=node.get(key);if (value==null || !value.isIntegralNumber() || !value.canConvertToLong()) throw invalid("Required integer: "+key);return value.longValue();
    }
    private static double number(JsonNode node,String key) {
        JsonNode value=node.get(key);if (value==null || !value.isNumber() || !Double.isFinite(value.doubleValue()) || value.doubleValue()<0) throw invalid("Required finite monotonic number: "+key);return value.doubleValue();
    }
    private static Double nullableNumber(JsonNode node,String key) {
        JsonNode value=node.get(key);if(value==null)throw invalid("Required nullable lifecycle field: "+key);return value.isNull()?null:number(node,key);
    }
    private static List<String> strings(JsonNode node) {
        if(node==null || !node.isArray())throw invalid("Required string array.");List<String> result=new ArrayList<>();
        for(JsonNode value:node){if(!value.isTextual())throw invalid("Non-string argv.");result.add(value.textValue());}return List.copyOf(result);
    }
    private static Map<String,String> stringMap(JsonNode node) {
        if(node==null || !node.isObject())throw invalid("Required string map.");Map<String,String> result=new LinkedHashMap<>();
        node.properties().forEach(entry->{if(!entry.getValue().isTextual())throw invalid("Non-string map value.");result.put(entry.getKey(),entry.getValue().textValue());});return result;
    }
    @SuppressWarnings("unchecked") private static Map<String,Object> jsonMap(JsonNode node) {
        if(node==null || !node.isObject())throw invalid("Required raw inspection object.");return JSON.convertValue(node,LinkedHashMap.class);
    }
    private static byte[] binary(JsonNode node,String key) {
        String encoded=text(node,key);if(encoded.length()>87384)throw invalid("Exec stream cap exceeded.");
        try { byte[] result=Base64.getDecoder().decode(encoded);if(result.length>65536 || !Base64.getEncoder().encodeToString(result).equals(encoded))throw invalid("Invalid/capped canonical base64.");return result; }
        catch(IllegalArgumentException error){throw invalid("Invalid base64 stream.",error);}
    }
    private static boolean id(String value) { return value!=null && value.matches("[a-f0-9]{64}"); }
    private static boolean hex(String value) { return id(value); }
    private static IllegalStateException invalid(String message) { return new IllegalStateException(message); }
    private static IllegalStateException invalid(String message,Throwable cause) { return new IllegalStateException(message,cause); }
}
