package com.leonardorozza.mvgrreparacionesbackend.testing.owned;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.nio.ByteBuffer;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.*;
import java.nio.file.spi.FileSystemProvider;
import java.security.MessageDigest;
import java.util.*;
import org.opentest4j.AssertionFailedError;

/** Independent public-reader checks; no launcher, owner, original body or old test discovery. */
public final class V41FrozenSpecReadChecks {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int CAP = 65536;
    private static Path data;
    private static int serial, methods, passed, assertionFailures, errors;
    private static final List<Map<String, String>> failures = new ArrayList<>();

    @FunctionalInterface
    private interface Checked { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        assertEquals(2, args.length, "Exact compiled-origin and fresh-data arguments required");
        Path origin = Path.of(args[0]);
        data = Path.of(args[1]);
        Path unit = origin.getParent();
        assertTrue(origin.isAbsolute() && origin.normalize().equals(origin)
                && Files.isDirectory(origin, LinkOption.NOFOLLOW_LINKS), "Explicit compiled directory required");
        assertTrue(unit != null && unit.getParent().equals(Path.of("/private/tmp"))
                && unit.getFileName().toString().startsWith("ordenfix-pro-frozen-spec-read-"),
                "Explicit private frozen-spec unit required");
        assertTrue(data.isAbsolute() && data.normalize().equals(data)
                && unit.equals(data.getParent()) && !Files.exists(data, LinkOption.NOFOLLOW_LINKS),
                "Data must be a new direct child of the same private unit");
        for (Class<?> type : List.of(V41FrozenSpecReadChecks.class, RecoveryOwnedOwnerDriver.class,
                OwnedFixtureProtocol.class)) {
            assertEquals(origin, Path.of(type.getProtectionDomain().getCodeSource().getLocation().toURI()),
                    "Unexpected compiled origin: " + type.getName());
        }
        Files.createDirectory(data);
        check("parsesThePinnedReadWhenFileChangesAfterClose",
                V41FrozenSpecReadChecks::parsesThePinnedReadWhenFileChangesAfterClose);
        check("stopsAfterCapPlusOneBytes", V41FrozenSpecReadChecks::stopsAfterCapPlusOneBytes);
        check("rejectsCapPlusOneBeforeDigestOrParsing",
                V41FrozenSpecReadChecks::rejectsCapPlusOneBeforeDigestOrParsing);
        check("acceptsExactlyTheCap", V41FrozenSpecReadChecks::acceptsExactlyTheCap);
        check("rejectsMismatchedSha", V41FrozenSpecReadChecks::rejectsMismatchedSha);
        check("preservesPathAndDigestContracts", V41FrozenSpecReadChecks::preservesPathAndDigestContracts);
        check("preservesStrictJsonContracts", V41FrozenSpecReadChecks::preservesStrictJsonContracts);
        System.out.println("FROZEN_SPEC_READ_RESULT=" + JSON.writeValueAsString(Map.of(
                "methods", methods, "assertionFailures", assertionFailures, "errors", errors,
                "skips", 0, "passed", passed, "failures", failures)));
        if (assertionFailures != 0 || errors != 0) System.exit(1);
    }

    private static void check(String name, Checked body) {
        methods++;
        try {
            body.run();
            passed++;
        } catch (AssertionFailedError failure) {
            assertionFailures++;
            record(name, "assertionFailure", failure);
        } catch (Throwable error) {
            errors++;
            record(name, "error", error);
        }
    }

    private static void record(String name, String kind, Throwable error) {
        failures.add(Map.of("method", name, "kind", kind, "errorClass", error.getClass().getName(),
                "message", String.valueOf(error.getMessage())));
        error.printStackTrace(System.err);
    }

    private static void parsesThePinnedReadWhenFileChangesAfterClose() throws Exception {
        byte[] a = specBytes("A");
        byte[] b = specBytes("B");
        ObservedFile file = observed(a, b);
        assertEquals(spec("A"), RecoveryOwnedOwnerDriver.readFrozenSpec(file.path(), sha(a)),
                "The entire parsed spec must be the buffer whose digest was admitted");
        assertEquals(1, file.provider.opens, "Only one content channel may be opened");
        assertEquals(a.length, file.provider.bytesRead);
        assertArrayEquals(b, Files.readAllBytes(file.real), "Close-triggered replacement must really occur");
    }

    private static void stopsAfterCapPlusOneBytes() throws Exception {
        byte[] bytes = paddedSpec(100000);
        ObservedFile file = observed(bytes, null);
        IOException error = assertThrows(IOException.class,
                () -> RecoveryOwnedOwnerDriver.readFrozenSpec(file.path(), sha(bytes)));
        assertEquals("Launch spec cap exceeded.", error.getMessage());
        assertEquals(CAP + 1, file.provider.bytesRead, "A large input must not be consumed without a cap");
        assertEquals(1, file.provider.opens);
    }

    private static void rejectsCapPlusOneBeforeDigestOrParsing() throws Exception {
        byte[] bytes = new byte[CAP + 1];
        Arrays.fill(bytes, (byte) '!');
        ObservedFile file = observed(bytes, null);
        IOException error = assertThrows(IOException.class,
                () -> RecoveryOwnedOwnerDriver.readFrozenSpec(file.path(), "0".repeat(64)));
        assertEquals("Launch spec cap exceeded.", error.getMessage(),
                "The cap must take precedence over a wrong digest and malformed JSON");
        assertEquals(CAP + 1, file.provider.bytesRead);
        assertEquals(1, file.provider.opens);
    }

    private static void acceptsExactlyTheCap() throws Exception {
        byte[] bytes = paddedSpec(CAP);
        ObservedFile file = observed(bytes, null);
        assertEquals(spec("A"), RecoveryOwnedOwnerDriver.readFrozenSpec(file.path(), sha(bytes)));
        assertEquals(1, file.provider.opens, "Exactly-at-cap parsing must use the same single read");
        assertEquals(CAP, file.provider.bytesRead);
    }

    private static void rejectsMismatchedSha() throws Exception {
        ObservedFile file = observed(specBytes("A"), null);
        IOException error = assertThrows(IOException.class,
                () -> RecoveryOwnedOwnerDriver.readFrozenSpec(file.path(), "0".repeat(64)));
        assertEquals("Pinned file SHA mismatch: " + file.path(), error.getMessage());
        assertEquals(1, file.provider.opens);
    }

    private static void preservesPathAndDigestContracts() throws Exception {
        byte[] bytes = specBytes("A");
        ObservedFile file = observed(bytes, null);
        String pin = sha(bytes);
        for (String invalid : Arrays.asList(null, "", pin.substring(1), pin + "0", "G".repeat(64))) {
            assertEquals("Absolute pin and full SHA256 required.",
                    assertThrows(IOException.class,
                            () -> RecoveryOwnedOwnerDriver.readFrozenSpec(file.path(), invalid)).getMessage());
        }
        assertEquals("Absolute pin and full SHA256 required.",
                assertThrows(IOException.class, () -> RecoveryOwnedOwnerDriver.readFrozenSpec(
                        file.provider.wrap(Path.of("relative-spec.json")), pin)).getMessage());
        assertThrows(NullPointerException.class, () -> RecoveryOwnedOwnerDriver.readFrozenSpec(null, pin));
        for (Path invalid : List.of(data.resolve("absent.json"), data)) {
            assertEquals("Regular pinned file required.", assertThrows(IOException.class,
                    () -> RecoveryOwnedOwnerDriver.readFrozenSpec(file.provider.wrap(invalid), pin)).getMessage());
        }
        Path leaf = data.resolve("leaf-link");
        Files.createSymbolicLink(leaf, file.real);
        Path ancestor = data.resolve("ancestor-link");
        Files.createSymbolicLink(ancestor, file.real.getParent());
        for (Path invalid : List.of(leaf, ancestor.resolve(file.real.getFileName()))) {
            assertEquals("Symlink pin path rejected.", assertThrows(IOException.class,
                    () -> RecoveryOwnedOwnerDriver.readFrozenSpec(file.provider.wrap(invalid), pin)).getMessage());
        }
        assertEquals(0, file.provider.opens, "Path/digest validation must not open content");
        // The existing public reader permits non-normalized absolute paths; do not tighten that contract.
        Path dotted = file.real.getParent().resolve(".").resolve(file.real.getFileName());
        assertEquals(spec("A"), RecoveryOwnedOwnerDriver.readFrozenSpec(file.provider.wrap(dotted), pin));
    }

    private static void preservesStrictJsonContracts() throws Exception {
        String valid = new String(specBytes("A"), StandardCharsets.UTF_8);
        for (String invalid : List.of("{\"enabled\":false," + valid.substring(1), valid + " {}", "{")) {
            ObservedFile file = observed(invalid.getBytes(StandardCharsets.UTF_8), null);
            assertThrows(IOException.class,
                    () -> RecoveryOwnedOwnerDriver.readFrozenSpec(file.path(), sha(file.bytes)));
        }
        Map<String, Object> extra = new LinkedHashMap<>(specMap("A"));
        extra.put("unexpected", true);
        Map<String, Object> wrongType = new LinkedHashMap<>(specMap("A"));
        wrongType.put("enabled", "false");
        for (Map<String, Object> invalid : List.of(extra, wrongType)) {
            ObservedFile file = observed(JSON.writeValueAsBytes(invalid), null);
            assertThrows(IllegalStateException.class,
                    () -> RecoveryOwnedOwnerDriver.readFrozenSpec(file.path(), sha(file.bytes)));
        }
    }

    private static RecoveryOwnedOwnerDriver.LaunchSpec spec(String marker) {
        return new RecoveryOwnedOwnerDriver.LaunchSpec(false, List.of("inert-" + marker),
                Map.of("TEST_MARKER", marker), "/never-launch/" + marker, Map.of("/inert/source", "f".repeat(64)),
                new OwnedFixtureProtocol.Binding("owner-" + marker, "nonce-" + marker,
                        "container-" + marker, "network-" + marker, "image-" + marker, false,
                        Map.of("marker", marker), ""));
    }

    private static Map<String, Object> specMap(String marker) {
        var spec = spec(marker);
        return Map.of("enabled", spec.enabled(), "argv", spec.argv(), "environment", spec.environment(),
                "cwd", spec.cwd(), "sourcePins", spec.sourcePins(), "expectedBinding", spec.expectedBinding());
    }

    private static byte[] specBytes(String marker) throws IOException {
        return JSON.writeValueAsBytes(specMap(marker));
    }

    private static byte[] paddedSpec(int size) throws IOException {
        byte[] json = specBytes("A");
        assertTrue(json.length < size);
        byte[] bytes = Arrays.copyOf(json, size);
        Arrays.fill(bytes, json.length, size, (byte) ' ');
        return bytes;
    }

    private static String sha(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }

    private record ObservedFile(Path real, byte[] bytes, ObservingProvider provider) {
        Path path() { return provider.wrap(real); }
    }

    private static ObservedFile observed(byte[] bytes, byte[] replacement) throws IOException {
        Path real = data.resolve("spec-" + (++serial) + ".json");
        Files.write(real, bytes, StandardOpenOption.CREATE_NEW);
        return new ObservedFile(real, bytes, new ObservingProvider(real, replacement));
    }

    /** Delegates honest filesystem metadata and counts actual successful channel reads. */
    private static final class ObservingProvider extends FileSystemProvider {
        private final FileSystemProvider delegate = FileSystems.getDefault().provider();
        private final ObservingFileSystem fileSystem = new ObservingFileSystem(this);
        private final Path target;
        private final byte[] replacement;
        private int opens, closes;
        private long bytesRead;

        private ObservingProvider(Path target, byte[] replacement) {
            this.target = target;
            this.replacement = replacement;
        }

        private Path wrap(Path path) { return path == null ? null : new ObservingPath(fileSystem, path); }
        private Path unwrap(Path path) { return path instanceof ObservingPath observed ? observed.delegate : path; }
        @Override public String getScheme() { return "frozen-spec-observation"; }
        @Override public FileSystem newFileSystem(URI uri, Map<String, ?> env) { throw new UnsupportedOperationException(); }
        @Override public FileSystem getFileSystem(URI uri) { return fileSystem; }
        @Override public Path getPath(URI uri) { throw new UnsupportedOperationException(); }

        @Override public SeekableByteChannel newByteChannel(Path path, Set<? extends OpenOption> options,
                FileAttribute<?>... attrs) throws IOException {
            Path actual = unwrap(path);
            if (!options.isEmpty() && !options.equals(Set.of(StandardOpenOption.READ)))
                throw new IOException("Reader checks permit only read channels.");
            SeekableByteChannel channel = delegate.newByteChannel(actual, options, attrs);
            boolean observed = actual.normalize().equals(target.normalize());
            if (observed) opens++;
            return new SeekableByteChannel() {
                private boolean closed;
                @Override public int read(ByteBuffer buffer) throws IOException {
                    int count = channel.read(buffer);
                    if (observed && count > 0) bytesRead += count;
                    return count;
                }
                @Override public int write(ByteBuffer buffer) { throw new java.nio.channels.NonWritableChannelException(); }
                @Override public long position() throws IOException { return channel.position(); }
                @Override public SeekableByteChannel position(long value) throws IOException { channel.position(value); return this; }
                @Override public long size() throws IOException { return channel.size(); }
                @Override public SeekableByteChannel truncate(long size) { throw new java.nio.channels.NonWritableChannelException(); }
                @Override public boolean isOpen() { return channel.isOpen(); }
                @Override public void close() throws IOException {
                    if (closed) return;
                    channel.close();
                    closed = true;
                    if (observed && ++closes == 1 && replacement != null)
                        Files.write(target, replacement, StandardOpenOption.TRUNCATE_EXISTING);
                }
            };
        }

        @Override public DirectoryStream<Path> newDirectoryStream(Path path, DirectoryStream.Filter<? super Path> filter) {
            throw new UnsupportedOperationException();
        }
        @Override public void createDirectory(Path path, FileAttribute<?>... attrs) throws IOException {
            delegate.createDirectory(unwrap(path), attrs);
        }
        @Override public void delete(Path path) throws IOException { delegate.delete(unwrap(path)); }
        @Override public void copy(Path source, Path target, CopyOption... options) throws IOException {
            delegate.copy(unwrap(source), unwrap(target), options);
        }
        @Override public void move(Path source, Path target, CopyOption... options) throws IOException {
            delegate.move(unwrap(source), unwrap(target), options);
        }
        @Override public boolean isSameFile(Path a, Path b) throws IOException { return delegate.isSameFile(unwrap(a), unwrap(b)); }
        @Override public boolean isHidden(Path path) throws IOException { return delegate.isHidden(unwrap(path)); }
        @Override public FileStore getFileStore(Path path) throws IOException { return delegate.getFileStore(unwrap(path)); }
        @Override public void checkAccess(Path path, AccessMode... modes) throws IOException { delegate.checkAccess(unwrap(path), modes); }
        @Override public <V extends FileAttributeView> V getFileAttributeView(Path path, Class<V> type, LinkOption... options) {
            return delegate.getFileAttributeView(unwrap(path), type, options);
        }
        @Override public <A extends BasicFileAttributes> A readAttributes(Path path, Class<A> type,
                LinkOption... options) throws IOException { return delegate.readAttributes(unwrap(path), type, options); }
        @Override public Map<String, Object> readAttributes(Path path, String attrs, LinkOption... options) throws IOException {
            return delegate.readAttributes(unwrap(path), attrs, options);
        }
        @Override public void setAttribute(Path path, String attr, Object value, LinkOption... options) throws IOException {
            delegate.setAttribute(unwrap(path), attr, value, options);
        }
    }

    private static final class ObservingFileSystem extends FileSystem {
        private final ObservingProvider provider;
        private final FileSystem delegate = FileSystems.getDefault();
        private ObservingFileSystem(ObservingProvider provider) { this.provider = provider; }
        @Override public FileSystemProvider provider() { return provider; }
        @Override public void close() { throw new UnsupportedOperationException(); }
        @Override public boolean isOpen() { return delegate.isOpen(); }
        @Override public boolean isReadOnly() { return delegate.isReadOnly(); }
        @Override public String getSeparator() { return delegate.getSeparator(); }
        @Override public Iterable<Path> getRootDirectories() {
            List<Path> roots = new ArrayList<>();
            delegate.getRootDirectories().forEach(root -> roots.add(provider.wrap(root)));
            return roots;
        }
        @Override public Iterable<FileStore> getFileStores() { return delegate.getFileStores(); }
        @Override public Set<String> supportedFileAttributeViews() { return delegate.supportedFileAttributeViews(); }
        @Override public Path getPath(String first, String... more) { return provider.wrap(delegate.getPath(first, more)); }
        @Override public PathMatcher getPathMatcher(String syntax) {
            PathMatcher matcher = delegate.getPathMatcher(syntax);
            return path -> matcher.matches(provider.unwrap(path));
        }
        @Override public java.nio.file.attribute.UserPrincipalLookupService getUserPrincipalLookupService() {
            return delegate.getUserPrincipalLookupService();
        }
        @Override public WatchService newWatchService() throws IOException { return delegate.newWatchService(); }
    }

    /** Keeps parent/ancestor paths on this provider so symlink guards remain real filesystem checks. */
    private static final class ObservingPath implements Path {
        private final ObservingFileSystem fileSystem;
        private final Path delegate;
        private ObservingPath(ObservingFileSystem fileSystem, Path delegate) {
            this.fileSystem = fileSystem;
            this.delegate = delegate;
        }
        private Path wrap(Path path) { return fileSystem.provider.wrap(path); }
        private Path unwrap(Path path) { return fileSystem.provider.unwrap(path); }
        @Override public FileSystem getFileSystem() { return fileSystem; }
        @Override public boolean isAbsolute() { return delegate.isAbsolute(); }
        @Override public Path getRoot() { return wrap(delegate.getRoot()); }
        @Override public Path getFileName() { return wrap(delegate.getFileName()); }
        @Override public Path getParent() { return wrap(delegate.getParent()); }
        @Override public int getNameCount() { return delegate.getNameCount(); }
        @Override public Path getName(int index) { return wrap(delegate.getName(index)); }
        @Override public Path subpath(int begin, int end) { return wrap(delegate.subpath(begin, end)); }
        @Override public boolean startsWith(Path path) { return delegate.startsWith(unwrap(path)); }
        @Override public boolean startsWith(String path) { return delegate.startsWith(path); }
        @Override public boolean endsWith(Path path) { return delegate.endsWith(unwrap(path)); }
        @Override public boolean endsWith(String path) { return delegate.endsWith(path); }
        @Override public Path normalize() { return wrap(delegate.normalize()); }
        @Override public Path resolve(Path path) { return wrap(delegate.resolve(unwrap(path))); }
        @Override public Path resolve(String path) { return wrap(delegate.resolve(path)); }
        @Override public Path resolveSibling(Path path) { return wrap(delegate.resolveSibling(unwrap(path))); }
        @Override public Path resolveSibling(String path) { return wrap(delegate.resolveSibling(path)); }
        @Override public Path relativize(Path path) { return wrap(delegate.relativize(unwrap(path))); }
        @Override public URI toUri() { return delegate.toUri(); }
        @Override public Path toAbsolutePath() { return wrap(delegate.toAbsolutePath()); }
        @Override public Path toRealPath(LinkOption... options) throws IOException { return wrap(delegate.toRealPath(options)); }
        @Override public java.io.File toFile() { return delegate.toFile(); }
        @Override public WatchKey register(WatchService watcher, WatchEvent.Kind<?>[] events,
                WatchEvent.Modifier... modifiers) throws IOException { return delegate.register(watcher, events, modifiers); }
        @Override public Iterator<Path> iterator() {
            Iterator<Path> iterator = delegate.iterator();
            return new Iterator<>() {
                @Override public boolean hasNext() { return iterator.hasNext(); }
                @Override public Path next() { return wrap(iterator.next()); }
            };
        }
        @Override public int compareTo(Path path) { return delegate.compareTo(unwrap(path)); }
        @Override public boolean equals(Object other) {
            return other instanceof ObservingPath path && fileSystem == path.fileSystem && delegate.equals(path.delegate);
        }
        @Override public int hashCode() { return 31 * System.identityHashCode(fileSystem) + delegate.hashCode(); }
        @Override public String toString() { return delegate.toString(); }
    }
}
