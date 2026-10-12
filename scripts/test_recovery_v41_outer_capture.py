"""Frozen focused ROOT280 contract tests; every process dependency is fake.

The same runner loads either the actual inert parent_run baseline or the new
outer capture SOURCE. Baseline failures concern the new outer/group contract,
not assertions about the existing inner capture or original recovery behavior.
"""
import argparse
import copy
import importlib.util
from pathlib import Path
import signal
import tempfile
import unittest
from unittest import mock

FAMILY = Path('/private/tmp/ordenfix-pro-recovery-v41-final-m3daoe_6')
PYTHON = '/Library/Frameworks/Python.framework/Versions/3.10/bin/python3'
CANDIDATE = None


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
        'runTimeoutSeconds': 280,
        'totalTimeoutSeconds': 280,
    }


class FakePipe:
    def __init__(self, descriptor):
        self.descriptor = descriptor
        self.closed = False

    def fileno(self):
        return self.descriptor

    def close(self):
        self.closed = True


class FakeProcess:
    pid = 40017

    def __init__(self, dependencies):
        self.dependencies = dependencies
        self.stdout, self.stderr = FakePipe(21), FakePipe(22)
        self.leader_stopped = False

    def poll(self):
        if self.leader_stopped:
            return -9
        finish = self.dependencies.leader_finish
        if finish is not None and self.dependencies.elapsed >= finish:
            return self.dependencies.exit_code
        return None

    def terminate(self):
        # A leader-only stop deliberately leaves descendant group state intact.
        self.dependencies.leader_signals.append('TERM')
        self.leader_stopped = True

    def kill(self):
        self.dependencies.leader_signals.append('KILL')
        self.leader_stopped = True

    def wait(self, timeout=None):
        result = self.poll()
        if result is None:
            raise TimeoutError('Fake leader has not exited')
        return result


class FakeSelector:
    def __init__(self, dependencies):
        self.dependencies = dependencies
        self.registered = {}
        self.closed = False

    def register(self, pipe, events, data):
        self.registered[pipe.fileno()] = (pipe, data)

    def unregister(self, pipe):
        del self.registered[pipe.fileno()]

    def select(self, timeout=None):
        self.dependencies.advance(0.05 if timeout is None else timeout)
        keys = []
        for pipe, data in self.registered.values():
            key = type('SelectorKey', (), {'fileobj': pipe, 'data': data})()
            keys.append((key, 1))
        return keys

    def close(self):
        self.closed = True


class FakeDependencies:
    """Operating-system seam only: no substitute admission/classifier policy."""
    def __init__(self, leader_finish=0.1, exit_code=0, descendant=False,
                 term_effective=True, group_never_exits=False, hold_pipes=False,
                 read_error=False, overflow=False, setup_error=False):
        self.now = 100.0
        self.leader_finish, self.exit_code = leader_finish, exit_code
        self.descendant, self.term_effective = descendant, term_effective
        self.group_never_exits, self.hold_pipes = group_never_exits, hold_pipes
        self.read_error, self.overflow, self.setup_error = read_error, overflow, setup_error
        self.group_stopped = False
        self.launches, self.group_signals, self.leader_signals = [], [], []
        self.read_sizes, self.chunk_count = [], 0
        self.process = FakeProcess(self)
        self.selector_instance = FakeSelector(self)

    @property
    def elapsed(self):
        return round(self.now - 100.0, 6)

    def advance(self, seconds):
        if seconds < 0:
            raise AssertionError('Negative fake wait')
        self.now = round(self.now + seconds, 6)
        if self.elapsed > 281:
            raise AssertionError('Engine extended absolute280 budget')

    def clock(self):
        return self.now

    def sleep(self, seconds):
        self.advance(seconds)

    def Popen(self, argv, **kwargs):
        self.launches.append((argv, kwargs))
        if self.setup_error:
            raise OSError('Controlled spawn failure')
        return self.process

    def selector(self):
        return self.selector_instance

    def set_blocking(self, descriptor, blocking):
        if descriptor not in (21, 22) or blocking is not False:
            raise AssertionError('Only owned pipe nonblocking setup')

    def group_alive(self, group):
        if group != self.process.pid:
            raise AssertionError('Foreign process group inspected')
        if self.group_never_exits:
            return True
        if self.group_stopped:
            return False
        return self.descendant or self.process.poll() is None

    def kill_group(self, group, sig):
        if group != self.process.pid or sig not in (signal.SIGTERM, signal.SIGKILL):
            raise AssertionError('Foreign group or unexpected signal')
        self.group_signals.append((group, sig, self.now))
        if not self.group_never_exits and (sig == signal.SIGKILL or self.term_effective):
            self.group_stopped = True
            if self.process.poll() is None:
                self.process.leader_stopped = True

    def read(self, descriptor, size):
        self.read_sizes.append(size)
        if size != 65536:
            raise AssertionError('Changed65536 read chunk')
        if self.read_error and descriptor == 21:
            self.read_error = False
            raise OSError('Controlled stdout read failure')
        if self.overflow and descriptor == 21 and self.chunk_count < 129:
            self.chunk_count += 1
            return b'x' * 65536
        if self.hold_pipes and self.group_alive(self.process.pid):
            raise BlockingIOError()
        if self.process.poll() is None:
            raise BlockingIOError()
        return b''


class OuterCaptureTests(unittest.TestCase):
    def capture(self, dependencies, mutate=None):
        spec = specification()
        if mutate:
            mutate(spec)
        # No target is ever started: fake dependencies own every process seam.
        with tempfile.TemporaryDirectory(prefix='v41-outer-unit-') as directory:
            result = CANDIDATE.run_target(spec, Path(directory), dependencies)
            files = {path.name: path.read_bytes() for path in Path(directory).iterdir() if path.is_file()}
        self.assertEqual(len(dependencies.launches), 1)
        return result, files

    def test_01_exact_outer280_spec_is_admitted(self):
        try:
            admitted = CANDIDATE.validate_spec(specification())
        except ValueError as error:
            self.fail('Valid new ROOT280/280 envelope rejected: ' + str(error))
        self.assertEqual(admitted, specification())

    def test_02_no_other_or_boolean_budget_is_admitted(self):
        for run, total in ((240, 270), (270, 280), (280, 281), (True, 280), (280, True), (280, float('nan'))):
            with self.subTest(run=run, total=total):
                spec = specification()
                spec['runTimeoutSeconds'], spec['totalTimeoutSeconds'] = run, total
                with self.assertRaises(ValueError):
                    CANDIDATE.validate_spec(spec)

    def test_03_current_closed_release_argv_only(self):
        for change in ('legacy', 'owner-direct', 'shell', 'foreign-row', 'extra'):
            with self.subTest(change=change):
                spec = specification()
                if change == 'legacy':
                    spec['argv'][4] = '--execute-parent-approved-recovery-v42csv-release'
                elif change == 'owner-direct':
                    spec['argv'][3] = str(FAMILY / 'source/owner_main.py')
                elif change == 'shell':
                    spec['argv'] = ['/bin/sh', '-c', 'true']
                elif change == 'foreign-row':
                    spec['argv'][-1] = str(FAMILY / 'physical/row-2')
                else:
                    spec['argv'].append('--retry')
                with self.assertRaises(ValueError):
                    CANDIDATE.validate_spec(spec)

    def test_04_closed_synthetic_environment_and_cwd(self):
        for change in ('extra', 'path', 'locale', 'home', 'cwd', 'schema'):
            with self.subTest(change=change):
                spec = specification()
                if change == 'extra':
                    spec['environment']['DOCKER_HOST'] = 'tcp://foreign'
                elif change == 'path':
                    spec['environment']['PATH'] = '/usr/local/bin:/usr/bin:/bin'
                elif change == 'locale':
                    spec['environment']['LANG'] = 'en_US.utf8'
                elif change == 'home':
                    spec['environment']['HOME'] = '/Users/foreign'
                elif change == 'cwd':
                    spec['cwd'] = '/private/tmp/foreign'
                else:
                    spec['schema'] = True
                with self.assertRaises(ValueError):
                    CANDIDATE.validate_spec(spec)

    def test_05_success_requires_owned_session_and_group_gone(self):
        dependencies = FakeDependencies()
        result, files = self.capture(dependencies)
        self.assertTrue(result['passed'])
        self.assertTrue(dependencies.launches[0][1].get('start_new_session'))
        self.assertIs(result.get('processGroupGone'), True)
        self.assertEqual(result.get('ownedProcessGroup'), dependencies.process.pid)
        self.assertEqual(result['absoluteDeadlineMonotonic'], 380.0)
        self.assertLessEqual(result['finishedMonotonic'], 380.0)
        self.assertTrue(result['targetReaped'])
        self.assertTrue(result['stdout']['eof'] and result['stderr']['eof'])
        self.assertIn('parent-execution.json', files)

    def test_06_truthful_owner_possible_no_original_success_authority(self):
        result, _ = self.capture(FakeDependencies())
        self.assertIs(result.get('ownerExecutionPossible'), True)
        self.assertIs(result.get('originalResultAccredited'), False)
        self.assertIs(result.get('ownerCleanupAccredited'), False)
        self.assertNotEqual(result.get('scope'), 'PURE_NO_OWNER_DOCKER_API')

    def test_07_leader_reaped_but_descendant_group_alive_is_not_pass(self):
        dependencies = FakeDependencies(descendant=True)
        result, _ = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertTrue(result['targetReaped'])
        self.assertTrue(dependencies.group_signals)
        self.assertEqual(dependencies.group_signals[0][1], signal.SIGTERM)
        self.assertIs(result.get('processGroupGone'), True)
        self.assertLessEqual(result['finishedMonotonic'], 130.2)

    def test_08_descendant_holding_pipes_is_group_terminated_after_leader_exit(self):
        dependencies = FakeDependencies(descendant=True, hold_pipes=True)
        result, _ = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertTrue(dependencies.group_signals)
        self.assertTrue(result['stdout']['eof'] and result['stderr']['eof'])
        self.assertIs(result.get('processGroupGone'), True)
        self.assertEqual(dependencies.leader_signals, [])

    def test_09_group_kill_after_ineffective_term_even_when_leader_exited(self):
        dependencies = FakeDependencies(descendant=True, term_effective=False, hold_pipes=True)
        result, _ = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertEqual([event[1] for event in dependencies.group_signals], [signal.SIGTERM, signal.SIGKILL])
        self.assertIs(result.get('processGroupGone'), True)
        self.assertLessEqual(result['finishedMonotonic'], result['firstMinShutdownDeadlineMonotonic'])

    def test_10_earliest_shutdown_never_moves_forward_after_read_failure(self):
        dependencies = FakeDependencies(leader_finish=None, read_error=True, term_effective=False)
        result, _ = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertTrue(dependencies.group_signals)
        first = dependencies.group_signals[0][2]
        self.assertLessEqual(result['firstMinShutdownDeadlineMonotonic'], first + 30)
        self.assertLessEqual(result['finishedMonotonic'], first + 30)
        self.assertLessEqual(result['firstMinShutdownDeadlineMonotonic'], 380.0)

    def test_11_hard_deadline_cannot_add_thirty_seconds(self):
        dependencies = FakeDependencies(leader_finish=None, group_never_exits=True, hold_pipes=True)
        result, _ = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertLessEqual(result['finishedMonotonic'], 380.0)
        self.assertLessEqual(result['firstMinShutdownDeadlineMonotonic'], 380.0)
        self.assertIs(result.get('processGroupGone'), False)
        self.assertFalse(result['stdout']['eof'])
        self.assertTrue(dependencies.group_signals)

    def test_12_nonzero_exit_retains_failure_and_closed_group(self):
        result, _ = self.capture(FakeDependencies(exit_code=7))
        self.assertFalse(result['passed'])
        self.assertEqual(result['exit'], 7)
        self.assertTrue(result['targetReaped'])
        self.assertIs(result.get('processGroupGone'), True)
        self.assertTrue(result['stdout']['eof'] and result['stderr']['eof'])

    def test_13_stream_overflow_preserves_eight_mib_without_pass(self):
        dependencies = FakeDependencies(leader_finish=None, overflow=True)
        result, files = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertTrue(result['stdout']['overflow'])
        self.assertEqual(result['stdout']['bytesSaved'], 8388608)
        self.assertEqual(len(files['target.stdout.bin']), 8388608)
        self.assertEqual(result['stdout']['bytesObserved'], 8388608 + 65536)
        self.assertTrue(dependencies.group_signals)

    def test_14_setup_failure_never_fabricates_group_cleanup(self):
        dependencies = FakeDependencies(setup_error=True)
        result, _ = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertIsNone(result['targetPid'])
        self.assertFalse(result['targetReaped'])
        self.assertIs(result.get('processGroupGone'), False)
        self.assertEqual(dependencies.group_signals, [])

    def test_15_no_read_workers_and_only_fixed_group_signals(self):
        dependencies = FakeDependencies(descendant=True, term_effective=False)
        result, _ = self.capture(dependencies)
        self.assertEqual(result['readWorkersCreated'], 0)
        self.assertIs(result['readWorkersJoined'], True)
        self.assertTrue(dependencies.selector_instance.closed)
        self.assertTrue(dependencies.read_sizes)
        self.assertEqual(set(dependencies.read_sizes), {65536})
        self.assertTrue(all(event[0] == dependencies.process.pid for event in dependencies.group_signals))
        self.assertEqual(dependencies.leader_signals, [])

    def test_16_existing_output_is_not_overwritten_and_cannot_relaunch(self):
        dependencies = FakeDependencies()
        with tempfile.TemporaryDirectory(prefix='v41-outer-once-') as directory:
            output = Path(directory)
            sentinel = b'immutable previous capture'
            (output / 'target.stdout.bin').write_bytes(sentinel)
            try:
                result = CANDIDATE.run_target(specification(), output, dependencies)
            except (FileExistsError, ValueError):
                result = {'passed': False}
            self.assertFalse(result['passed'])
            self.assertEqual((output / 'target.stdout.bin').read_bytes(), sentinel)
            self.assertEqual(dependencies.launches, [])


def main():
    global CANDIDATE
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', type=Path, required=True)
    arguments = parser.parse_args()
    if not arguments.candidate.is_absolute():
        parser.error('--candidate must be an absolute SOURCE path')
    specification_loader = importlib.util.spec_from_file_location('v41_outer_candidate', arguments.candidate)
    CANDIDATE = importlib.util.module_from_spec(specification_loader)
    # Import remains inert: no process, worker, signal or socket side effect.
    with mock.patch('subprocess.Popen', side_effect=AssertionError('Real process forbidden')), \
            mock.patch('os.killpg', side_effect=AssertionError('Real group signal forbidden')), \
            mock.patch('socket.socket', side_effect=AssertionError('Real socket forbidden')), \
            mock.patch('threading.Thread.start', side_effect=AssertionError('Real worker forbidden')):
        specification_loader.loader.exec_module(CANDIDATE)
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(OuterCaptureTests)
        result = unittest.TextTestRunner(verbosity=2).run(suite)
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
