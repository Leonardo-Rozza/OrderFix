"""Closed case-one ROOT admission; fixtures exercise real validation, never owners."""
import argparse
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import sys
from types import SimpleNamespace
import unittest

CANDIDATE = None


class RankCaptureTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(callable(getattr(CANDIDATE, 'execute_once', None)),
                        'Missing closed rank capture API')
        self.assertTrue(callable(getattr(CANDIDATE, 'validate_request', None)),
                        'Missing complete SOURCE admission')
        self.directory = tempfile.TemporaryDirectory(prefix='rank-capture-fixture-')
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.project = self.root / 'project'
        self.project.mkdir()
        self.records = self.root / 'real-case-1-records'
        self.records.mkdir()
        self.contract = CANDIDATE.Contract(self.root, self.project)
        self.contract.anchors = {}
        self.contract.extra_paths = set()
        self.contract.import_paths = set()
        self.contract.expected_historical_count = 2
        self.contract.shared = None
        self.contract.recipe = {'fixedPins': []}
        for relative in ['immutable.py', 'original.class']:
            path = self.root / relative
            path.write_text(relative)
            self.contract.recipe['fixedPins'].append(CANDIDATE.source_pin(path))
        for path in [self.contract.canonical, self.contract.branch_ref,
                     self.contract.head_file]:
            path.parent.mkdir(parents=True, exist_ok=True)
        self.head = 'a' * 40
        self.contract.branch_ref.write_text(self.head + '\n')
        self.contract.head_file.write_text('ref: refs/heads/codex/v41-rank-launcher-integrated\n')
        self.contract.canonical.write_text('Approved pending case\n')
        self.contract.extra_paths.update([self.contract.canonical, self.contract.branch_ref,
                                         self.contract.head_file])
        self.contract.parent = {'schema': 1, 'argv': ['/usr/bin/fake', '-B', '-S',
            str(self.root / 'parent_run.py'), '--execute-parent-approved-v43-capture',
            '--input', str(self.records / 'parent-input-01.json'), '--input-sha', 'b' * 64],
            'cwd': str(self.records), 'environment': CANDIDATE.clean_environment(
                self.records / 'launcher/home', self.records / 'launcher/tmp'),
            'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280}
        for path in self.contract.virgin_directories:
            path.mkdir(parents=True, exist_ok=True)
        self.request = {'schema': 'rank12-root280-case1/v1', 'case': 'case-1',
            'originalRowIndex': 0, 'originalInvocationOrdinal': 1,
            'csvRow': 'C,false,REORDER', 'reviewedHead': self.head,
            'capture': copy.deepcopy(self.contract.parent),
            'sourcePins': list(self.contract.expected_sources().values())}
        self.request_path = self.records / 'root280-request-01.json'
        self.calls = []

    def write_request(self, request=None):
        self.request_path.write_text(json.dumps(request or self.request, allow_nan=False))
        return CANDIDATE.source_pin(self.request_path)['sha256']

    def capture(self, spec, output):
        self.calls.append((spec, output))
        self.assertTrue(output.is_dir(), "Caller must create virgin output before shared capture")
        return {'passed': True, 'originalResultAccredited': False,
                'ownerCleanupAccredited': False}

    def reject(self, request):
        digest = self.write_request(request)
        with self.assertRaises((ValueError, FileExistsError)):
            CANDIDATE.execute_once(self.request_path, digest, self.contract, self.capture)
        self.assertFalse(self.contract.marker.exists())
        self.assertEqual(self.calls, [])

    def test_01_closed_case_budget_and_parent_bindings(self):
        for key, value in [('case', 'case-2'), ('originalRowIndex', True),
                           ('originalInvocationOrdinal', 2), ('csvRow', 'C,true,REORDER'),
                           ('schema', 'other')]:
            request = copy.deepcopy(self.request)
            request[key] = value
            self.reject(request)
        for key, value in [('argv', ['/usr/bin/arbitrary']), ('cwd', '/tmp'),
                           ('environment', {}), ('totalTimeoutSeconds', 281)]:
            request = copy.deepcopy(self.request)
            request['capture'][key] = value
            self.reject(request)
        request = copy.deepcopy(self.request)
        request['extra'] = True
        self.reject(request)

    def test_02_duplicate_and_nonfinite_json(self):
        for raw in ['{"schema":1,"schema":2}', '{"schema":NaN}',
                    '{"schema":Infinity}', '{"schema":-Infinity}']:
            with self.assertRaises(ValueError):
                CANDIDATE.strict_json(raw.encode())

    def test_03_missing_extra_duplicate_and_role_contamination(self):
        request = copy.deepcopy(self.request)
        request['sourcePins'].pop()
        self.reject(request)
        for path in [self.records / 'launcher/launcher-report-01.json',
                     self.contract.output / 'target.stdout.bin', self.root / 'unrelated']:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('Not a SOURCE')
            request = copy.deepcopy(self.request)
            request['sourcePins'].append(CANDIDATE.source_pin(path))
            self.reject(request)
        request = copy.deepcopy(self.request)
        request['sourcePins'].append(request['sourcePins'][0])
        self.reject(request)

    def test_04_content_and_full_stat_drift(self):
        path = Path(self.request['sourcePins'][0]['path'])
        path.write_text('changed SOURCE')
        self.reject(self.request)

    def test_05_stat_only_drift_cannot_be_repinned(self):
        request = copy.deepcopy(self.request)
        request['sourcePins'][0]['stat8']['st_ino'] += 1
        self.reject(request)

    def test_06_canonical_and_integrated_ref_authorization(self):
        self.contract.canonical.write_text('Unauthorized replacement')
        self.reject(self.request)
        self.contract.canonical.write_text('Approved pending case\n')
        self.request['sourcePins'] = list(self.contract.expected_sources().values())
        self.contract.branch_ref.write_text('b' * 40 + '\n')
        self.reject(self.request)
        self.request['sourcePins'] = list(self.contract.expected_sources().values())
        self.reject(self.request)

    def test_07_virgin_marker_output_and_runtime_locations(self):
        self.contract.output.mkdir()
        self.reject(self.request)
        self.contract.output.rmdir()
        (self.contract.virgin_directories[0] / 'prior-data').write_text('old')
        self.reject(self.request)
        (self.contract.virgin_directories[0] / 'prior-data').unlink()
        self.contract.marker.write_text('consumed')
        digest = self.write_request()
        with self.assertRaises(ValueError):
            CANDIDATE.execute_once(self.request_path, digest, self.contract, self.capture)
        self.assertEqual(self.calls, [])
        self.assertEqual(self.contract.marker.read_text(), 'consumed')

    def test_08_success_consumes_once_and_never_accredits_original(self):
        digest = self.write_request()
        result = CANDIDATE.execute_once(self.request_path, digest, self.contract, self.capture)
        self.assertTrue(result['passed'])
        self.assertTrue(self.contract.marker.exists())
        self.assertEqual(len(self.calls), 1)
        for key in ['originalResultAccredited', 'ownerCleanupAccredited',
                    'runtimeAuthority', 'productionAuthority']:
            self.assertIs(result[key], False)
        with self.assertRaises(ValueError):
            CANDIDATE.execute_once(self.request_path, digest, self.contract, self.capture)
        self.assertEqual(len(self.calls), 1)

    def test_09_after_drift_preserves_marker_and_raw_failure(self):
        digest = self.write_request()
        def drift(spec, output):
            result = self.capture(spec, output)
            (self.root / 'immutable.py').write_text('drift during target')
            return result
        result = CANDIDATE.execute_once(self.request_path, digest, self.contract, drift)
        self.assertFalse(result['passed'])
        self.assertTrue(self.contract.marker.exists())
        receipt_path = self.contract.output / 'rank-capture-receipt.json'
        self.assertTrue(receipt_path.is_file(), 'Capture must retain its failure receipt')
        receipt = CANDIDATE.strict_json(receipt_path.read_bytes())
        self.assertFalse(receipt['productionAuthority'])
        self.assertTrue(receipt['failures'])

    def test_10_sha_mismatch_and_request_stat_drift_before_launch(self):
        self.write_request()
        with self.assertRaises(ValueError):
            CANDIDATE.execute_once(self.request_path, '0' * 64, self.contract, self.capture)
        self.assertFalse(self.contract.marker.exists())
        self.assertEqual(self.calls, [])

    def test_11_existing_shared_output_admission_integration(self):
        shared_path = Path(__file__).with_name('recovery_v41_outer_capture.py')
        spec = importlib.util.spec_from_file_location('shared_integration', shared_path)
        shared = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(shared)
        fake_path = Path(__file__).with_name('test_recovery_v41_outer_capture.py')
        spec = importlib.util.spec_from_file_location('frozen_capture_fakes', fake_path)
        fakes = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(fakes)
        dependencies = fakes.FakeDependencies()
        digest = self.write_request()
        def real_shared(spec, output):
            return shared.capture_owned_session(spec, output, dependencies)
        result = CANDIDATE.execute_once(self.request_path, digest, self.contract, real_shared)
        self.assertTrue(result['passed'], result['failures'])
        self.assertEqual(len(dependencies.launches), 1)
        self.assertTrue(result['capture']['processGroupGone'])
        self.assertTrue(result['capture']['targetReaped'])

    def test_12_json_exponent_overflow_is_nonfinite(self):
        with self.assertRaises(ValueError):
            CANDIDATE.strict_json(b'{"capture":1e9999}')

    def test_13_import_source_closure_ignores_ambient_unrelated_modules(self):
        self.assertTrue(callable(getattr(CANDIDATE, 'import_source_paths', None)),
                        'Missing closed import-origin admission')
        before = CANDIDATE.import_source_paths()
        sys.modules['unrelated_rank_module'] = SimpleNamespace(__file__=str(self.root / 'unrelated.py'))
        try:
            self.assertEqual(CANDIDATE.import_source_paths(), before)
        finally:
            del sys.modules['unrelated_rank_module']


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', required=True)
    args = parser.parse_args()
    path = Path(args.candidate)
    if path.exists():
        specification = importlib.util.spec_from_file_location('rank_candidate', path)
        CANDIDATE = importlib.util.module_from_spec(specification)
        specification.loader.exec_module(CANDIDATE)
    unittest.main(argv=[__file__], verbosity=2)
