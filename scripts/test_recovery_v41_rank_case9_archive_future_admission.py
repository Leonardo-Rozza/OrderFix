"""Archive historical results never imply that missing future directories are ready."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import unittest

P = Path(__file__).resolve().parents[1]
U = P / 'release-validation.local/case9-final-parent-xyv2gggg'
ROOT = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw')
CANDIDATE = Path(os.environ.get('CASE9_ARCHIVE_FUTURE_READER_CANDIDATE', str(
    P / 'scripts/recovery_v41_rank_case9_saved_locale_reader.py')))
spec = importlib.util.spec_from_file_location('case9_archive_future_candidate', CANDIDATE)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def read(path):
    pieces, size = [], 0
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(65536), b''):
            size += len(chunk)
            if size > 16777216:
                raise ValueError('Fixture JSON16MiB')
            pieces.append(chunk)
    return json.loads(b''.join(pieces))


class ArchiveFutureAdmissionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        bindings = copy.deepcopy(read(U / 'archive-post-bindings-01.json'))
        actual = reader.pin(CANDIDATE.absolute())
        next(value for value in bindings['preservedPins'] if value['path'] == actual['path']).update(actual)
        _, _, cls.archive = reader.validate_bindings(bindings)
        manifest = read(Path(bindings['archiveManifest']['path']))
        cls.sources = {value['path']: value for value in read(Path(manifest['sourceRequest']['path']))['sourcePins']}
        preparation = read(P / 'release-validation.local/rank12-preparation-vcra7ulw/preparation-manifest-01.json')
        cls.missing = [str(Path(row['ownerRoot']) / name) for row in preparation['rows'][9:]
                       for name in ('home', 'tmp', 'observed', 'runtime')]
        cls.runtime = read(U / 'parent-status-01.json')['runtimePins']

    def test_archive_reports_twelve_missing_private_directories_as_not_admitted(self):
        observation = reader.future_virgin(self.sources, self.archive)
        self.assertFalse(observation['currentFutureAdmissionPassed'])
        self.assertFalse(observation['futureExecutionAuthority'])
        self.assertEqual(observation['missingPrivateFutureDirectories'], self.missing)
        self.assertEqual(len(self.missing), 12)
        self.assertEqual(len(observation['futureDirectoryObservations']), 24)

    def test_observations_are_stable_without_directory_or_runtime_mutation(self):
        before = [reader.pin(value['path']) for value in self.runtime]
        first = reader.future_virgin(self.sources, self.archive)
        second = reader.future_virgin(self.sources, self.archive)
        self.assertEqual(first, second)
        self.assertTrue(all(not os.path.lexists(path) for path in self.missing))
        self.assertEqual(before, self.runtime)
        self.assertEqual([reader.pin(value['path']) for value in self.runtime], before)

    def test_original_v1_remains_fail_closed(self):
        with self.assertRaises((AssertionError, FileNotFoundError)):
            reader.future_virgin(self.sources)


if __name__ == '__main__':
    unittest.main(verbosity=2)
