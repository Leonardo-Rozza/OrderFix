"""ROOT-only real harmless POSIX smoke checks for the outer collector API.

The production CLI is never called. An explicit test dependency seam checks
the fixed declared release argv, then records its harmless substituted OS argv.
Clock/selector/sleep scaling is test-only, not production timer accreditation.
Actual capture and fault evidence is CREATE_NEW and is never auto-deleted.
"""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import selectors
import signal
import stat
import subprocess
import sys
import time
import unittest
from unittest import mock


PYTHON = '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3'
FAMILY = Path('/private/tmp/ordenfix-pro-recovery-v41-final-m3daoe_6')
DURABLE = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/recovery-v41-final-u1in8maq')
CANDIDATE = OUTPUT_ROOT = None
CLOCK_SCALE = 20
OUTPUT_BOUND = 8388608


def specification():
    return {
        'schema': 1,
        'argv': [PYTHON, '-B', '-S', str(FAMILY / 'parent/parent_stages.py'),
                 '--execute-parent-approved-recovery-v41-drift4-release',
                 '--bindings', str(FAMILY / 'inputs/final-environment-compiled-bindings-01.json'),
                 '--bindings-sha', 'a' * 64, '--row', '0',
                 '--physical-root', str(FAMILY / 'physical/row-1')],
        'cwd': str(FAMILY / 'parent'),
        'environment': {
            'HOME': str(FAMILY / 'home'), 'TMPDIR': str(FAMILY / 'tmp'),
            'PATH': '/usr/bin:/bin', 'LANG': 'C', 'LC_ALL': 'C',
            'PYTHONDONTWRITEBYTECODE': '1', '__CF_USER_TEXT_ENCODING': '0x1F5:0x0:0x8'},
        'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280,
    }


def write_new(path, value):
    raw = (json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + '\n').encode()
    if len(raw) > OUTPUT_BOUND:
        raise ValueError('Smoke evidence exceeded unchanged8MiB bound')
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'wb') as output:
        output.write(raw)


def source_pin(path):
    before = path.lstat()
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        raise ValueError('Ordinary nonsymlink candidate SOURCE required')
    raw = path.read_bytes()
    after = path.lstat()
    fields = ('st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_gid', 'st_nlink',
              'st_size', 'st_mtime_ns', 'st_ctime_ns')
    if any(getattr(before, key) != getattr(after, key) for key in fields):
        raise ValueError('Candidate SOURCE changed during readback')
    return {'path': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'stat': {key: getattr(before, key) for key in fields}}


class ScaledSelector:
    def __init__(self):
        self.actual = selectors.DefaultSelector()

    def register(self, *args, **kwargs):
        return self.actual.register(*args, **kwargs)

    def unregister(self, *args, **kwargs):
        return self.actual.unregister(*args, **kwargs)

    def select(self, timeout=None):
        return self.actual.select(None if timeout is None else timeout / CLOCK_SCALE)

    def close(self):
        self.actual.close()


class PosixDependencies:
    """Real owned OS dependencies; only the test Popen argv is substituted."""
    selector = staticmethod(ScaledSelector)
    set_blocking = staticmethod(os.set_blocking)
    read = staticmethod(os.read)

    def __init__(self, spec, directory, program):
        self.spec, self.directory, self.program = spec, directory, program
        self.started = time.monotonic()
        self.process = None
        self.launches, self.signals = [], []
        self.group_queries = 0
        self.queried_groups = set()
        for name in ('home', 'tmp'):
            (directory / name).mkdir(mode=0o700)

    def clock(self):
        return 1000.0 + (time.monotonic() - self.started) * CLOCK_SCALE

    def sleep(self, seconds):
        time.sleep(seconds / CLOCK_SCALE)

    def Popen(self, argv, **kwargs):
        if self.process is not None or argv != self.spec['argv']:
            raise AssertionError('Only one exact declared release-shaped launch is permitted')
        expected = {'cwd': self.spec['cwd'], 'env': self.spec['environment'],
                    'stdin': subprocess.DEVNULL, 'stdout': subprocess.PIPE, 'stderr': subprocess.PIPE,
                    'shell': False, 'close_fds': True, 'bufsize': 0, 'start_new_session': True}
        if kwargs != expected:
            raise AssertionError('Actual collector must request its exact owned-session launch flags')
        actual_argv = [PYTHON, '-B', '-S', '-c', self.program]
        actual_environment = dict(self.spec['environment'], HOME=str(self.directory / 'home'),
                                  TMPDIR=str(self.directory / 'tmp'))
        self.launches.append({'declaredArgv': list(argv), 'actualOsArgv': actual_argv,
                              'declaredCwd': kwargs['cwd'], 'actualOsCwd': str(self.directory),
                              'declaredEnvironment': dict(kwargs['env']),
                              'actualOsEnvironment': actual_environment,
                              'startNewSession': True, 'actualReleaseCliExecuted': False})
        self.process = subprocess.Popen(actual_argv, cwd=self.directory, env=actual_environment,
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            shell=False, close_fds=True, bufsize=0, start_new_session=True)
        self.launches[-1]['actualPid'] = self.process.pid
        return self.process

    def owned_group(self, group):
        if self.process is None or type(group) is not int or group != self.process.pid:
            raise AssertionError('Foreign process-group query or signal is forbidden')

    def group_alive(self, group):
        self.owned_group(group)
        self.group_queries += 1
        self.queried_groups.add(group)
        try:
            os.killpg(group, 0)
        except ProcessLookupError:
            return False
        return True

    def kill_group(self, group, sig):
        self.owned_group(group)
        if sig not in (signal.SIGTERM, signal.SIGKILL):
            raise AssertionError('Only owned TERM/KILL is permitted')
        self.signals.append({'group': group, 'signal': int(sig), 'realMonotonic': time.monotonic(),
                             'scaledMonotonic': self.clock(), 'source': 'collector'})
        os.killpg(group, sig)

    def emergency_cleanup(self):
        """Preserve failed collector truth; clean only its known own OS group."""
        errors, signals = [], []
        if self.process is None:
            return {'knownGroup': None, 'needed': False, 'groupGone': False, 'errors': [], 'signals': []}
        group = self.process.pid
        needed = self.group_alive(group)
        if needed:
            try:
                os.killpg(group, signal.SIGKILL)
                signals.append({'group': group, 'signal': int(signal.SIGKILL),
                                'realMonotonic': time.monotonic(), 'source': 'post-smoke-emergency-cleanup'})
            except ProcessLookupError:
                pass
            except OSError as error:
                errors.append(repr(error))
        deadline = time.monotonic() + 5
        while self.group_alive(group) and time.monotonic() < deadline:
            self.process.poll()
            time.sleep(0.01)
        try:
            self.process.wait(timeout=max(0.001, deadline - time.monotonic()))
        except (OSError, subprocess.TimeoutExpired) as error:
            errors.append(repr(error))
        return {'knownGroup': group, 'needed': needed, 'groupGone': not self.group_alive(group),
                'errors': errors, 'signals': signals, 'realDeadlineMonotonic': deadline}


NORMAL = "import os; os.write(1,b'normal stdout\\n'); os.write(2,b'normal stderr\\n')"
NONZERO = "import os; os.write(1,b'nonzero stdout\\n'); os.write(2,b'nonzero stderr\\n'); raise SystemExit(7)"
DESCENDANT = '''import os, signal
read_fd, write_fd = os.pipe()
child = os.fork()
if child == 0:
    os.close(read_fd)
    signal.signal(signal.SIGTERM, signal.SIG_IGN)
    os.write(write_fd, b'R')
    os.close(write_fd)
    os.write(2, b'owned pipe-holding child ready\\n')
    while True:
        signal.pause()
os.close(write_fd)
assert os.read(read_fd, 1) == b'R'
os.close(read_fd)
os.write(1, ('owned-child=%d group=%d session=%d\\n' % (child, os.getpgrp(), os.getsid(0))).encode())
os._exit(0)
'''


class OuterPosixSmokeTests(unittest.TestCase):
    def capture(self, name, program):
        directory = OUTPUT_ROOT / name
        directory.mkdir(mode=0o700)
        spec = specification()
        dependencies = PosixDependencies(spec, directory, program)
        result, exception = None, None
        real_start = time.monotonic()
        try:
            result = CANDIDATE.run_target(spec, directory, dependencies)
        except BaseException as error:
            exception = repr(error)
        finally:
            cleanup = dependencies.emergency_cleanup()
            qualification = {
                'scope': 'HARMLESS_POSIX_COLLECTOR_API_SMOKE_ONLY', 'case': name,
                'actualReleaseCliExecuted': False, 'originalTestExecuted': False,
                'dockerApiExecuted': False, 'ownerCleanupAccredited': False,
                'originalResultAccredited': False, 'runtimeAuthority': False,
                'productionTimerAccredited': False, 'scaledClockTest': True,
                'clockScale': CLOCK_SCALE, 'fixedDriverBudgetsUnchanged': [280, 280, 30],
                'realStartedMonotonic': real_start, 'realFinishedMonotonic': time.monotonic(),
                'launches': dependencies.launches, 'collectorSignals': dependencies.signals,
                'queriedOwnedGroups': sorted(dependencies.queried_groups),
                'groupQueryCount': dependencies.group_queries, 'collectorResult': result,
                'collectorException': exception, 'postSmokeKnownGroupCleanup': cleanup,
                'emergencyCleanupDoesNotRepairCollectorResult': True,
            }
            write_new(directory / 'smoke-observation.json', qualification)
        self.assertIsNone(exception, qualification)
        self.assertIsNotNone(result)
        self.assertEqual(len(dependencies.launches), 1)
        self.assertEqual(dependencies.queried_groups, {dependencies.process.pid})
        self.assertTrue(cleanup['groupGone'], qualification)
        self.assertEqual(cleanup['errors'], [])
        self.assertFalse(cleanup['needed'], 'Collector must close its own group; emergency cleanup is not PASS')
        self.assertEqual(result['ownedProcessGroup'], dependencies.process.pid)
        self.assertTrue(result['targetReaped'])
        self.assertTrue(result['processGroupGone'], qualification)
        self.assertFalse(result['originalResultAccredited'])
        self.assertFalse(result['ownerCleanupAccredited'])
        for channel in ('stdout', 'stderr'):
            data = (directory / ('target.' + channel + '.bin')).read_bytes()
            self.assertTrue(result[channel]['eof'], qualification)
            self.assertTrue(result[channel]['closed'])
            self.assertFalse(result[channel]['overflow'])
            self.assertEqual(result[channel]['bytesSaved'], len(data))
            self.assertEqual(result[channel]['sha256'], hashlib.sha256(data).hexdigest())
        return result, directory, dependencies

    def test_01_normal_stdout_stderr_exit_zero(self):
        result, directory, _ = self.capture('normal', NORMAL)
        self.assertTrue(result['passed'], result)
        self.assertEqual(result['exit'], 0)
        self.assertEqual(result['signals'], [])
        self.assertEqual((directory / 'target.stdout.bin').read_bytes(), b'normal stdout\n')
        self.assertEqual((directory / 'target.stderr.bin').read_bytes(), b'normal stderr\n')

    def test_02_nonzero_exit_has_no_functional_credit(self):
        result, directory, _ = self.capture('nonzero', NONZERO)
        self.assertFalse(result['passed'])
        self.assertEqual(result['exit'], 7)
        self.assertTrue(any('Target exit is not zero' in failure for failure in result['failures']))
        self.assertEqual((directory / 'target.stdout.bin').read_bytes(), b'nonzero stdout\n')
        self.assertEqual((directory / 'target.stderr.bin').read_bytes(), b'nonzero stderr\n')

    def test_03_reaped_leader_pipe_holder_requires_owned_term_kill(self):
        result, directory, dependencies = self.capture('descendant', DESCENDANT)
        self.assertFalse(result['passed'], 'Expected fault is not capture or original success')
        self.assertEqual(result['exit'], 0, 'The leader itself exits0 before its child is killed')
        self.assertTrue(any('descendant group survives reaped leader' in value for value in result['failures']))
        self.assertEqual([entry['signal'] for entry in result['signals']], ['TERM', 'KILL'])
        self.assertEqual([entry['signal'] for entry in dependencies.signals], [signal.SIGTERM, signal.SIGKILL])
        self.assertTrue(all(entry['ownedProcessGroup'] == dependencies.process.pid for entry in result['signals']))
        declared = re.fullmatch(rb'owned-child=([0-9]+) group=([0-9]+) session=([0-9]+)\n',
                                (directory / 'target.stdout.bin').read_bytes())
        self.assertIsNotNone(declared, 'Actual child/group/session witness must be captured')
        self.assertNotEqual(int(declared[1]), dependencies.process.pid)
        self.assertEqual(int(declared[2]), dependencies.process.pid)
        self.assertEqual(int(declared[3]), dependencies.process.pid)
        self.assertEqual((directory / 'target.stderr.bin').read_bytes(), b'owned pipe-holding child ready\n')
        deadline = result['firstMinShutdownDeadlineMonotonic']
        self.assertLessEqual(deadline, result['targetFinishedMonotonic'] + 30)
        self.assertLessEqual(deadline, result['absoluteDeadlineMonotonic'])
        self.assertLessEqual(result['finishedMonotonic'], deadline)


def main():
    global CANDIDATE, OUTPUT_ROOT
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--candidate-sha', required=True)
    parser.add_argument('--output-root', type=Path, required=True)
    args = parser.parse_args()
    if os.name != 'posix' or sys.version_info[:2] != (3, 10) or sys.flags.no_site != 1 or not sys.dont_write_bytecode:
        parser.error('POSIX installed Python3.10-B-S invocation is required')
    if not args.candidate.is_absolute() or not re.fullmatch('[0-9a-f]{64}', args.candidate_sha):
        parser.error('Explicit absolute candidate SOURCE and observed SHA required')
    before = source_pin(args.candidate)
    if before['sha256'] != args.candidate_sha:
        parser.error('Actual candidate SOURCE hash differs')
    OUTPUT_ROOT = args.output_root
    parent = OUTPUT_ROOT.parent.lstat()
    if not OUTPUT_ROOT.is_absolute() or not OUTPUT_ROOT.is_relative_to(DURABLE) \
            or OUTPUT_ROOT.exists() or OUTPUT_ROOT.is_symlink() \
            or not stat.S_ISDIR(parent.st_mode) or parent.st_uid != os.getuid() \
            or stat.S_IMODE(parent.st_mode) != 0o700 \
            or any(path.is_symlink() for path in OUTPUT_ROOT.parents):
        parser.error('Fresh output root under an owned nonsymlink private0700 directory required')
    OUTPUT_ROOT.mkdir(mode=0o700)
    loader = importlib.util.spec_from_file_location('v41_posix_smoke_candidate', args.candidate)
    CANDIDATE = importlib.util.module_from_spec(loader)
    with mock.patch('subprocess.Popen', side_effect=AssertionError('Candidate import must be inert')), \
            mock.patch('os.killpg', side_effect=AssertionError('Candidate import must not signal')), \
            mock.patch('socket.socket', side_effect=AssertionError('No socket during candidate import')):
        loader.loader.exec_module(CANDIDATE)
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(OuterPosixSmokeTests)
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    after = source_pin(args.candidate)
    preserved = before == after
    summary = {'scope': 'THREE_HARMLESS_POSIX_SMOKES_NOT_ORIGINAL_ADMISSION',
               'candidateBefore': before, 'candidateAfter': after, 'sourceBeforeAfterExact': preserved,
               'testsRun': result.testsRun, 'failures': len(result.failures), 'errors': len(result.errors),
               'smokePassed': result.wasSuccessful() and preserved, 'clockScale': CLOCK_SCALE,
               'scaledClockTest': True, 'productionTimerAccredited': False,
               'actualReleaseCliExecuted': False, 'originalTestExecuted': False,
               'runtimeAuthority': False, 'nativeApproval': False}
    write_new(OUTPUT_ROOT / 'smoke-summary.json', summary)
    return 0 if summary['smokePassed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
