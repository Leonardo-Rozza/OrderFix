"""Case-seven-only admission regressions; every capture is an isolated fixture fake."""
import argparse
import copy
import importlib.util
import json
import os
from pathlib import Path
import resource
import signal
import tempfile
import unittest
from unittest.mock import patch

CANDIDATE = None
HEAD = 'a' * 40
CSV = 'en_US.utf8,false,V41_NOT_LATEST'
NONCE = 'ac62225ee09a4e9397d2040efde9d875'


class CaseSevenTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='case7-admission-fixture-', dir='/private/tmp')
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.project = self.root / 'project'
        self.project.mkdir()
        self.contract = CANDIDATE.Contract(self.root, self.project)
        self.contract.records.mkdir()
        self.calls = []
        self.contract.anchors = {}
        self.contract.extra_paths = set()
        self.contract.import_paths = set()
        self.contract.alias = None
        self.contract.shared = None
        self.contract.canonical.parent.mkdir(parents=True)
        self.contract.canonical.write_text('Accepted case-seven fixture\n')
        self.contract.branch_ref.parent.mkdir(parents=True)
        self.contract.branch_ref.write_text(HEAD + '\n')
        self.contract.head_file.write_text('ref: refs/heads/codex/v41-rank-launcher-integrated\n')
        self.immutable = self.root / 'immutable.py'
        self.immutable.write_text('Immutable original SOURCE\n')
        self.maps = []
        for identity in ('generic-parent-capture', 'parent-stages', 'original-row1-request', 'v42-baseline'):
            pins = {}
            for role in ('historicalMissingSource', 'archiveOrigin', 'newSource'):
                path = self.root / (identity + '-' + role)
                path.write_text('Unmodified recovered payload ' + identity)
                pins[role] = CANDIDATE.source_pin(path)
            Path(pins['historicalMissingSource']['path']).unlink()
            self.maps.append(dict(pins, identity=identity, bytesIdentical=True,
                contentRewritten=False, oldPathRestored=False, timestampsCopied=False,
                role='SOURCE_PAYLOAD_NOT_EXECUTION_AUTHORITY',
                usage='RUNTIME_ENTRYPOINT' if identity == 'generic-parent-capture' else 'PROVENANCE_SOURCE_ONLY'))
        self.fixed = [CANDIDATE.source_pin(path) for path in
            (self.immutable, self.contract.canonical, self.contract.branch_ref, self.contract.head_file)]
        self.fixed += [item['newSource'] for item in self.maps]
        self.parent = {'schema': 1, 'argv': ['python', '-B', '-S', self.maps[0]['newSource']['path'],
            '--spec', 'parent-input.json', '--sha', '0' * 64, '--once'],
            'cwd': str(self.contract.records),
            'environment': CANDIDATE.clean_environment(self.root / 'home', self.root / 'tmp'),
            'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280}
        self.contract.parent = copy.deepcopy(self.parent)
        self.recipe = {'fixedPins': copy.deepcopy(self.fixed), 'extraSourcePins': [],
            'recoveredSourceMappings': [{k: v for k, v in item.items() if k != 'usage'} for item in self.maps],
            'archiveOriginSourcePins': [item['archiveOrigin'] for item in self.maps],
            'parentArgv': self.parent['argv'], 'parentCwd': self.parent['cwd'],
            'parentEnvironment': self.parent['environment']}
        self.contract.recipe = self.recipe
        self.contract.expected_historical_count = len(self.fixed)
        self.recipe_path = self.root / 'recipe.json'
        self.recipe_path.write_text(json.dumps(self.recipe))
        self.contract.recipe_pin = CANDIDATE.source_pin(self.recipe_path)
        self.prior_root = self.root / 'prior-consumed'
        self.prior_root.mkdir()
        self.prior_file = self.prior_root / 'original-evidence.json'
        self.prior_file.write_text('Protected prior consumed DATA')
        self.contract.expected_prior_data_count = 1
        self.contract.expected_prior_roots = [str(self.prior_root)]
        self.contract.prior_data = {'role': 'PRIOR_CONSUMED_DATA_AND_EVIDENCE_NOT_SOURCE',
            'sourceSubstitutionAllowed': False, 'roots': [str(self.prior_root)],
            'pins': [CANDIDATE.source_pin(self.prior_file)]}
        self.protected_file = self.root / 'protected-audit.json'
        self.protected_file.write_text('Immutable DATA audit')
        self.pairs = []
        for index in range(6):
            pair = {}
            for role in ('private', 'durable'):
                path = self.root / ('prepared-%s-%d.json' % (role, index))
                path.write_text('Prepared immutable control %d' % index)
                pair[role] = CANDIDATE.source_pin(path)
            self.pairs.append(pair)
        self.control = {'schema': 'rank12-case7-current-source-admission/v1',
            'role': 'DATA_CURRENT_SOURCE_ADMISSION_NOT_EXECUTION_AUTHORITY',
            'case': 'case-7', 'originalRowIndex': 6, 'originalInvocationOrdinal': 7,
            'csvRow': CSV, 'ownerNonce': NONCE, 'historicalSourceGate': 'OPEN_MISSING_4',
            'currentSourceAdmissionPassed': False, 'executionAuthorized': False,
            'originalTestsModified': False, 'limitsChanged': False,
            'recipe': self.contract.recipe_pin, 'preparedPairs': self.pairs,
            'mappings': self.maps, 'priorDataRoots': [str(self.prior_root)],
            'protectedData': [CANDIDATE.source_pin(self.protected_file)]}
        self.contract.control_path = self.root / 'current-admission.json'
        self.contract.expected_recovery_data = self.control['protectedData']
        self.contract.prepared_pairs = self.pairs
        self.refresh_control()

    def refresh_control(self):
        self.contract.control_path.write_text(json.dumps(self.control))
        self.contract.control_pin = CANDIDATE.source_pin(self.contract.control_path)

    def request(self):
        return {'schema': 'rank12-root280-case7/v1', 'case': 'case-7',
            'originalRowIndex': 6, 'originalInvocationOrdinal': 7, 'csvRow': CSV,
            'reviewedHead': HEAD, 'capture': copy.deepcopy(self.parent),
            'sourcePins': list(self.contract.expected_sources().values())}

    def write_request(self, request):
        self.contract.request_path.write_text(json.dumps(request))
        return CANDIDATE.source_pin(self.contract.request_path)['sha256']

    def runtime_fixture(self):
        for directory in self.contract.virgin_directories:
            directory.mkdir(parents=True, exist_ok=True)

    def fake_capture(self, spec, output):
        self.calls.append((spec, output))
        self.assertTrue(self.contract.marker.is_file(), 'Consumption must precede the fake capture')
        self.assertTrue(output.is_dir())
        return {'passed': True}

    def reject(self, request, reason):
        digest = self.write_request(request)
        with self.assertRaisesRegex(ValueError, reason):
            CANDIDATE.execute_once(self.contract.request_path, digest, self.contract, self.fake_capture)
        self.assertFalse(self.contract.marker.exists())
        self.assertEqual(self.calls, [])

    def test_001_already_projected_sources_are_not_projected_twice(self):
        # TDD baseline isolates the donor's obsolete old-to-new projection, not import failure.
        historical = {item['path']: item for item in self.fixed}
        with patch.object(self.contract, 'current_admission', return_value=self.maps):
            try:
                actual = self.contract.project_current_sources(copy.deepcopy(historical))
            except ValueError as error:
                self.fail('Already-projected case7 SOURCE must be admitted: ' + str(error))
        for item in self.maps:
            self.assertEqual(actual[item['newSource']['path']], item['newSource'])
            self.assertEqual(actual[item['archiveOrigin']['path']], item['archiveOrigin'])
            self.assertNotIn(item['historicalMissingSource']['path'], actual)

    def test_002_positive_request_preserves_all_nine_parent_arguments(self):
        request = self.request()
        self.assertEqual(CANDIDATE.validate_request(request, self.contract),
                         self.contract.expected_sources())
        self.assertEqual(request['capture'], self.parent)
        self.assertEqual(len(request['capture']['argv']), 9)

    def test_003_fake_success_consumes_once_without_accreditation(self):
        self.runtime_fixture()
        request = self.request()
        digest = self.write_request(request)
        result = CANDIDATE.execute_once(self.contract.request_path, digest, self.contract, self.fake_capture)
        self.assertTrue(result['passed'], result['failures'])
        self.assertEqual(len(self.calls), 1)
        for key in ('originalResultAccredited', 'ownerCleanupAccredited', 'runtimeAuthority', 'productionAuthority'):
            self.assertIs(result[key], False)
        with self.assertRaisesRegex(ValueError, 'Once marker/output/runtime DATA'):
            CANDIDATE.execute_once(self.contract.request_path, digest, self.contract, self.fake_capture)
        self.assertEqual(len(self.calls), 1)

    def test_004_fake_failure_retains_consumption_without_retry(self):
        self.runtime_fixture()
        request = self.request()
        def fail(spec, output):
            self.fake_capture(spec, output)
            raise RuntimeError('Deliberate fixture capture failure')
        result = CANDIDATE.execute_once(self.contract.request_path, self.write_request(request), self.contract, fail)
        self.assertFalse(result['passed'])
        self.assertTrue(self.contract.marker.exists())
        self.assertIn('Deliberate fixture capture failure', result['failures'][0])
        self.assertTrue((self.contract.output / 'rank-capture-receipt.json').exists())

    def test_005_static_admission_keeps_root_state_absent(self):
        for directory in self.contract.prefreeze_directories:
            directory.mkdir(parents=True, exist_ok=True)
        before = {str(path) for path in self.root.rglob('*')}
        report = CANDIDATE.static_admission(self.contract)
        self.assertTrue(report['passed'])
        self.assertEqual(report['absentRuntimePaths'], 30)
        self.assertEqual(report['emptyRuntimeDirectories'], 12)
        self.assertFalse(report['runtimeAuthority'])
        self.assertFalse(report['dockerVerified'])
        self.assertEqual({str(path) for path in self.root.rglob('*')}, before)

    def test_006_request_digest_is_required_before_consumption(self):
        request = self.request()
        self.write_request(request)
        with self.assertRaisesRegex(ValueError, 'Pinned JSON SHA mismatch'):
            CANDIDATE.execute_once(self.contract.request_path, '0' * 64, self.contract, self.fake_capture)
        self.assertFalse(self.contract.marker.exists())

    def test_007_source_union_rejects_repinning(self):
        request = self.request()
        self.immutable.write_text('Changed and maliciously repinned SOURCE')
        for index, pin in enumerate(request['sourcePins']):
            if pin['path'] == str(self.immutable):
                request['sourcePins'][index] = CANDIDATE.source_pin(self.immutable)
        self.reject(request, 'Exact complete SOURCE union')

    def test_008_historical_path_must_remain_absent(self):
        request = self.request()
        Path(self.maps[0]['historicalMissingSource']['path']).write_text('Restored old path')
        self.reject(request, 'Historical missing SOURCE must remain absent')

    def test_009_wrong_current_branch_is_rejected(self):
        request = self.request()
        request['reviewedHead'] = 'b' * 40
        self.reject(request, 'Pinned reviewed boundary')

    def test_010_recovered_source_symlink_ancestry_is_rejected(self):
        alias = self.root / 'alias'
        alias.symlink_to(self.root, target_is_directory=True)
        pin = CANDIDATE.source_pin(alias / Path(self.maps[0]['newSource']['path']).name)
        self.maps[0]['newSource'] = pin
        self.recipe['recoveredSourceMappings'][0]['newSource'] = pin
        self.recipe_path.write_text(json.dumps(self.recipe))
        self.contract.recipe_pin = CANDIDATE.source_pin(self.recipe_path)
        self.control['recipe'] = self.contract.recipe_pin
        self.refresh_control()
        with self.assertRaisesRegex(ValueError, 'Recovered/archive path ancestry'):
            self.contract.current_admission()

    def test_011_source_single_link_rule_rejects_hardlinks(self):
        os.link(self.immutable, self.root / 'hard-link')
        with self.assertRaisesRegex(ValueError, 'Ordinary single-link SOURCE'):
            CANDIDATE.source_pin(self.immutable)

    def test_012_current_data_cannot_be_a_source(self):
        request = self.request()
        request['sourcePins'].append(self.contract.control_pin)
        self.reject(request, 'Exact complete SOURCE union')

    def test_013_prior_data_cannot_be_a_source(self):
        request = self.request()
        request['sourcePins'].append(self.contract.prior_data['pins'][0])
        self.reject(request, 'Exact complete SOURCE union')

    def test_014_fixed_locator_cannot_be_overridden(self):
        with self.assertRaisesRegex(ValueError, 'Fixed prospective request locator'):
            CANDIDATE.execute_once(self.root / 'other.json', '0' * 64, self.contract, self.fake_capture)

    def test_015_wrong_environment_rejected_before_execution(self):
        with patch.object(CANDIDATE, 'production_contract', return_value=self.contract), \
                patch.dict(os.environ, {'PATH': '/unsafe'}, clear=True):
            with self.assertRaisesRegex(ValueError, 'Clean ROOT ENV7'):
                CANDIDATE.main(['--execute-parent-approved-rank12-case7-root280', '--request',
                    str(self.contract.request_path), '--request-sha', '0' * 64])
        self.assertEqual(self.calls, [])

    def test_016_preexisting_marker_is_not_reset(self):
        self.runtime_fixture()
        request = self.request()
        self.contract.marker.write_text('Existing consumed marker')
        self.reject_preserving_marker(request)

    def reject_preserving_marker(self, request):
        with self.assertRaisesRegex(ValueError, 'Once marker/output/runtime DATA'):
            CANDIDATE.execute_once(self.contract.request_path, self.write_request(request), self.contract, self.fake_capture)
        self.assertEqual(self.contract.marker.read_text(), 'Existing consumed marker')
        self.assertEqual(self.calls, [])


def request_mutation(key, value, reason, capture=False):
    def test(self):
        request = self.request()
        (request['capture'] if capture else request)[key] = copy.deepcopy(value)
        self.reject(request, reason)
    return test


for name, key, value in (
        ('schema', 'schema', 'rank12-root280-case6/v1'), ('case', 'case', 'case-6'),
        ('row', 'originalRowIndex', 5), ('bool_row', 'originalRowIndex', True),
        ('ordinal', 'originalInvocationOrdinal', 6), ('bool_ordinal', 'originalInvocationOrdinal', True),
        ('csv', 'csvRow', 'C,true,V41_NOT_LATEST'), ('extra', 'extra', False)):
    setattr(CaseSevenTests, 'test_request_' + name,
            request_mutation(key, value, 'Closed seventh original rank case only'))
for name, key, value in (
        ('argv', 'argv', ['invalid']), ('cwd', 'cwd', '/invalid'),
        ('environment', 'environment', {}), ('run_cap', 'runTimeoutSeconds', 281),
        ('total_cap', 'totalTimeoutSeconds', 279), ('bool_cap', 'runTimeoutSeconds', True)):
    setattr(CaseSevenTests, 'test_capture_' + name,
            request_mutation(key, value, 'Exact frozen parent argv9/cwd/ENV7', capture=True))


def control_mutation(key, value, reason):
    def test(self):
        self.control[key] = copy.deepcopy(value)
        self.refresh_control()
        with self.assertRaisesRegex(ValueError, reason):
            self.contract.current_admission()
        self.assertEqual(self.calls, [])
    return test


for key, value in (
        ('schema', 'other'), ('role', 'SOURCE'), ('case', 'case-6'),
        ('originalRowIndex', True), ('originalInvocationOrdinal', 6),
        ('csvRow', 'C,false,V41_NOT_LATEST'), ('ownerNonce', '0' * 32),
        ('historicalSourceGate', 'PASSED'), ('currentSourceAdmissionPassed', True),
        ('executionAuthorized', True), ('originalTestsModified', True), ('limitsChanged', True),
        ('unexpected', False)):
    setattr(CaseSevenTests, 'test_control_' + key,
            control_mutation(key, value, 'Closed seventh-case current admission'))


def physical_mutation(role, mode, phase):
    def test(self):
        request = self.request()
        CANDIDATE.validate_request(request, self.contract)
        paths = {'control': self.contract.control_path, 'recipe': self.recipe_path,
            'audit': self.protected_file, 'archive': Path(self.maps[0]['archiveOrigin']['path']),
            'recovered': Path(self.maps[0]['newSource']['path']), 'prior': self.prior_file,
            'source': self.immutable, 'prepared': Path(self.pairs[0]['private']['path'])}
        reasons = {'control': 'Current admission DATA full identity drift',
            'recipe': 'Recipe full identity drift', 'audit': 'Recovery audit DATA identity drift',
            'archive': 'Ordinary non-executable recovered/archive full identity',
            'recovered': 'Ordinary non-executable recovered/archive full identity',
            'prior': 'Prior consumed DATA identity drift', 'source': 'SOURCE.*drift',
            'prepared': 'Prepared control full identity drift'}
        def mutate():
            path = paths[role]
            if mode == 'content':
                path.write_bytes(path.read_bytes() + b' changed')
            else:
                path.chmod(0o400)
        if phase == 'pre':
            mutate()
            self.reject(request, reasons[role])
        else:
            self.runtime_fixture()
            def capture(spec, output):
                result = self.fake_capture(spec, output)
                mutate()
                return result
            result = CANDIDATE.execute_once(self.contract.request_path, self.write_request(request), self.contract, capture)
            self.assertFalse(result['passed'])
            self.assertTrue(self.contract.marker.exists())
            self.assertEqual(len(self.calls), 1)
            self.assertRegex('\n'.join(result['failures']), reasons[role])
    return test


for role in ('control', 'recipe', 'audit', 'archive', 'recovered', 'prior', 'source', 'prepared'):
    for mode in ('content', 'stat'):
        for phase in ('pre', 'post'):
            setattr(CaseSevenTests, 'test_drift_%s_%s_%s' % (role, mode, phase),
                    physical_mutation(role, mode, phase))


def source_union_mutation(kind):
    def test(self):
        request = self.request()
        if kind == 'missing':
            request['sourcePins'].pop()
        elif kind == 'duplicate':
            request['sourcePins'].append(copy.deepcopy(request['sourcePins'][0]))
        else:
            request['sourcePins'].append(CANDIDATE.source_pin(self.protected_file))
        self.reject(request, 'Duplicate SOURCE path' if kind == 'duplicate' else 'Exact complete SOURCE union')
    return test


for kind in ('missing', 'duplicate', 'extra'):
    setattr(CaseSevenTests, 'test_source_union_' + kind, source_union_mutation(kind))


def static_mutation(kind):
    def test(self):
        for directory in self.contract.prefreeze_directories:
            directory.mkdir(parents=True, exist_ok=True)
        if kind == 'root_home':
            (self.contract.records / 'root280-home').mkdir()
        elif kind == 'root_request':
            self.contract.request_path.write_text('Not authorized to freeze yet')
        elif kind == 'runtime_marker':
            self.contract.prefreeze_absent_paths[-1].write_text('consumed')
        elif kind == 'nonempty':
            (self.contract.prefreeze_directories[0] / 'unexpected').write_text('drift')
        else:
            directory = self.contract.prefreeze_directories[0]
            directory.rmdir()
            directory.symlink_to(self.contract.prefreeze_directories[1], target_is_directory=True)
        reason = 'Pre-freeze runtime paths must remain absent' if kind in (
            'root_home', 'root_request', 'runtime_marker') else 'Pre-freeze directory must be ordinary and empty'
        with self.assertRaisesRegex(ValueError, reason):
            CANDIDATE.static_admission(self.contract)
        self.assertEqual(self.calls, [])
    return test


for kind in ('root_home', 'root_request', 'runtime_marker', 'nonempty', 'symlink'):
    setattr(CaseSevenTests, 'test_static_' + kind, static_mutation(kind))


class PureParserTests(unittest.TestCase):
    def test_duplicate_json_key(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate JSON key'):
            CANDIDATE.strict_json(b'{"key":1,"key":2}')

    def test_nonfinite_json_values(self):
        for raw in (b'{"key":NaN}', b'{"key":Infinity}', b'{"key":-Infinity}', b'{"key":1e999}'):
            with self.subTest(raw=raw), self.assertRaisesRegex(ValueError, 'Nonfinite JSON'):
                CANDIDATE.strict_json(raw)

    def test_case_six_cli_is_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Closed case-seven ROOT CLI'):
            CANDIDATE.main(['--execute-parent-approved-rank12-case6-root280', '--request',
                '/unused', '--request-sha', '0' * 64])

    def test_cli_does_not_accept_extra_configuration(self):
        with self.assertRaisesRegex(ValueError, 'Closed case-seven ROOT CLI'):
            CANDIDATE.main(['--execute-parent-approved-rank12-case7-root280', '--request',
                '/unused', '--request-sha', '0' * 64, '--root', '/arbitrary'])


class RecipeShapeTests(unittest.TestCase):
    def recipe(self):
        return {'schema': 'rank12-seventh-original-case-execution-recipe/v1',
            'case': 'case-7', 'originalRowIndex': 6, 'originalInvocationOrdinal': 7,
            'csvRow': CSV, 'extraSourcePinCount': 0, 'completePriorSourceCount': 10094,
            'extraSourcePins': [], 'fixedPins': [None] * 10094,
            'originalOperationPlan': {'execCount': 2, 'databaseCount': 2,
                'dumpCount': 0, 'restoreCount': 0, 'cloneCount': 0},
            'parentArgv': ['fixed'] * 9, 'rootEnvelopeSeconds': 280,
            'runTimeoutSeconds': 240, 'totalTimeoutSeconds': 270,
            'originalCaseSeconds': 120, 'execSeconds': 45, 'launchSeconds': 60,
            'ownerSeconds': 240, 'cleanupSeconds': 30, 'readChunkBytes': 65536,
            'stdoutCapBytes': 8388608, 'stderrCapBytes': 8388608,
            'historicalSourceGate': 'OPEN_MISSING_4', 'runtimeAuthority': False,
            'productionAuthority': False, 'executionAuthorized': False,
            'rootEnvelopeAvailable': False, 'callerAvailable': False,
            'originalTestExecuted': False, 'ownerExecuted': False,
            'dockerApiSqlExecuted': False, 'limitsChanged': False,
            'sourceRecompiled': False}

    def test_positive_fixed_false_plan(self):
        CANDIDATE.validate_recipe(self.recipe())


def recipe_mutation(key, value, reason):
    def test(self):
        recipe = self.recipe()
        recipe[key] = copy.deepcopy(value)
        with self.assertRaisesRegex(ValueError, reason):
            CANDIDATE.validate_recipe(recipe)
    return test


for key, value, reason in (
        ('schema', 'sixth', 'Historical seventh-row binding'),
        ('originalRowIndex', True, 'Historical seventh-row binding'),
        ('originalInvocationOrdinal', 6, 'Historical seventh-row binding'),
        ('csvRow', 'en_US.utf8,true,V41_NOT_LATEST', 'Historical seventh-row binding'),
        ('originalOperationPlan', {'execCount': 5, 'databaseCount': 3, 'dumpCount': 1,
            'restoreCount': 1, 'cloneCount': 0}, 'Exactly two creates'),
        ('completePriorSourceCount', 10078, 'Closed already-projected SOURCE metadata'),
        ('extraSourcePins', [None], 'Closed already-projected SOURCE metadata'),
        ('runtimeAuthority', True, 'Historical recipe is not execution authority'),
        ('historicalSourceGate', 'PASSED', 'Historical recipe is not execution authority')):
    setattr(RecipeShapeTests, 'test_recipe_' + key, recipe_mutation(key, value, reason))
for key, value in (('rootEnvelopeSeconds', 281), ('runTimeoutSeconds', 241),
        ('totalTimeoutSeconds', 271), ('originalCaseSeconds', 121), ('execSeconds', 46),
        ('launchSeconds', 61), ('ownerSeconds', 241), ('cleanupSeconds', 31),
        ('readChunkBytes', 65537), ('stdoutCapBytes', 8388609), ('stderrCapBytes', 8388609)):
    setattr(RecipeShapeTests, 'test_recipe_cap_' + key,
            recipe_mutation(key, value, 'Frozen original and capture limits'))


if __name__ == '__main__':
    signal.alarm(120)
    resource.setrlimit(resource.RLIMIT_FSIZE, (8388608, 8388608))
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', required=True)
    parser.add_argument('--test', help='Run one already-frozen behavioral regression for the RED phase')
    args = parser.parse_args()
    specification = importlib.util.spec_from_file_location('case7_candidate', args.candidate)
    CANDIDATE = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(CANDIDATE)
    unittest.main(argv=[__file__] + ([args.test] if args.test else []), verbosity=2)
