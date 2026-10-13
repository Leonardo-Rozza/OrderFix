package com.leonardorozza.mvgrreparacionesbackend.testing.owned;

import java.nio.charset.StandardCharsets;
import com.github.dockerjava.api.model.ExposedPort;
import com.github.dockerjava.api.model.Ports;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.testcontainers.lifecycle.Startable;
import static com.leonardorozza.mvgrreparacionesbackend.testing.owned.OwnedFixtureProtocol.*;

/** An inert test fixture backed exclusively by an explicitly installed, owned local port. */
public final class RecoveryPostgreSQLFixture implements Startable {
    public static final String CACHED_IMAGE =
            "sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777";
    public enum State { NEW, STARTING, RUNNING, FAILED, STOPPING, STOPPED }

    private static Owner installedOwner;
    private static final Set<RecoveryPostgreSQLFixture> ACTIVE = new HashSet<>();

    private final String image;
    private String databaseName = "test", username = "test", password = "test";
    private State state = State.NEW;
    private Owner owner;
    private Binding binding;
    private StartRequest request;
    private Handle handle;
    private Inspection lastInspection;
    private Integer allocatedPort;
    private boolean ownerStartAttempted, stopAttempted;
    private IllegalStateException stopFailure;

    public RecoveryPostgreSQLFixture(String image) {
        require("postgres:16-alpine".equals(image), "Only the accepted cached PostgreSQL alias is allowed.");
        this.image = image;
    }

    public static synchronized void installOwner(Owner owner) {
        require(owner != null, "Explicit owner is required.");
        require(installedOwner == null, "An owner is already installed.");
        installedOwner = owner;
    }

    public static synchronized void clearOwner(Owner owner) {
        require(installedOwner == owner && owner != null, "Only the installed owner may be cleared.");
        require(ACTIVE.isEmpty(), "Known fixtures must be stopped before owner removal.");
        installedOwner = null;
    }

    private static synchronized Owner acquire(RecoveryPostgreSQLFixture fixture) {
        require(installedOwner != null, "No explicit owner is installed.");
        ACTIVE.add(fixture);
        return installedOwner;
    }

    private static synchronized void release(RecoveryPostgreSQLFixture fixture) {
        ACTIVE.remove(fixture);
    }

    public synchronized RecoveryPostgreSQLFixture withDatabaseName(String value) {
        requireNew(); databaseName = text(value); return this;
    }

    public synchronized RecoveryPostgreSQLFixture withUsername(String value) {
        requireNew(); username = text(value); return this;
    }

    public synchronized RecoveryPostgreSQLFixture withPassword(String value) {
        requireNew(); password = text(value); return this;
    }

    public String getDriverClassName() { return "org.postgresql.Driver"; }

    public synchronized String getDatabaseName() { return databaseName; }
    public synchronized String getUsername() { return username; }
    public synchronized String getPassword() { return password; }
    public synchronized State state() { return state; }
    public synchronized Inspection lastInspection() { return lastInspection; }

    @Override public synchronized void start() {
        requireNew();
        state = State.STARTING;
        try {
            require(databaseName.equals("profile_recovery") && username.equals("fixture")
                    && password.equals("fixture-password"), "Only the selected primary may start.");
            owner = acquire(this);
            binding = owner.binding();
            validateBinding(binding);
            request = new StartRequest(binding.nonce(), image, databaseName, username, password);
            ownerStartAttempted = true;
            handle = owner.start(request);
            validateHandle(handle);
            allocatedPort = inspectAndValidate();
            state = State.RUNNING;
        } catch (RuntimeException failure) {
            state = State.FAILED;
            throw failure;
        }
    }

    @Override public synchronized void stop() {
        if (state == State.STOPPED) return;
        if (stopAttempted) throw stopFailure;
        stopAttempted = true;
        state = State.STOPPING;
        try {
            if (ownerStartAttempted) {
                StopResult result = owner.stop(request, handle);
                require(result != null && request.requestKey().equals(result.requestKey())
                        && Objects.equals(handle, result.handle()), "Cleanup receipt is misbound.");
                require(result.complete() && !result.unknownResources(), "Cleanup is incomplete or unknown.");
            }
            release(this);
            state = State.STOPPED;
        } catch (RuntimeException failure) {
            state = State.FAILED;
            stopFailure = new IllegalStateException("Owned cleanup was not proven complete.", failure);
            throw stopFailure;
        }
    }

    public synchronized String getHost() { refresh(); return "127.0.0.1"; }

    public synchronized Integer getMappedPort(int port) {
        require(port == 5432, "Only PostgreSQL port 5432 is exposed.");
        refresh();
        return allocatedPort;
    }

    public synchronized String getJdbcUrl() {
        refresh();
        return "jdbc:postgresql://127.0.0.1:" + allocatedPort + "/" + databaseName;
    }

    public record ContainerInfo(NetworkSettings getNetworkSettings) { }
    public record NetworkSettings(Ports getPorts) { }
    /** Snapshot of the refreshed, validated effective publication, never requested PortBindings. */
    public synchronized ContainerInfo getContainerInfo() {
        refresh();
        Map<String, Object> settings = object(lastInspection.rawContainer().get("NetworkSettings"));
        Map<String, Object> ports = object(settings.get("Ports"));
        List<?> actual = (List<?>) ports.get("5432/tcp");
        Ports.Binding[] bindings = actual.stream().map(endpoint -> {
            Map<String, Object> publication = object(endpoint);
            return Ports.Binding.bindIpAndPort(
                    (String) publication.get("HostIp"), Integer.parseInt((String) publication.get("HostPort")));
        }).toArray(Ports.Binding[]::new);
        Ports exposed = new Ports();
        for (var actualBinding : bindings)
            exposed.bind(ExposedPort.tcp(5432), actualBinding);
        return new ContainerInfo(new NetworkSettings(exposed));
    }

    public synchronized ExecOutput execInContainer(String... argv) {
        require(argv != null && argv.length > 0, "Exec requires an argv vector.");
        for (String argument : argv) require(argument != null && argument.indexOf('\0') < 0, "Malformed exec token.");
        List<String> exactArgv = List.copyOf(Arrays.asList(argv.clone()));
        refresh();
        ExecResult result = owner.exec(request, handle, exactArgv);
        require(result != null && request.requestKey().equals(result.requestKey())
                && handle.equals(result.handle()) && exactArgv.equals(result.argv()), "Exec receipt is misbound.");
        return new ExecOutput(result.exitCode(), result.stdout(), result.stderr());
    }

    public record ExecOutput(long getExitCode, byte[] stdoutBytes, byte[] stderrBytes) {
        public ExecOutput {
            stdoutBytes = stdoutBytes.clone();
            stderrBytes = stderrBytes.clone();
        }
        @Override public byte[] stdoutBytes() { return stdoutBytes.clone(); }
        @Override public byte[] stderrBytes() { return stderrBytes.clone(); }
        public String getStdout() { return new String(stdoutBytes, StandardCharsets.UTF_8); }
        public String getStderr() { return new String(stderrBytes, StandardCharsets.UTF_8); }
    }

    private void refresh() {
        require(state == State.RUNNING, "Fixture is not running.");
        try {
            int port = inspectAndValidate();
            require(allocatedPort.equals(port), "Allocated endpoint changed during the fixture lifetime.");
        } catch (RuntimeException failure) {
            state = State.FAILED;
            throw failure;
        }
    }

    private int inspectAndValidate() {
        lastInspection = owner.inspect(request, handle);
        require(lastInspection != null && request.requestKey().equals(lastInspection.requestKey())
                && handle.equals(lastInspection.handle()), "Inspection receipt is misbound.");
        Map<String, Object> container = lastInspection.rawContainer(), network = lastInspection.rawNetwork();
        require(handle.containerId().equals(container.get("Id"))
                && ("/" + binding.containerName()).equals(container.get("Name"))
                && CACHED_IMAGE.equals(container.get("Image")),
                "Actual container or image identity differs.");
        Map<String, Object> config = object(container.get("Config"));
        require(binding.labels().equals(config.get("Labels")) && CACHED_IMAGE.equals(config.get("Image")),
                "Complete labels or requested image differ.");
        validateHostSecurity(container);
        Map<String, Object> state = object(container.get("State"));
        require(Boolean.TRUE.equals(state.get("Running"))
                && "healthy".equals(object(state.get("Health")).get("Status")), "PostgreSQL is not running and healthy.");
        Map<String, Object> settings = object(container.get("NetworkSettings"));
        Map<String, Object> ports = object(settings.get("Ports"));
        require(ports.keySet().equals(Set.of("5432/tcp")), "Complete effective port inventory differs.");
        Object publication = ports.get("5432/tcp");
        require(publication instanceof List<?> && ((List<?>) publication).size() == 1, "One effective port is required.");
        Map<String, Object> endpoint = object(((List<?>) publication).getFirst());
        require(endpoint.keySet().equals(Set.of("HostIp", "HostPort")) && "127.0.0.1".equals(endpoint.get("HostIp")),
                "Actual publication is not exclusively localhost.");
        Object portText = endpoint.get("HostPort");
        require(portText instanceof String && ((String) portText).matches("[0-9]{1,5}"), "Malformed allocated port.");
        int port = Integer.parseInt((String) portText);
        require(port > 0 && port <= 65535, "Allocated port is outside TCP range.");
        Map<String, Object> networks = object(settings.get("Networks"));
        require(networks.keySet().equals(Set.of(binding.networkName()))
                && handle.networkId().equals(object(networks.get(binding.networkName())).get("NetworkID")),
                "Complete attached network inventory differs.");
        require(handle.networkId().equals(network.get("Id")) && binding.networkName().equals(network.get("Name"))
                && binding.labels().equals(network.get("Labels")), "Network identity or complete labels differ.");
        require("bridge".equals(network.get("Driver")) && Boolean.valueOf(binding.internal()).equals(network.get("Internal"))
                && Boolean.FALSE.equals(network.get("EnableIPv6")), "Actual requested network mode differs.");
        require(binding.internal() || ("local".equals(network.get("Scope")) && Boolean.TRUE.equals(network.get("EnableIPv4"))),
                "Standard network must be explicitly local IPv4.");
        Object options = network.get("Options");
        require(options == null || Map.of().equals(options)
                || (Map.of("com.docker.network.enable_ipv4", "true").equals(options)
                    && "local".equals(network.get("Scope")) && Boolean.TRUE.equals(network.get("EnableIPv4"))),
                "Unexpected network options.");
        require(object(network.get("Containers")).keySet().equals(Set.of(handle.containerId())),
                "Owned container must be the only network member.");
        return port;
    }

    private void validateHostSecurity(Map<String, Object> container) {
        Map<String, Object> host = object(container.get("HostConfig"));
        require(handle.networkId().equals(host.get("NetworkMode")), "Network mode differs.");
        require(empty(host.get("Binds")) && empty(host.get("Mounts")) && List.of().equals(container.get("Mounts")),
                "Host mounts are forbidden.");
        require(Boolean.FALSE.equals(host.get("PublishAllPorts")) && Boolean.FALSE.equals(host.get("Privileged"))
                && Boolean.TRUE.equals(host.get("ReadonlyRootfs")), "Publishing or privilege flags differ.");
        require(List.of("no-new-privileges").equals(host.get("SecurityOpt")), "Security options differ.");
        for (var bound : Map.of("Memory", 1073741824L, "MemorySwap", 1073741824L,
                "NanoCpus", 1000000000L, "PidsLimit", 128L, "ShmSize", 67108864L).entrySet()) {
            require(integerEquals(host.get(bound.getKey()), bound.getValue()), "Resource bound differs: " + bound.getKey());
        }
        require(Map.of("5432/tcp", List.of(Map.of("HostIp", "127.0.0.1", "HostPort", "")))
                .equals(host.get("PortBindings")), "Requested port inventory differs.");
    }

    private static void validateBinding(Binding binding) {
        require(binding != null && binding.nonce() != null && binding.nonce().matches("[0-9a-f]{32}"),
                "Explicit nonce is missing.");
        require(binding.owner() != null && binding.owner().endsWith(binding.nonce())
                && binding.containerName() != null && binding.containerName().endsWith(binding.nonce())
                && binding.networkName() != null && binding.networkName().endsWith(binding.nonce()), "Owned names differ.");
        require(binding.owner().equals("pro-recovery-v41-rank12-owned-" + binding.nonce())
                && binding.containerName().equals("ordenfix-pro-recovery-v41-rank12-pg-" + binding.nonce())
                && binding.networkName().equals("ordenfix-pro-recovery-v41-rank12-net-" + binding.nonce())
                && !binding.internal(), "Strict recovery ownership and standard network are required.");
        require(CACHED_IMAGE.equals(binding.cachedImageId()), "Unaccepted cached image.");
        require(fullId(binding.bootstrapNetworkId()), "Expected bootstrap network is not a full actual ID.");
        require(binding.labels().keySet().equals(Set.of("com.ordenfix.fixture-owner",
                    "com.ordenfix.fixture-purpose", "com.ordenfix.fixture-root"))
                && binding.owner().equals(binding.labels().get("com.ordenfix.fixture-owner"))
                && "recovery-v41-rank12-single".equals(binding.labels().get("com.ordenfix.fixture-purpose"))
                && binding.labels().get("com.ordenfix.fixture-root") != null
                && binding.labels().get("com.ordenfix.fixture-root").equals("/private/tmp/ordenfix-pro-recovery-v41-rank-runtime-eknsdkn0/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-cf3482320bfc461aa551b8da25272e92"),
                "Complete expected owner labels are missing.");
    }

    private void validateHandle(Handle handle) {
        require(handle != null && fullId(handle.containerId()) && fullId(handle.networkId())
                && binding.bootstrapNetworkId().equals(handle.networkId()), "Actual handle is invalid or foreign.");
    }

    private void requireNew() { require(state == State.NEW, "Fixture configuration and start are NEW-only."); }
    private static boolean fullId(String value) { return value != null && value.matches("[0-9a-f]{64}"); }
    private static boolean nonblank(String value) { return value != null && !value.isBlank(); }
    private static String text(String value) { require(nonblank(value), "Credential must be nonblank."); return value; }
    private static boolean empty(Object value) { return value == null || List.of().equals(value); }
    private static boolean integerEquals(Object value, long expected) {
        return (value instanceof Integer || value instanceof Long) && ((Number) value).longValue() == expected;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> object(Object value) {
        require(value instanceof Map<?, ?>, "Malformed or incomplete raw inspection.");
        for (Object key : ((Map<?, ?>) value).keySet()) require(key instanceof String, "Non-string inspection key.");
        return (Map<String, Object>) value;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
