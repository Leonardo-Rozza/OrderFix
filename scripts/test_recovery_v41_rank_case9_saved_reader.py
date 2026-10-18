"""Isolated saved-reader guards; no original tests, Docker or process dispatch."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

P = Path(__file__).resolve().parents[1]
ROOT = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw')
OLD = ROOT / 'rows/row-7/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-ac62225ee09a4e9397d2040efde9d875'
NEW = ROOT / 'rows/row-9/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-ca3647e6e83646a686934b2f5110ba70'
NONCE = 'ca3647e6e83646a686934b2f5110ba70'
CANDIDATE = Path(os.environ.get('CASE9_SAVED_READER_CANDIDATE', str(P / 'scripts/recovery_v41_rank_case9_saved_reader.py')))
spec = importlib.util.spec_from_file_location('case9_saved_candidate', CANDIDATE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def read(path):
    return json.loads(Path(path).read_bytes())


class ReaderTests(unittest.TestCase):
    def setUp(self):
        self.allow = read(NEW / 'exec-allowlist.json')
        self.recipe = read(ROOT / 'real-case-9-records/execution-recipe-01.json')
        self.request = read(NEW / 'request.json')
        self.owner = read(OLD / 'observed/owner-receipt.json')
        self.reg = self.owner['recoveryRegistry']
        self.reg.update(originalRowIndex=8, originalInvocationOrdinal=9, rankKind='OLDER_TAIL', nonce=NONCE)
        for db in self.reg['databases']:
            db.update(collate='C', ctype='C', caseOrdinal=9, rankKind='OLDER_TAIL')
        for index, attempt in enumerate(self.reg['attempts']):
            attempt.update(caseOrdinal=9, rankKind='OLDER_TAIL', step=self.allow['steps'][index])
            attempt['argv'] = [arg.replace('--lc-collate=en_US.utf8', '--lc-collate=C')
                              .replace('--lc-ctype=en_US.utf8', '--lc-ctype=C') for arg in attempt['argv']]
        self.owner['cleanup']['requestKey'] = NONCE
        self.report = read(ROOT / 'real-case-7-records/launcher/launcher-report-01.json')
        self.report.update(originalRowIndex=8, originalInvocationOrdinal=9, rankKind='OLDER_TAIL')
        self.report['runtimeAdmission']['runtimeInputArguments'] = copy.deepcopy(self.recipe['javaOptions'])
        selected = self.report['selectedExecution']
        for key in ('startedInvocations', 'finishedInvocations', 'succeededInvocations'):
            for inv in selected[key]:
                inv['invocationIndex'] = 9
                inv['uniqueId'] = selected['admittedTemplateUniqueId'] + '/[test-template-invocation:#9]'
                inv['observedDisplayName'] = 'V41 recovery order locale="C", restored="false", drift="OLDER_TAIL"'
        self.sources = {pin['path']: pin for pin in self.recipe['fixedPins']}
        self.classlog = (ROOT / 'real-case-7-records/launcher/class-init.log').read_text()
        self.full = read(next((OLD / 'observed').glob('*-owner-cleanup.json')))
        self.full['recoveryRegistry'] = copy.deepcopy(self.reg)
        self.cleanup_events = [read(next((OLD / 'observed').glob('*-cleanup.json'))), self.full]
        self.cleanup_events[0]['recoveryRegistry'] = copy.deepcopy(self.reg)

    def test_valid_exact_original(self):
        m.validate_original(self.report, self.allow, self.recipe, self.sources, self.classlog)

    def test_rejects_wrong_locale(self):
        bad = copy.deepcopy(self.reg)
        bad['databases'][0]['collate'] = 'en_US.utf8'
        with self.assertRaisesRegex(AssertionError, 'database'):
            m.validate_registry(bad, self.allow)

    def test_registry_two_databases_and_exact_vectors(self):
        self.assertEqual(len(m.validate_registry(self.reg, self.allow)), 2)
        for mutate in ('extra-exec', 'same-database', 'wrong-ordinal', 'dump', 'wrong-rank', 'argv'):
            bad = copy.deepcopy(self.reg)
            if mutate == 'extra-exec': bad['attempts'].append(copy.deepcopy(bad['attempts'][0]))
            elif mutate == 'same-database': bad['databases'][1]['database'] = bad['databases'][0]['database']
            elif mutate == 'wrong-ordinal': bad['originalInvocationOrdinal'] = 7
            elif mutate == 'dump': bad['dumps'] = ['unexpected.dump']
            elif mutate == 'wrong-rank': bad['rankKind'] = 'V41_NOT_LATEST'
            else: bad['attempts'][0]['argv'][-1] = 'wrong_database'
            with self.subTest(mutate=mutate), self.assertRaises(AssertionError):
                m.validate_registry(bad, self.allow)

    def test_original_counts_and_one_direct_callback(self):
        for mutate in ('failed', 'bool-count', 'two-callbacks', 'wrong-display', 'wrong-method', 'timeout'):
            bad = copy.deepcopy(self.report)
            if mutate == 'failed': bad['testsFailed'] = 1
            elif mutate == 'bool-count': bad['testsFound'] = True
            elif mutate == 'two-callbacks':
                for key in ('startedInvocations', 'finishedInvocations', 'succeededInvocations'):
                    bad['selectedExecution'][key].append(copy.deepcopy(bad['selectedExecution'][key][0]))
            elif mutate == 'wrong-display': bad['selectedExecution']['startedInvocations'][0]['observedDisplayName'] = 'wrong'
            elif mutate == 'wrong-method': bad['selectedMethod'] = 'otherMethod'
            else: bad['runtimeAdmission']['selectedOriginalTimeoutSeconds'] = 121
            with self.subTest(mutate=mutate), self.assertRaises(AssertionError):
                m.validate_original(bad, self.allow, self.recipe, self.sources, self.classlog)

    def test_jdbc_origin_agent_and_worker_guards(self):
        for mutate in ('jar', 'agent', 'live-worker', 'class-order'):
            bad = copy.deepcopy(self.report)
            log = self.classlog
            if mutate == 'jar': bad['runtimeAdmission']['pgJarSha256'] = '0' * 64
            elif mutate == 'agent': bad['runtimeAdmission']['zeroAgentPolicyAdmitted'] = False
            elif mutate == 'live-worker': bad['applicationShutdown']['newLiveWorkers'] = [99]
            else: log = "Initializing '" + bad['selectedClass'].replace('.', '/') + "'\nInitializing 'org/postgresql/util/LazyCleanerImpl'"
            with self.subTest(mutate=mutate), self.assertRaises(AssertionError):
                m.validate_original(bad, self.allow, self.recipe, self.sources, log)

    def test_exact_resources_and_local_only_port(self):
        nid = self.owner['cleanup']['handle']['networkId']
        actual = copy.deepcopy(self.request['containerTemplate'])
        actual['HostConfig']['NetworkMode'] = nid
        m.validate_resources(actual, self.request, nid)
        for key, value in [('Memory', 1293741824), ('MemorySwap', 2147483648),
                           ('NanoCpus', 2000000000), ('Privileged', True),
                           ('PortBindings', {'5432/tcp': [{'HostIp': '0.0.0.0', 'HostPort': ''}]})]:
            bad = copy.deepcopy(actual)
            bad['HostConfig'][key] = value
            with self.subTest(key=key), self.assertRaises(AssertionError):
                m.validate_resources(bad, self.request, nid)

    def test_cleanup_deadline_sockets_workers_and_unknown_ids(self):
        m.validate_cleanup(self.owner, self.cleanup_events, NONCE)
        for key, value in [('activeSockets', 1), ('workersJoined', False), ('unknownResources', True),
                           ('containerRemovalAcknowledged', 200), ('networkAbsentStatus', 200),
                           ('unaccreditedExecIds', ['unknown'])]:
            bad = copy.deepcopy(self.cleanup_events)
            bad[-1][key] = value
            with self.subTest(key=key), self.assertRaises(AssertionError):
                m.validate_cleanup(self.owner, bad, NONCE)
        bad = copy.deepcopy(self.cleanup_events)
        bad[-1]['strictCleanupDeadline'] += 1
        with self.assertRaises(AssertionError):
            m.validate_cleanup(self.owner, bad, NONCE)

    def test_http_pairs_are_causal_not_last_network(self):
        cid, nid = 'c' * 64, 'd' * 64
        container = {'method': 'GET', 'path': '/v1.56/containers/' + cid + '/json', 'status': 200}
        network = {'method': 'GET', 'path': '/v1.56/networks/' + nid, 'status': 200}
        self.assertEqual(m.causal_pairs([container, network], cid, nid, '/v1.56'), [(container, network)])
        with self.assertRaises(AssertionError):
            m.causal_pairs([container, dict(network, path='/v1.56/networks/wrong'), network], cid, nid, '/v1.56')

    def test_parent_transport_and_postdocker_are_not_self_accreditation(self):
        transport = {'exit_code': 0, 'output': '{"passed":true,"originalResultAccredited":false}'}
        post = {'passed': True, 'responses': [{'status': 404}, {'status': 404}]}
        m.validate_transport(transport, post)
        for value in ({'exit_code': 1, 'output': transport['output']},
                      {'exit_code': 0, 'output': '{"passed":true,"originalResultAccredited":true}'}):
            with self.assertRaises(AssertionError): m.validate_transport(value, post)
        with self.assertRaises(AssertionError):
            m.validate_transport(transport, {'passed': True, 'responses': [{'status': 200}, {'status': 404}]})

    def test_strict_json_duplicate_nonfinite_and_pin_drift(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp', prefix='case9-reader-json-') as tmp:
            path = Path(tmp) / 'data.json'
            for raw in ('{"a":1,"a":2}', '{"a":NaN}', '{"a":1e999}'):
                path.write_text(raw)
                with self.assertRaises((AssertionError, ValueError)):
                    m.load(path)
            path.write_text('{"a":1}')
            expected = m.pin(path)
            m.check_custody([expected], [], [])
            path.write_text('{"a":2}')
            with self.assertRaises(AssertionError):
                m.check_custody([expected], [], [])

    def test_closed_inventory_missing_extra_alias_and_historical_resurrection(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp', prefix='case9-reader-custody-') as tmp:
            root = Path(tmp)
            child = root / 'one.json'
            child.write_text('{}')
            closed = [{'root': str(root), 'files': [str(child)]}]
            m.check_custody([m.pin(child)], closed, [])
            extra = root / 'extra'
            extra.write_text('extra')
            with self.assertRaises(AssertionError): m.check_custody([m.pin(child)], closed, [])
            extra.unlink()
            with self.assertRaises(AssertionError): m.check_custody([], [], [child])
            child.unlink()
            child.symlink_to(root / 'missing')
            with self.assertRaises((AssertionError, OSError)): m.pin(child)

    def test_result_create_new_only_inside_explicit_audit_root(self):
        with tempfile.TemporaryDirectory(dir='/private/tmp', prefix='case9-reader-output-') as tmp:
            root = Path(tmp)
            m.write_result(root, {'qualified': True})
            with self.assertRaises(FileExistsError): m.write_result(root, {'qualified': True})
            self.assertEqual(set(path.name for path in root.iterdir()), {'saved-qualification-01.json'})


if __name__ == '__main__':
    unittest.main(verbosity=2)
