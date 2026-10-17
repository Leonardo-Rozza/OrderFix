"""Fixture-only case-nine caller regressions; no Docker, Java or original test."""
import argparse
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

P = Path(__file__).resolve().parents[1]
R = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw')
parser = argparse.ArgumentParser()
parser.add_argument('--candidate', required=True)
args, remaining = parser.parse_known_args()
spec = importlib.util.spec_from_file_location('case9_candidate', Path(args.candidate).resolve())
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
RECIPE = json.loads((R / 'real-case-9-records/execution-recipe-01.json').read_bytes())


class RecipeTests(unittest.TestCase):
    def test_valid_ninth_recipe(self):
        try:
            m.validate_recipe(copy.deepcopy(RECIPE))
        except ValueError as error:
            self.fail('An unchanged valid ninth recipe must be admitted: ' + str(error))

    def test_wrong_case_bindings(self):
        for key, value in [('case', 'case-8'), ('originalRowIndex', 7),
                           ('originalInvocationOrdinal', True), ('csvRow', 'C,true,OLDER_TAIL')]:
            with self.subTest(key=key):
                recipe = copy.deepcopy(RECIPE)
                recipe[key] = value
                with self.assertRaises(ValueError):
                    m.validate_recipe(recipe)

    def test_true_operation_plan(self):
        recipe = copy.deepcopy(RECIPE)
        recipe['originalOperationPlan']['dumpCount'] = 1
        with self.assertRaises(ValueError):
            m.validate_recipe(recipe)

    def test_every_time_and_stream_limit(self):
        for key in ('rootEnvelopeSeconds', 'runTimeoutSeconds', 'totalTimeoutSeconds',
                    'originalCaseSeconds', 'execSeconds', 'launchSeconds', 'ownerSeconds',
                    'cleanupSeconds', 'readChunkBytes', 'stdoutCapBytes', 'stderrCapBytes'):
            with self.subTest(key=key):
                recipe = copy.deepcopy(RECIPE)
                recipe[key] += 1
                with self.assertRaises(ValueError):
                    m.validate_recipe(recipe)

    def test_source_metadata_and_no_authority(self):
        for key, value in [('completePriorSourceCount', 10127), ('extraSourcePins', [{}]),
                           ('runtimeAuthority', True), ('executionAuthorized', True)]:
            with self.subTest(key=key):
                recipe = copy.deepcopy(RECIPE)
                recipe[key] = value
                with self.assertRaises(ValueError):
                    m.validate_recipe(recipe)


class FixtureTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='case9-new-tests-')
        self.root = Path(self.temporary.name)
        self.addCleanup(self.temporary.cleanup)

    def file(self, name, text='payload'):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        return m.source_pin(path)

    def test_source_missing_extra_and_repin(self):
        pin = self.file('source.py')
        expected = {pin['path']: pin}
        m.check_sources([pin], expected)
        for supplied in ([], [pin, self.file('extra.py')], [dict(pin, sha256='0' * 64)]):
            with self.subTest(supplied=supplied):
                with self.assertRaises(ValueError):
                    m.check_sources(supplied, expected)

    def test_source_changed_on_disk(self):
        pin = self.file('source.py')
        Path(pin['path']).write_text('changed')
        with self.assertRaises(ValueError):
            m.check_sources([pin], {pin['path']: pin})

    def test_duplicate_and_hardlink_source(self):
        pin = self.file('source.py')
        with self.assertRaises(ValueError):
            m.check_sources([pin, pin], {pin['path']: pin})
        os.link(pin['path'], self.root / 'alias.py')
        with self.assertRaises(ValueError):
            m.check_sources([pin], {pin['path']: pin})

    def test_closed_inventory_missing_extra_and_alias(self):
        pin = self.file('closed/one.json')
        root = {'root': str(self.root / 'closed'), 'files': [pin['path']]}
        m.check_closed_roots([root])
        extra = self.root / 'closed/extra'
        extra.write_text('extra')
        with self.assertRaises(ValueError):
            m.check_closed_roots([root])
        extra.unlink()
        Path(pin['path']).unlink()
        with self.assertRaises(ValueError):
            m.check_closed_roots([root])
        Path(pin['path']).symlink_to(self.root / 'outside')
        with self.assertRaises((ValueError, OSError)):
            m.check_closed_roots([root])

    def test_pair_drift_and_wrong_counterpart(self):
        a, b = self.file('private/a.json'), self.file('durable/a.json')
        pair = {'private': a, 'durable': b}
        m.check_pairs([pair], self.root / 'private', self.root / 'durable', 1)
        for bad in ({'private': a, 'durable': self.file('durable/b.json')},
                    {'private': a, 'durable': dict(b, sha256='0' * 64)}):
            with self.assertRaises(ValueError):
                m.check_pairs([bad], self.root / 'private', self.root / 'durable', 1)
        Path(b['path']).write_text('changed')
        with self.assertRaises(ValueError):
            m.check_pairs([pair], self.root / 'private', self.root / 'durable', 1)

    def test_historical_absence_and_empty_directory(self):
        old = self.root / 'missing'
        m.check_absent([old])
        old.write_text('resurrected')
        with self.assertRaises(ValueError):
            m.check_absent([old])
        empty = self.root / 'empty'
        empty.mkdir(mode=0o700)
        m.check_empty([empty])
        (empty / 'dirty').write_text('dirty')
        with self.assertRaises(ValueError):
            m.check_empty([empty])

    def test_resource_limits_and_nonce(self):
        request = json.loads(Path(RECIPE['request']['path']).read_bytes())
        m.validate_owner_request(request, RECIPE['ownerRoot'])
        variants = [('nonce', 'wrong'), ('root', '/tmp/wrong')]
        for key, value in variants:
            bad = copy.deepcopy(request)
            bad[key] = value
            with self.assertRaises(ValueError):
                m.validate_owner_request(bad, RECIPE['ownerRoot'])
        for key, value in [('Memory', 1293741824), ('NanoCpus', 2000000000),
                           ('Privileged', True), ('PortBindings', {'5432/tcp': [{'HostIp': '0.0.0.0', 'HostPort': ''}]})]:
            bad = copy.deepcopy(request)
            bad['containerTemplate']['HostConfig'][key] = value
            with self.assertRaises(ValueError):
                m.validate_owner_request(bad, RECIPE['ownerRoot'])

    def test_provenance_already_projected(self):
        m.validate_provenance(RECIPE)
        for key in ('recoveredSourceMappings', 'sourceRecoveryMappings'):
            bad = copy.deepcopy(RECIPE)
            bad[key][-1] = bad[key][0]
            with self.assertRaises(ValueError):
                m.validate_provenance(bad)
        bad = copy.deepcopy(RECIPE)
        bad['fixedPins'].append(bad['sourceRecoveryMappings'][0]['oldExpectedPin'])
        with self.assertRaises(ValueError):
            m.validate_provenance(bad)

    def contract(self):
        records = self.root / 'records'
        records.mkdir()
        source = self.file('release-validation.local/test_source.py')
        custody = self.file('index-and-ref-custody')
        class FakeContract:
            def __init__(inner):
                inner.records = records
                inner.request_path = records / 'root280-request-01.json'
                inner.marker = records / 'root280-once-01.json'
                inner.output = records / 'root280-output-01'
                inner.parent = {'schema': 1, 'argv': ['fake-only'], 'cwd': str(records),
                                'environment': {}, 'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280}
                inner.sources = {source['path']: source}
                inner.reviewed_head = 'a' * 40
                inner.fixture_only = True
            def check(inner):
                m.check_sources(list(inner.sources.values()), inner.sources)
                m.check_sources([custody], {custody['path']: custody})
            def virgin(inner):
                m.check_absent([inner.marker, inner.output])
        return FakeContract(), source, custody

    def request(self, contract):
        value = m.prospective_request(contract)
        m.write_new(contract.request_path, value)
        return m.source_pin(contract.request_path)['sha256']

    def test_fake_capture_consumes_before_callback_and_no_self_accreditation(self):
        contract, _, _ = self.contract()
        digest = self.request(contract)
        called = []
        def fake(spec, output):
            called.append(True)
            self.assertTrue(contract.marker.exists())
            return {'passed': True, 'originalResultAccredited': True}
        receipt = m.execute_once(contract.request_path, digest, contract, fake)
        self.assertTrue(receipt['passed'])
        self.assertEqual(called, [True])
        for field in ('originalResultAccredited', 'ownerCleanupAccredited', 'runtimeAuthority'):
            self.assertIs(receipt[field], False)
        with self.assertRaises(ValueError):
            m.execute_once(contract.request_path, digest, contract, fake)
        self.assertEqual(called, [True])

    def test_failed_capture_stays_consumed(self):
        contract, _, _ = self.contract()
        digest = self.request(contract)
        def fake(spec, output):
            raise RuntimeError('synthetic failure')
        receipt = m.execute_once(contract.request_path, digest, contract, fake)
        self.assertFalse(receipt['passed'])
        self.assertTrue(contract.marker.exists())
        with self.assertRaises(ValueError):
            m.execute_once(contract.request_path, digest, contract, fake)

    def test_postcapture_source_and_custody_drift(self):
        for drift in ('source', 'custody'):
            with self.subTest(drift=drift):
                contract, source, custody = self.contract()
                digest = self.request(contract)
                def fake(spec, output):
                    Path((source if drift == 'source' else custody)['path']).write_text('drift')
                    return {'passed': True}
                self.assertFalse(m.execute_once(contract.request_path, digest, contract, fake)['passed'])
                import shutil
                shutil.rmtree(contract.records)

    def test_missing_real_capture_callback_is_rejected_before_consumption(self):
        contract, _, _ = self.contract()
        digest = self.request(contract)
        with self.assertRaises(ValueError):
            m.execute_once(contract.request_path, digest, contract)
        self.assertFalse(contract.marker.exists())

    def test_dirty_future_or_consumed_state_rejects(self):
        contract, _, _ = self.contract()
        digest = self.request(contract)
        contract.marker.write_text('consumed')
        with self.assertRaises(ValueError):
            m.execute_once(contract.request_path, digest, contract, lambda *_: {'passed': True})

    def test_request_wrong_case_missing_extra_and_repin(self):
        contract, _, _ = self.contract()
        for key, value in [('case', 'case-8'), ('originalInvocationOrdinal', 8),
                           ('sourcePins', []), ('capture', {})]:
            request = m.prospective_request(contract)
            request[key] = value
            with self.assertRaises(ValueError):
                m.validate_request(request, contract)


if __name__ == '__main__':
    unittest.main(argv=[__file__] + remaining, verbosity=2)
