"""Shared ROOT280 admission regressions using only frozen fake OS seams."""
import argparse
import hashlib
import importlib.util
from pathlib import Path
import signal
import tempfile
import unittest
from unittest import mock

PROJECT = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend')
FROZEN_TESTS = PROJECT / 'scripts/test_recovery_v41_outer_capture.py'
CANDIDATE = FAKES = None


def specification():
    spec = FAKES.specification()
    spec['argv'] = [FAKES.PYTHON, '-B', '-S',
                    str(FAKES.FAMILY / 'capture/parent_run.py'),
                    '--execute-parent-approved-v43-capture', '--input',
                    '/private/tmp/ordered-rank-case/parent-input.json',
                    '--input-sha', 'b' * 64]
    spec['cwd'] = '/private/tmp/ordered-rank-case'
    spec['environment']['HOME'] = spec['cwd'] + '/home'
    spec['environment']['TMPDIR'] = spec['cwd'] + '/tmp'
    return spec


class OwnedCaptureTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(callable(getattr(CANDIDATE, 'capture_owned_session', None)),
                        'Missing shared owned-session API')
        self.assertTrue(callable(getattr(CANDIDATE, 'validate_capture_spec', None)),
                        'Missing common strict capture admission')

    def capture(self, dependencies):
        with tempfile.TemporaryDirectory(prefix='owned-capture-unit-') as directory:
            result = CANDIDATE.capture_owned_session(specification(), Path(directory), dependencies)
            files = {p.name: p.read_bytes() for p in Path(directory).iterdir()}
        self.assertEqual(len(dependencies.launches), 1)
        return result, files

    def reject(self, spec):
        dependencies = FAKES.FakeDependencies()
        with tempfile.TemporaryDirectory(prefix='owned-capture-reject-') as directory:
            with self.assertRaises(ValueError):
                CANDIDATE.capture_owned_session(spec, Path(directory), dependencies)
            self.assertEqual(list(Path(directory).iterdir()), [])
        self.assertEqual(dependencies.launches, [])

    def test_01_rank_parent_admitted_without_family_authority(self):
        spec = specification()
        self.assertIs(CANDIDATE.validate_capture_spec(spec), spec)
        result, files = self.capture(FAKES.FakeDependencies())
        self.assertTrue(result['passed'])
        self.assertTrue(result['processGroupGone'] and result['targetReaped'])
        self.assertTrue(result['stdout']['eof'] and result['stderr']['eof'])
        self.assertEqual(result['absoluteDeadlineMonotonic'], 380.0)
        self.assertFalse(result['originalResultAccredited'])
        self.assertFalse(result['ownerCleanupAccredited'])
        self.assertIn('parent-execution.json', files)

    def test_02_family_wrapper_stays_closed_to_rank_parent(self):
        dependencies = FAKES.FakeDependencies()
        with tempfile.TemporaryDirectory(prefix='owned-family-reject-') as directory:
            with self.assertRaises(ValueError):
                CANDIDATE.run_target(specification(), Path(directory), dependencies)
        self.assertEqual(dependencies.launches, [])
        self.assertEqual(CANDIDATE.validate_spec(FAKES.specification()), FAKES.specification())

    def test_03_exact_schema_and_budget_before_launch(self):
        for field, value in [('schema', True), ('schema', 1.0), ('schema', 2),
                             ('runTimeoutSeconds', True), ('totalTimeoutSeconds', True),
                             ('runTimeoutSeconds', 279), ('totalTimeoutSeconds', 281),
                             ('runTimeoutSeconds', float('nan')),
                             ('totalTimeoutSeconds', float('inf')),
                             ('runTimeoutSeconds', 10 ** 400)]:
            with self.subTest(field=field, value=value):
                spec = specification()
                spec[field] = value
                self.reject(spec)
        for change in ('missing', 'extra', 'nondict'):
            with self.subTest(change=change):
                spec = specification()
                if change == 'missing':
                    del spec['schema']
                elif change == 'extra':
                    spec['retry'] = False
                else:
                    spec = list(spec)
                self.reject(spec)

    def test_04_bounded_absolute_argv_before_launch(self):
        for argv in ([], (), ['/bin/true'] * 65, ['relative'], [False],
                     ['/bin/true', ''], ['/bin/true', 'a\0b'],
                     ['/bin/true', 'x' * 65537]):
            with self.subTest(argv_type=type(argv).__name__, tokens=len(argv)):
                spec = specification()
                spec['argv'] = argv
                self.reject(spec)
        spec = specification()
        spec['argv'] = ['/bin/true'] + ['x' * 65536] * 63
        self.assertIs(CANDIDATE.validate_capture_spec(spec), spec)

    def test_05_exact_clean_environment_and_absolute_paths(self):
        for field, value in [('PATH', '/usr/local/bin'), ('LANG', 'en_US.UTF-8'),
                             ('LC_ALL', 'en_US.UTF-8'), ('PYTHONDONTWRITEBYTECODE', '0'),
                             ('__CF_USER_TEXT_ENCODING', 'foreign'), ('HOME', 'relative'),
                             ('TMPDIR', '/tmp/invalid\0path'), ('HOME', False)]:
            with self.subTest(field=field, value=value):
                spec = specification()
                spec['environment'][field] = value
                self.reject(spec)
        for change in ('extra', 'missing', 'nondict', 'cwd', 'cwd-nul', 'cwd-type'):
            with self.subTest(change=change):
                spec = specification()
                if change == 'extra':
                    spec['environment']['DOCKER_HOST'] = 'tcp://foreign'
                elif change == 'missing':
                    del spec['environment']['TMPDIR']
                elif change == 'nondict':
                    spec['environment'] = list(spec['environment'])
                else:
                    spec['cwd'] = {'cwd': 'relative', 'cwd-nul': '/tmp/\0', 'cwd-type': False}[change]
                self.reject(spec)

    def test_06_session_creation_owned_group_and_no_workers(self):
        dependencies = FAKES.FakeDependencies(descendant=True, term_effective=False)
        result, _ = self.capture(dependencies)
        self.assertTrue(dependencies.launches[0][1]['start_new_session'])
        self.assertEqual([s[1] for s in dependencies.group_signals], [signal.SIGTERM, signal.SIGKILL])
        self.assertTrue(all(s[0] == dependencies.process.pid for s in dependencies.group_signals))
        self.assertEqual(dependencies.leader_signals, [])
        self.assertFalse(result['passed'])
        self.assertTrue(result['processGroupGone'])
        self.assertEqual(result['readWorkersCreated'], 0)
        self.assertTrue(result['readWorkersJoined'])

    def test_07_unknown_group_enters_first_min_shutdown(self):
        class UnknownGroup(FAKES.FakeDependencies):
            def group_alive(self, group):
                raise PermissionError('Controlled owned group UNKNOWN')

        dependencies = UnknownGroup(leader_finish=None, term_effective=False)
        result, _ = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertFalse(result['processGroupGone'])
        self.assertLessEqual(result['firstMinShutdownDeadlineMonotonic'], 130.0)
        self.assertLessEqual(result['finishedMonotonic'], 130.0)
        self.assertEqual([s[1] for s in dependencies.group_signals], [signal.SIGTERM, signal.SIGKILL])

    def test_08_overflow_retains_eight_mib_and_bounded_reads(self):
        dependencies = FAKES.FakeDependencies(leader_finish=None, overflow=True)
        result, files = self.capture(dependencies)
        self.assertFalse(result['passed'])
        self.assertTrue(result['stdout']['overflow'])
        self.assertEqual(len(files['target.stdout.bin']), 8388608)
        self.assertEqual(result['stdout']['bytesObserved'], 8388608 + 65536)
        self.assertEqual(set(dependencies.read_sizes), {65536})

    def test_09_read_failure_shutdown_never_extends_absolute_budget(self):
        dependencies = FAKES.FakeDependencies(leader_finish=None, read_error=True, term_effective=False)
        result, _ = self.capture(dependencies)
        self.assertFalse(result['passed'])
        first = dependencies.group_signals[0][2]
        self.assertLessEqual(result['finishedMonotonic'], first + 30)
        self.assertLessEqual(result['firstMinShutdownDeadlineMonotonic'], first + 30)
        self.assertLessEqual(result['firstMinShutdownDeadlineMonotonic'], 380.0)

    def test_10_reused_output_cannot_spawn_or_overwrite(self):
        for name in ('target.stdout.bin', 'target.stderr.bin', 'parent-execution.json'):
            with self.subTest(name=name), tempfile.TemporaryDirectory(prefix='owned-output-once-') as directory:
                output = Path(directory)
                sentinel = b'previous capture remains immutable'
                (output / name).write_bytes(sentinel)
                dependencies = FAKES.FakeDependencies()
                with self.assertRaises(ValueError):
                    CANDIDATE.capture_owned_session(specification(), output, dependencies)
                self.assertEqual((output / name).read_bytes(), sentinel)
                self.assertEqual(dependencies.launches, [])


def main():
    global CANDIDATE, FAKES
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', type=Path, required=True)
    arguments = parser.parse_args()
    if not arguments.candidate.is_absolute():
        parser.error('--candidate must be an absolute SOURCE path')
    if hashlib.sha256(FROZEN_TESTS.read_bytes()).hexdigest() != \
            '89183bdffc1f0af7fd81683708f1432da0eef00ea742bd74e903d5c592c8d3c3':
        parser.error('Original fake dependencies must remain byte-exact')
    with mock.patch('subprocess.Popen', side_effect=AssertionError('Real process forbidden')), \
            mock.patch('os.killpg', side_effect=AssertionError('Real group signal forbidden')), \
            mock.patch('socket.socket', side_effect=AssertionError('Real socket forbidden')), \
            mock.patch('threading.Thread.start', side_effect=AssertionError('Real worker forbidden')):
        loader = importlib.util.spec_from_file_location('owned_capture_frozen_fakes', FROZEN_TESTS)
        FAKES = importlib.util.module_from_spec(loader)
        loader.loader.exec_module(FAKES)
        loader = importlib.util.spec_from_file_location('owned_capture_candidate', arguments.candidate)
        CANDIDATE = importlib.util.module_from_spec(loader)
        loader.loader.exec_module(CANDIDATE)
        result = unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(OwnedCaptureTests))
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
