"""Explicit local V41 release envelope with an enforced absolute280 budget.

An exit0 from the release CLI is capture evidence, not original-test success.
Only the session/group created here is inspected or signalled. Source admission
and post-readbacks are separately timed bookkeeping, never runtime authority.
"""
import hashlib
import json
import math
import os
from pathlib import Path
import re
import resource
import selectors
import signal
import stat
import subprocess
import sys
import time

FAMILY = Path('/private/tmp/ordenfix-pro-recovery-v41-final-m3daoe_6')
PROJECT = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend')
PYTHON = '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3'
STREAM_LIMIT = 8388608
CHUNK_LIMIT = 65536
SPEC_KEYS = {'schema', 'argv', 'cwd', 'environment', 'runTimeoutSeconds', 'totalTimeoutSeconds'}
PIN_KEYS = {'path', 'bytes', 'sha256'}
STAT_KEYS = {'device', 'inode', 'mode', 'uid', 'gid', 'nlink', 'mtimeNs', 'ctimeNs'}
CANONICAL = PROJECT / 'odd/tasks/pro-paid-period-cancellation.md'
IMAGE_QUALIFICATION = {
    'path': str(PROJECT / 'release-validation.local/recovery-v41-final-u1in8maq/root-final-environment-image-qualified-01.json'),
    'bytes': 3299251,
    'sha256': '960f059b341be7ea5109e15fe0736ef8e44348d8ac0b2e568bd35ae9694a4c1f'}
METADATA_NAMES = {'canonical-at-release.md', 'owner-enabled-spec.json', 'parent-runtime-input.json',
    'binding-at-release.json', 'runtime-input-pins.json', 'current-preservation-before.json',
    'fresh-source-stats-before.json', 'all-four-source-stats-before.json', 'source-admission.json',
    'physical-preparation-receipt.json', 'physical-preparation-manifest.json'}
MAVEN_SOURCE = {
    'path': '/Users/leonardorozza/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn',
    'bytes': 6184,
    'sha256': 'f9381d0cb98abaaf9592dae421eddc497e84ed9bfb723b84c111d1350863c3a2'}
PUBLIC_ROOTS = (
    FAMILY, Path('/private/tmp/ordenfix-pro-review-chain-fueuys_0/source'),
    Path('/private/tmp/ordenfix-pro-recovery-v42csv-r2-tko2zam6'),
    PROJECT / 'release-validation.local', Path('/Volumes/DiscoExtern/Desktop/mvrg-backend'),
    Path('/Users/leonardorozza/.m2/repository'),
    Path('/Users/leonardorozza/Library/Java/JavaVirtualMachines/corretto-21.0.10/Contents/Home'),
    Path('/Library/Frameworks/Python.framework/Versions/3.10/bin'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_spec(spec):
    require(type(spec) is dict and set(spec) == SPEC_KEYS and type(spec['schema']) is int
            and spec['schema'] == 1, 'Exact schema1 capture specification')
    require(type(spec['runTimeoutSeconds']) in (int, float)
            and type(spec['totalTimeoutSeconds']) in (int, float)
            and math.isfinite(spec['runTimeoutSeconds']) and math.isfinite(spec['totalTimeoutSeconds'])
            and spec['runTimeoutSeconds'] == spec['totalTimeoutSeconds'] == 280,
            'Fixed outer280/280; no soft budget or extension')
    argv = spec['argv']
    require(type(argv) is list and len(argv) == 13 and all(type(v) is str and v and '\0' not in v for v in argv),
            'Closed current release argv')
    require(argv[:5] == [PYTHON, '-B', '-S', str(FAMILY / 'parent/parent_stages.py'),
            '--execute-parent-approved-recovery-v41-drift4-release']
            and argv[5] == '--bindings' and argv[7] == '--bindings-sha'
            and argv[9] == '--row' and argv[11] == '--physical-root'
            and argv[10] in ('0', '1', '2', '3') and re.fullmatch('[0-9a-f]{64}', argv[8]),
            'Only fixed local final V41 release entry and row')
    require(argv[6] in (str(FAMILY / 'inputs/final-environment-compiled-bindings-01.json'),
                       str(FAMILY / 'inputs/final-environment-post-runtime-bindings-01.json'))
            and argv[12] == str(FAMILY / 'physical' / ('row-%d' % (int(argv[10]) + 1))),
            'Exact COMPILED/POST_RUNTIME envelope and matching physical row')
    environment = {'HOME': str(FAMILY / 'home'), 'TMPDIR': str(FAMILY / 'tmp'),
        'PATH': '/usr/bin:/bin', 'LANG': 'C', 'LC_ALL': 'C', 'PYTHONDONTWRITEBYTECODE': '1',
        '__CF_USER_TEXT_ENCODING': '0x1F5:0x0:0x8'}
    require(type(spec['environment']) is dict and spec['environment'] == environment
            and all(type(v) is str for v in spec['environment'].values())
            and spec['cwd'] == str(FAMILY / 'parent'), 'Exact local cwd and clean ENV7')
    return spec


class RuntimeDependencies:
    Popen = staticmethod(subprocess.Popen)
    selector = staticmethod(selectors.DefaultSelector)
    set_blocking = staticmethod(os.set_blocking)
    read = staticmethod(os.read)
    clock = staticmethod(time.monotonic)
    sleep = staticmethod(time.sleep)

    @staticmethod
    def group_alive(group):
        try:
            os.killpg(group, 0)
        except ProcessLookupError:
            return False
        return True

    @staticmethod
    def kill_group(group, sig):
        os.killpg(group, sig)


def validate_capture_spec(spec):
    """Admit only common capture shape; callers retain their own source/argv gates."""
    require(type(spec) is dict and set(spec) == SPEC_KEYS and type(spec['schema']) is int
            and spec['schema'] == 1, 'Exact schema1 capture specification')
    require(all(type(spec[key]) in (int, float) and spec[key] == 280
                and math.isfinite(spec[key])
                for key in ('runTimeoutSeconds', 'totalTimeoutSeconds')),
            'Fixed outer280/280; no soft budget or extension')

    def absolute(value):
        return (type(value) is str and 0 < len(value) <= 65536
                and '\0' not in value and Path(value).is_absolute())

    argv = spec['argv']
    require(type(argv) is list and 1 <= len(argv) <= 64
            and all(type(value) is str and 0 < len(value) <= 65536 and '\0' not in value
                    for value in argv) and absolute(argv[0]), 'Bounded absolute capture argv')
    environment = spec['environment']
    fixed = {'PATH': '/usr/bin:/bin', 'LANG': 'C', 'LC_ALL': 'C',
             'PYTHONDONTWRITEBYTECODE': '1', '__CF_USER_TEXT_ENCODING': '0x1F5:0x0:0x8'}
    require(type(environment) is dict and set(environment) == set(fixed) | {'HOME', 'TMPDIR'}
            and all(type(environment[key]) is str and environment[key] == value
                    for key, value in fixed.items())
            and absolute(environment['HOME']) and absolute(environment['TMPDIR'])
            and absolute(spec['cwd']), 'Absolute local cwd and clean ENV7')
    return spec


def run_target(spec, output_dir, dependencies=None):
    """Retain the closed V41 release-family admission before shared capture."""
    validate_spec(spec)
    return capture_owned_session(spec, output_dir, dependencies)


def capture_owned_session(spec, output_dir, dependencies=None):
    """Capture one owned session; never infer Docker/JUnit success from exit0."""
    validate_capture_spec(spec)
    d = dependencies or RuntimeDependencies()
    output_dir = Path(output_dir)
    require(output_dir.is_dir() and not output_dir.is_symlink(), 'Existing ordinary capture output directory')
    require(not any((output_dir / name).exists() or (output_dir / name).is_symlink()
                    for name in ('target.stdout.bin', 'target.stderr.bin', 'parent-execution.json')),
            'CREATE_NEW capture leaves; no relaunch or overwrite')
    start = d.clock()
    hard_deadline = start + 280
    shutdown = None
    process, selector, group = None, None, None
    target_finish = None
    failures, signals, outputs = [], [], {}
    term_sent, kill_sent = False, False
    streams = {name: {'bytesObserved': 0, 'bytesSaved': 0, 'overflow': False,
                     'eof': False, 'closed': False, 'sha256': None} for name in ('stdout', 'stderr')}
    active = set()

    def alive():
        nonlocal shutdown
        if group is None:
            return False
        try:
            return d.group_alive(group)
        except OSError as error:
            now = d.clock()
            shutdown = min(hard_deadline, now + 30,
                           shutdown if shutdown is not None else hard_deadline)
            reason = 'Owned process group state UNKNOWN: ' + repr(error)
            if reason not in failures:
                failures.append(reason)
            # Signal only the session/group created by this capture. send does
            # not query alive(), so a failed query cannot recurse or extend time.
            send(signal.SIGTERM, now)
            return True

    def send(sig, now):
        nonlocal term_sent, kill_sent
        if group is None or (term_sent if sig == signal.SIGTERM else kill_sent):
            return
        if sig == signal.SIGTERM:
            term_sent = True
        else:
            kill_sent = True
        try:
            d.kill_group(group, sig)
            signals.append({'signal': 'TERM' if sig == signal.SIGTERM else 'KILL',
                            'ownedProcessGroup': group, 'atMonotonic': now})
        except ProcessLookupError:
            pass
        except OSError as error:
            failures.append('Owned group signal failed: ' + repr(error))

    def stop(reason, now):
        nonlocal shutdown
        if reason not in failures:
            failures.append(reason)
        shutdown = min(hard_deadline, now + 30, shutdown if shutdown is not None else hard_deadline)
        if alive():
            send(signal.SIGTERM, now)

    try:
        for name in streams:
            outputs[name] = (output_dir / ('target.' + name + '.bin')).open('xb')
        process = d.Popen(list(spec['argv']), cwd=spec['cwd'], env=dict(spec['environment']),
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            shell=False, close_fds=True, bufsize=0, start_new_session=True)
        group = process.pid
        selector = d.selector()
        for name in streams:
            pipe = getattr(process, name)
            d.set_blocking(pipe.fileno(), False)
            selector.register(pipe, selectors.EVENT_READ, name)
            active.add(name)
        while True:
            now = d.clock()
            exit_code = process.poll()
            if exit_code is not None and target_finish is None:
                target_finish = now
            group_alive = alive()
            if exit_code is not None and group_alive:
                stop('Owned descendant group survives reaped leader', now)
            if exit_code is not None and exit_code != 0:
                stop('Target exit is not zero', now)
            deadline = shutdown if shutdown is not None else hard_deadline
            if shutdown is not None and now >= deadline - 1 and alive():
                send(signal.SIGKILL, now)
            if now >= deadline:
                stop('Absolute capture deadline reached before complete closure', now)
                if alive():
                    send(signal.SIGKILL, now)
                break
            if exit_code is not None and not active and not alive():
                break
            wait = min(0.05, max(0, deadline - now))
            if not active:
                d.sleep(wait)
                continue
            for key, _ in selector.select(wait):
                name, pipe = key.data, key.fileobj
                if name not in active:
                    continue
                try:
                    chunk = d.read(pipe.fileno(), CHUNK_LIMIT)
                except (BlockingIOError, InterruptedError):
                    continue
                except OSError as error:
                    stop(name + ' read failure: ' + repr(error), d.clock())
                    chunk = None
                if chunk is None or chunk == b'':
                    streams[name]['eof'] = chunk == b''
                    selector.unregister(pipe)
                    pipe.close()
                    streams[name]['closed'] = True
                    active.remove(name)
                    continue
                if type(chunk) is not bytes or len(chunk) > CHUNK_LIMIT:
                    stop('Invalid bounded read chunk', d.clock())
                    continue
                stream = streams[name]
                stream['bytesObserved'] += len(chunk)
                remaining = STREAM_LIMIT - stream['bytesSaved']
                saved = chunk[:remaining]
                outputs[name].write(saved)
                stream['bytesSaved'] += len(saved)
                if len(chunk) > remaining:
                    stream['overflow'] = True
                    stop(name + ' stream exceeded8MiB', d.clock())
    except (Exception, KeyboardInterrupt) as error:
        now = d.clock()
        stop('Capture setup/collector failure: ' + repr(error), now)
        # Only this owned group is eligible; a missing group remains UNKNOWN.
        while group is not None and alive() and d.clock() < shutdown:
            now = d.clock()
            if now >= shutdown - 1:
                send(signal.SIGKILL, now)
            if process is not None:
                process.poll()
            d.sleep(min(0.05, max(0, shutdown - now)))
        if group is not None and alive():
            send(signal.SIGKILL, d.clock())
    finally:
        if selector is not None:
            selector.close()
        if process is not None:
            for name in streams:
                pipe = getattr(process, name, None)
                if pipe is not None and not streams[name]['closed']:
                    pipe.close()
                    streams[name]['closed'] = True
        for output in outputs.values():
            output.close()
    exit_code = process.poll() if process is not None else None
    if exit_code is not None and target_finish is None:
        target_finish = d.clock()
    group_gone = group is not None and not alive()
    finish = d.clock()
    if exit_code != 0:
        failures.append('Target exit is not zero: ' + repr(exit_code))
    if not group_gone:
        failures.append('Owned process group closure UNKNOWN')
    if not all(stream['eof'] and not stream['overflow'] for stream in streams.values()):
        failures.append('Incomplete or overflowing stream capture')
    if finish > hard_deadline:
        failures.append('Absolute280 capture budget exceeded')
    # Lifecycle finish above includes EOF/reap/group checks. Hash/receipt writes
    # below are explicitly post-capture bookkeeping, not additional run budget.
    for name in outputs:
        streams[name]['sha256'] = hash_file(output_dir / ('target.' + name + '.bin'))[1]
    result = {'schema': 1, 'scope': 'ROOT_V41_OWNED_RELEASE_CAPTURE_NOT_ORIGINAL_RESULT',
        'passed': not failures, 'startedMonotonic': start, 'finishedMonotonic': finish,
        'wallSeconds': finish - start, 'absoluteDeadlineMonotonic': hard_deadline,
        'firstMinShutdownDeadlineMonotonic': shutdown, 'targetFinishedMonotonic': target_finish,
        'argv': spec['argv'], 'cwd': spec['cwd'], 'environment': spec['environment'],
        'targetPid': process.pid if process is not None else None, 'ownedProcessGroup': group,
        'processGroupGone': group_gone, 'exit': exit_code, 'targetReaped': exit_code is not None,
        'stdout': streams['stdout'], 'stderr': streams['stderr'], 'signals': signals, 'failures': failures,
        'readWorkersCreated': 0, 'readWorkersJoined': True, 'ownerExecutionPossible': process is not None,
        'originalResultAccredited': False, 'ownerCleanupAccredited': False,
        'postCaptureBookkeepingOutsideExecutionBudget': True}
    write_new(output_dir / 'parent-execution.json', result)
    return result


def hash_file(path):
    path = Path(path)
    digest, size = hashlib.sha256(), 0
    before = path.lstat()
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    with os.fdopen(descriptor, 'rb') as source:
        opened = os.fstat(source.fileno())
        fields = ('st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_gid', 'st_nlink',
                  'st_size', 'st_mtime_ns', 'st_ctime_ns')
        require(stat.S_ISREG(opened.st_mode)
                and all(getattr(before, field) == getattr(opened, field) for field in fields),
                'Ordinary opened SOURCE matches exact path identity')
        for block in iter(lambda: source.read(CHUNK_LIMIT), b''):
            size += len(block)
            digest.update(block)
        after = os.fstat(source.fileno())
        require(all(getattr(opened, field) == getattr(after, field) for field in fields)
                and all(getattr(opened, field) == getattr(path.lstat(), field) for field in fields),
                'Full streaming read preserved lstat/fstat identity')
    return size, digest.hexdigest()


def observed_stat(path):
    value = Path(path).lstat()
    return {'device': value.st_dev, 'inode': value.st_ino, 'mode': stat.S_IMODE(value.st_mode),
            'uid': value.st_uid, 'gid': value.st_gid, 'nlink': value.st_nlink,
            'mtimeNs': value.st_mtime_ns, 'ctimeNs': value.st_ctime_ns}


def strict_pairs(pairs):
    value = {}
    for key, item in pairs:
        require(key not in value, 'Duplicate JSON key')
        value[key] = item
    return value


def read_json(path):
    with Path(path).open('rb') as source:
        raw = source.read(STREAM_LIMIT + 1)
    require(len(raw) <= STREAM_LIMIT, 'Readable JSON below8MiB')
    return json.loads(raw, object_pairs_hook=strict_pairs,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Nonfinite JSON')))


def check_pin(value, full_stat=False):
    require(type(value) is dict and set(value) == PIN_KEYS | ({'stat'} if full_stat else set())
            and type(value['path']) is str and Path(value['path']).is_absolute()
            and type(value['bytes']) is int and value['bytes'] >= 0
            and type(value['sha256']) is str and re.fullmatch('[0-9a-f]{64}', value['sha256']),
            'Closed typed SOURCE pin')
    path = Path(value['path'])
    own_driver = PROJECT / 'scripts/recovery_v41_outer_capture.py'
    exact_maven = path == Path(MAVEN_SOURCE['path'])
    if exact_maven:
        require({key: value[key] for key in PIN_KEYS} == MAVEN_SOURCE,
                'Only the independently pinned exact Maven binary, not neighboring paths')
    require(path in (own_driver, CANONICAL) or exact_maven
            or any(path.is_relative_to(root) for root in PUBLIC_ROOTS),
            'Exact known local SOURCE root')
    require(not {'..', '.aws', '.codex', '.claude'}.intersection(path.parts), 'Private configuration not SOURCE')
    if path.is_relative_to(FAMILY / 'physical'):
        relative = path.relative_to(FAMILY / 'physical')
        require(len(relative.parts) == 2 and relative.parts[0] in ('row-1', 'row-2', 'row-3', 'row-4')
                and relative.parts[1] in METADATA_NAMES, 'Only immutable preparation leaves, not runtimeDATA')
    require(not path.is_relative_to(FAMILY / 'capture/actual-original'), 'Original output DATA is not SOURCE')
    for ancestor in path.parents:
        require(not ancestor.is_symlink(), 'SOURCE ancestor symlink denied')
    if path.is_symlink():
        require(str(path) == PYTHON and os.readlink(path) == 'python3.10', 'Only approved installed Python alias')
    else:
        info = path.lstat()
        require(stat.S_ISREG(info.st_mode) and info.st_nlink == 1 and info.st_uid in (0, 501), 'Ordinary admitted SOURCE')
        if exact_maven:
            require(info.st_uid == 501 and stat.S_IMODE(info.st_mode) == 0o755,
                    'Actual fixed ordinary Maven SOURCE ownership/mode')
    before = observed_stat(path)
    if full_stat:
        require(type(value['stat']) is dict and set(value['stat']) == STAT_KEYS
                and all(type(v) is int for v in value['stat'].values()) and before == value['stat'], 'Exact SOURCE stat8')
    size, digest = hash_file(path.resolve() if path.is_symlink() else path)
    require(size == value['bytes'] and digest == value['sha256'] and observed_stat(path) == before,
            'Full SOURCE byte/hash/stat8 preservation')
    return dict(value)


def write_new(path, value):
    raw = (json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + '\n').encode()
    require(len(raw) <= STREAM_LIMIT, 'Readable output below8MiB')
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'wb') as output:
        output.write(raw)


def validate_complete_manifest(manifest, spec, driver_pin):
    """Retain the fixed independently observed complete6021 union, not a subset."""
    require(type(manifest) is dict and set(manifest) == {'schema', 'files'}
            and type(manifest['schema']) is int and manifest['schema'] == 1
            and type(manifest['files']) is list and manifest['files'], 'Closed complete immutable SOURCE manifest')
    rows = manifest['files']
    require(all(type(row) is dict and set(row) == PIN_KEYS | {'stat'} for row in rows), 'Full typed SOURCE records')
    by_path = {row['path']: row for row in rows}
    require(len(by_path) == len(rows), 'Unique complete SOURCE pins')
    check_pin(IMAGE_QUALIFICATION)
    observed = read_json(IMAGE_QUALIFICATION['path'])
    require(observed['passed'] is True and observed['fullSourceTwoPassesExact'] is True
            and len(observed['records']) == 6021, 'Exact qualified complete6021 source baseline')
    baseline = {row['path']: row for row in observed['records']}
    require(len(baseline) == 6021 and str(CANONICAL) in baseline, 'Unique recorded baseline and old canonical')
    for path, record in baseline.items():
        if path != str(CANONICAL):
            require(path in by_path and by_path[path] == record,
                    'Retain every fixed full SOURCE record except the superseded live canonical: ' + path)
    # The new held canonical is explicitly pinned/read back, not the stale
    # pre-documentation identity in the image qualification.
    require(str(CANONICAL) in by_path and driver_pin['path'] in by_path
            and {key: by_path[driver_pin['path']][key] for key in PIN_KEYS} == driver_pin,
            'Actual tracked driver and fresh held canonical retained')
    require(spec['argv'][3] in by_path and spec['argv'][6] in by_path, 'Parent/current binding retained')
    metadata_root = Path(spec['argv'][12])
    for name in METADATA_NAMES:
        require(str(metadata_root / name) in by_path, 'All selected immutable metadata SOURCE leaves retained')
    for row in rows:
        check_pin(row, full_stat=True)
    return rows


def main(argv):
    require(len(argv) == 5 and argv[0] == '--execute-root-approved-v41-owned-release-capture'
            and argv[1] == '--input' and argv[3] == '--input-sha', 'Explicit ROOT owned release envelope')
    path = Path(argv[2])
    require(path.is_relative_to(FAMILY / 'inputs') and re.fullmatch('[0-9a-f]{64}', argv[4]), 'Fixed local pinned request')
    request_pin = {'path': str(path), 'bytes': path.stat().st_size, 'sha256': argv[4]}
    check_pin(request_pin)
    request_stat = observed_stat(path)
    require(request_stat['uid'] == 501 and request_stat['mode'] == 0o600
            and request_stat['nlink'] == 1, 'Private ROOT request control file')
    request = read_json(path)
    require(type(request) is dict and set(request) == {'schema', 'authority', 'spec', 'sourceManifest', 'driverPin'}
            and type(request['schema']) is int and request['schema'] == 1
            and request['authority'] == 'ROOT_APPROVED_V41_OWNED_RELEASE_OUTER_CAPTURE', 'Closed explicit release request')
    spec = validate_spec(request['spec'])
    require(request['driverPin']['path'] == str(Path(__file__).resolve()), 'Actual tracked driver SOURCE pin')
    check_pin(request['driverPin'])
    check_pin(request['sourceManifest'])
    manifest_path = Path(request['sourceManifest']['path'])
    manifest_stat = observed_stat(manifest_path)
    require(manifest_path.parent == FAMILY / 'inputs' and manifest_stat['uid'] == 501
            and manifest_stat['mode'] == 0o600 and manifest_stat['nlink'] == 1,
            'Private fixed-input manifest control file')
    manifest = read_json(request['sourceManifest']['path'])
    rows = validate_complete_manifest(manifest, spec, request['driverPin'])
    row = int(spec['argv'][10])
    parent = FAMILY / 'capture/actual-original'
    info = parent.lstat()
    require(stat.S_ISDIR(info.st_mode) and not parent.is_symlink()
            and info.st_uid == 501 and stat.S_IMODE(info.st_mode) == 0o700, 'Existing exact private ROOT output parent')
    output = parent / ('row-%d' % (row + 1))
    marker = parent / ('row-%d-once.json' % (row + 1))
    require(not output.exists() and not output.is_symlink() and not marker.exists() and not marker.is_symlink(),
            'Fixed row consume/output virgin; never reset or retry')
    write_new(marker, {'schema': 1, 'status': 'ROOT_RELEASE_ENVELOPE_CONSUMED_NO_RETRY',
        'originalRowIndex': row, 'input': request_pin, 'driverPin': request['driverPin'],
        'sourceManifest': request['sourceManifest'], 'automaticRetryPermitted': False,
        'originalResultAccredited': False})
    output.mkdir(mode=0o700)
    previous_umask = os.umask(0o077)
    try:
        result = run_target(spec, output)
    finally:
        os.umask(previous_umask)
    preserved, error = True, None
    try:
        check_pin(request_pin)
        check_pin(request['driverPin'])
        check_pin(request['sourceManifest'])
        check_pin(IMAGE_QUALIFICATION)
        for row in rows:
            check_pin(row, full_stat=True)
    except (ValueError, OSError) as failure:
        preserved, error = False, repr(failure)
    qualification = {'schema': 1, 'capturePassed': result['passed'], 'sourceBeforeAfterExact': preserved,
        'sourcePreservationFailure': error, 'captureOnlyPassed': result['passed'] and preserved,
        'originalResultAccredited': False, 'ownerCleanupAccredited': False,
        'runtimeAuthority': False, 'productionAuthority': False,
        'sourceReadbacksOutsideExecutionBudget': True}
    write_new(output / 'source-preservation.json', qualification)
    print(json.dumps({'captureOnlyPassed': qualification['captureOnlyPassed'],
                      'receipt': str(output / 'parent-execution.json'), 'originalResultAccredited': False}))
    return 0 if qualification['captureOnlyPassed'] else 1


if __name__ == '__main__':
    resource.setrlimit(resource.RLIMIT_FSIZE, (STREAM_LIMIT, STREAM_LIMIT))
    try:
        raise SystemExit(main(sys.argv[1:]))
    except (ValueError, OSError) as error:
        print(json.dumps({'passed': False, 'preflightOrPreservedFailure': repr(error),
                          'originalResultAccredited': False}), file=sys.stderr)
        raise SystemExit(2)
