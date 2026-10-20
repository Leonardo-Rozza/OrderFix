"""Archive custody regressions over immutable saved ninth-case metadata only."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

P = Path(__file__).resolve().parents[1]
U = P / 'release-validation.local/case9-final-parent-xyv2gggg'
CANDIDATE = Path(os.environ.get('CASE9_ARCHIVE_READER_CANDIDATE', str(
    P / 'scripts/recovery_v41_rank_case9_saved_locale_reader.py')))
spec = importlib.util.spec_from_file_location('case9_archive_candidate', CANDIDATE)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def read(path):
    chunks, size = [], 0
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(65536), b''):
            size += len(chunk)
            if size > 16777216:
                raise ValueError('Fixture JSON16MiB')
            chunks.append(chunk)
    return json.loads(b''.join(chunks))


class ArchiveCustodyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        qualification = read(U / 'archive-data-qualification-01.json')
        cls.manifest_pin = qualification['manifest']
        if reader.pin(cls.manifest_pin['path']) != cls.manifest_pin:
            raise AssertionError('Actual archive manifest identity drift')
        cls.manifest = read(Path(cls.manifest_pin['path']))
        cls.bindings = read(U / 'post-bindings-01.json')
        cls.temporary = tempfile.TemporaryDirectory(prefix='case9-archive-regression-', dir='/private/tmp')
        cls.addClassCleanup(cls.temporary.cleanup)
        cls.counter = 0

    def bound(self, manifest=None):
        bindings = copy.deepcopy(self.bindings)
        bindings['schema'] = 'rank12-case9-saved-parent-bindings/v2'
        if manifest is None:
            bindings['archiveManifest'] = copy.deepcopy(self.manifest_pin)
        else:
            type(self).counter += 1
            path = Path(self.temporary.name) / ('manifest-%d.json' % self.counter)
            raw = (json.dumps(manifest, sort_keys=True, indent=2) + '\n').encode()
            with path.open('xb') as output:
                output.write(raw)
            bindings['archiveManifest'] = reader.pin(path)
        additions = [reader.pin(CANDIDATE.absolute())]
        helper = P / 'scripts/recovery_v41_rank_case9_archive_custody.py'
        if helper.exists():
            additions.append(reader.pin(helper))
        for value in additions:
            matches = [i for i, old in enumerate(bindings['preservedPins']) if old['path'] == value['path']]
            if matches:
                bindings['preservedPins'][matches[0]] = value
            else:
                bindings['preservedPins'].append(value)
        return bindings

    def test_real_archive_has_complete_role_safe_content_and_explicit_gaps(self):
        base, protected, archive = reader.validate_bindings(self.bound())
        self.assertEqual(base['ordinal'], 9)
        self.assertIn(str(CANDIDATE.absolute()), protected)
        summary = archive.summary()
        self.assertEqual(summary['mappedMissingIdentities'], 4275)
        self.assertEqual(summary['logicalHistoricalSourceCount'], 10142)
        self.assertEqual(len(summary['missingHistoricalData']), 8)
        self.assertFalse(summary['currentLiveCustodyPassed'])
        self.assertFalse(summary['historicalIdentityRestored'])

    def test_v1_binding_api_remains_a_two_tuple(self):
        bindings = self.bound()
        del bindings['archiveManifest']
        bindings['schema'] = 'rank12-case9-saved-parent-bindings/v1'
        self.assertEqual(len(reader.validate_bindings(bindings)), 2)

    def test_missing_or_extra_mapping_is_rejected(self):
        for mutation in ('missing', 'extra'):
            value = copy.deepcopy(self.manifest)
            if mutation == 'missing':
                value['mappings'].pop()
            else:
                value['mappings'].append(copy.deepcopy(value['mappings'][0]))
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                reader.validate_bindings(self.bound(value))

    def test_mapping_role_and_exact_content_are_not_substitutable(self):
        for mutation in ('role', 'bytes', 'sha', 'historical'):
            value = copy.deepcopy(self.manifest)
            row = next(item for item in value['mappings'] if item['role'] == 'SOURCE')
            if mutation == 'role':
                row['role'] = 'PRIOR_DATA'
            elif mutation == 'bytes':
                row['current']['bytes'] += 1
            elif mutation == 'sha':
                row['current']['sha256'] = '0' * 64
            else:
                row['historical']['stat8']['st_ino'] += 1
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                reader.validate_bindings(self.bound(value))

    def test_current_stat_and_runtime_paths_cannot_be_forged(self):
        for mutation in ('stat', 'runtime'):
            value = copy.deepcopy(self.manifest)
            row = next(item for item in value['mappings'] if item['role'] == 'SOURCE')
            if mutation == 'stat':
                row['current']['stat8']['st_ino'] += 1
            else:
                row['current'] = read(U / 'parent-status-01.json')['runtimePins'][0]
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                reader.validate_bindings(self.bound(value))

    def test_only_the_eight_exact_historical_data_gaps_are_allowed(self):
        for mutation in ('extra', 'missing', 'forged'):
            value = copy.deepcopy(self.manifest)
            if mutation == 'extra':
                value['gaps'].append(copy.deepcopy(value['gaps'][0]))
            elif mutation == 'missing':
                value['gaps'].pop()
            else:
                value['gaps'][0]['historical']['sha256'] = '0' * 64
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                reader.validate_bindings(self.bound(value))

    def test_runtime_limits_and_original_output_binding_remain_fixed(self):
        for mutation in ('seconds', 'stream', 'runtime-proof'):
            value = copy.deepcopy(self.manifest)
            if mutation == 'seconds':
                value['limits']['rootEnvelopeSeconds'] = 281
            elif mutation == 'stream':
                value['limits']['stdoutCapBytes'] += 1
            else:
                value['parentStatus'] = copy.deepcopy(value['recipe'])
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                reader.validate_bindings(self.bound(value))

    def test_archive_manifest_must_match_its_external_sha(self):
        bindings = self.bound()
        bindings['archiveManifest']['sha256'] = '0' * 64
        with self.assertRaises(AssertionError):
            reader.validate_bindings(bindings)


if __name__ == '__main__':
    unittest.main(verbosity=2)
