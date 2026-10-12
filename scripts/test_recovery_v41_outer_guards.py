"""Additional frozen guards for query-failure shutdown and the exact Maven pin.

These tests extend the focused outer contract without modifying its sixteen
frozen tests. Every process seam uses their existing fake OS dependencies.
"""
import argparse
import hashlib
import importlib.util
from pathlib import Path
import stat
import tempfile
import unittest
from unittest import mock

PROJECT = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend')
FROZEN_TESTS = PROJECT / 'scripts/test_recovery_v41_outer_capture.py'
MAVEN = Path('/Users/leonardorozza/.m2/wrapper/dists/apache-maven-3.9.11/a2d47e15/bin/mvn')
CANDIDATE = None
FAKES = None


def source_stat(path):
    value = path.lstat()
    return {'device': value.st_dev, 'inode': value.st_ino, 'mode': stat.S_IMODE(value.st_mode),
            'uid': value.st_uid, 'gid': value.st_gid, 'nlink': value.st_nlink,
            'mtimeNs': value.st_mtime_ns, 'ctimeNs': value.st_ctime_ns}


def maven_pin():
    return {'path': str(MAVEN), 'bytes': 6184,
            'sha256': 'f9381d0cb98abaaf9592dae421eddc497e84ed9bfb723b84c111d1350863c3a2',
            'stat': source_stat(MAVEN)}


class OuterGuardTests(unittest.TestCase):
    def query_failure(self, exception):
        class QueryFault(FAKES.FakeDependencies):
            def __init__(self):
                super().__init__(leader_finish=None, term_effective=False)
                self.first_failure = None

            def group_alive(self, group):
                if self.first_failure is None:
                    self.first_failure = self.now
                    raise exception('Controlled owned-group query failure')
                return super().group_alive(group)

        dependencies = QueryFault()
        with tempfile.TemporaryDirectory(prefix='v41-outer-query-') as directory:
            result = CANDIDATE.run_target(FAKES.specification(), Path(directory), dependencies)
        self.assertFalse(result['passed'])
        self.assertIsNotNone(dependencies.first_failure)
        self.assertLessEqual(result['firstMinShutdownDeadlineMonotonic'], dependencies.first_failure + 30)
        self.assertLessEqual(result['finishedMonotonic'], dependencies.first_failure + 30)
        self.assertLessEqual(result['firstMinShutdownDeadlineMonotonic'], result['absoluteDeadlineMonotonic'])
        self.assertTrue(dependencies.group_signals)
        self.assertEqual(len(dependencies.launches), 1)
        self.assertEqual(dependencies.leader_signals, [])
        self.assertIs(result['originalResultAccredited'], False)

    def test_01_oserror_group_query_starts_earliest_shutdown(self):
        self.query_failure(OSError)

    def test_02_permission_error_group_query_starts_earliest_shutdown(self):
        self.query_failure(PermissionError)

    def test_03_only_actual_fixed_maven_source_is_admitted(self):
        expected = maven_pin()
        self.assertEqual(MAVEN.stat().st_size, expected['bytes'])
        self.assertEqual(hashlib.sha256(MAVEN.read_bytes()).hexdigest(), expected['sha256'])
        self.assertEqual(expected['stat']['uid'], 501)
        self.assertEqual(expected['stat']['mode'], 0o755)
        self.assertEqual(expected['stat']['nlink'], 1)
        try:
            actual = CANDIDATE.check_pin(expected, full_stat=True)
        except ValueError as error:
            self.fail('Known exact complete SOURCE Maven pin rejected: ' + str(error))
        self.assertEqual(actual, expected)

    def test_04_maven_neighbor_paths_are_not_new_public_roots(self):
        for path in (MAVEN.with_name('mvn-debug'), MAVEN.parent / 'foreign-tool',
                     MAVEN.parents[2] / 'another-distribution/bin/mvn'):
            with self.subTest(path=str(path)):
                bad = maven_pin()
                bad['path'] = str(path)
                with self.assertRaises(ValueError):
                    CANDIDATE.check_pin(bad, full_stat=True)

    def test_05_exact_maven_path_does_not_waive_bytes_hash_or_stat(self):
        for field in ('bytes', 'sha256', 'stat'):
            with self.subTest(field=field):
                bad = maven_pin()
                if field == 'bytes':
                    bad[field] += 1
                elif field == 'sha256':
                    bad[field] = '0' * 64
                else:
                    bad[field] = dict(bad[field], inode=bad[field]['inode'] + 1)
                with self.assertRaises(ValueError):
                    CANDIDATE.check_pin(bad, full_stat=True)


def main():
    global CANDIDATE, FAKES
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', type=Path, required=True)
    arguments = parser.parse_args()
    if not arguments.candidate.is_absolute():
        parser.error('--candidate must be an absolute SOURCE path')
    if hashlib.sha256(FROZEN_TESTS.read_bytes()).hexdigest() != \
            '89183bdffc1f0af7fd81683708f1432da0eef00ea742bd74e903d5c592c8d3c3':
        parser.error('The original sixteen tests must remain byte-exact')
    with mock.patch('subprocess.Popen', side_effect=AssertionError('Real process forbidden')), \
            mock.patch('os.killpg', side_effect=AssertionError('Real group signal forbidden')), \
            mock.patch('socket.socket', side_effect=AssertionError('Real socket forbidden')), \
            mock.patch('threading.Thread.start', side_effect=AssertionError('Real worker forbidden')):
        source = importlib.util.spec_from_file_location('v41_outer_frozen_os_fakes', FROZEN_TESTS)
        FAKES = importlib.util.module_from_spec(source)
        source.loader.exec_module(FAKES)
        source = importlib.util.spec_from_file_location('v41_outer_guard_candidate', arguments.candidate)
        CANDIDATE = importlib.util.module_from_spec(source)
        source.loader.exec_module(CANDIDATE)
        result = unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(OuterGuardTests))
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
