"""Isolated safety checks; never imports a production caller or starts a process."""
import copy
import importlib.util
from pathlib import Path
import sys
import types
import unittest

candidate = Path(sys.argv[2]) if len(sys.argv) == 3 and sys.argv[1] == '--candidate' else (
    Path(__file__).with_name('recovery_v41_rank_case9_runtime_adapter.py'))
sys.argv[1:] = []
spec = importlib.util.spec_from_file_location('case9_adapter_candidate', candidate)
ADAPTER = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ADAPTER)


def pin(name):
    return {'path': '/private/tmp/' + name, 'bytes': 1, 'sha256': 'a' * 64,
            'stat8': dict.fromkeys(('st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_gid',
                                   'st_nlink', 'st_mtime_ns', 'st_ctime_ns'), 1)}


def bindings():
    value = {'schema': 'rank12-case9-parent-bindings/v1', 'case': 'case-9',
             'rowIndex': 8, 'ordinal': 9, 'csvRow': 'C,false,OLDER_TAIL',
             'nonce': 'ca3647e6e83646a686934b2f5110ba70',
             'caller': pin('caller'), 'shared': pin('shared'), 'adapter': pin('adapter'),
             'canonical': pin('canonical'), 'branchRef': pin('ref'), 'indexB': pin('index'),
             'auxiliarySources': [pin('new-test')], 'closedRoots': [],
             'limits': {'rootEnvelopeSeconds': 280, 'runTimeoutSeconds': 240,
                        'totalTimeoutSeconds': 270, 'originalCaseSeconds': 120,
                        'execSeconds': 45, 'launchSeconds': 60, 'ownerSeconds': 240,
                        'cleanupSeconds': 30, 'readChunkBytes': 65536,
                        'stdoutCapBytes': 8388608, 'stderrCapBytes': 8388608}}
    value['custodyPins'] = [value[key] for key in
                            ('caller', 'shared', 'adapter', 'canonical', 'branchRef', 'indexB')]
    value['custodyPins'] += value['auxiliarySources']
    return value


def docker_proof():
    nonce = 'ca3647e6e83646a686934b2f5110ba70'
    image = 'sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777'
    return {'socket': '/Users/leonardorozza/.docker/run/docker.sock',
            'passed': True, 'readOnlyGET': True, 'globalInventoryQueried': False,
            'responses': [
                {'method': 'GET', 'target': '/version', 'status': 200, 'apiVersion': '1.56'},
                {'method': 'GET', 'target': '/v1.56/images/' + image + '/json', 'status': 200,
                 'imageId': image, 'platform': 'linux/arm64', 'pgVersion': '16.14'},
                {'method': 'GET', 'target': '/v1.56/containers/ordenfix-pro-recovery-v41-rank12-pg-' + nonce + '/json', 'status': 404},
                {'method': 'GET', 'target': '/v1.56/networks/ordenfix-pro-recovery-v41-rank12-net-' + nonce, 'status': 404}]}


class HeaderTests(unittest.TestCase):
    def test_positive_frozen_header(self):
        ADAPTER.validate_bindings(bindings())

    def test_wrong_identity_rejected(self):
        for key, replacement in [('rowIndex', 7), ('ordinal', 8), ('csvRow', 'C,true,OLDER_TAIL'),
                                 ('nonce', '0' * 32), ('case', 'case-8')]:
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'Exclusive ninth'):
                value = bindings()
                value[key] = replacement
                ADAPTER.validate_bindings(value)

    def test_bool_and_changed_budget_rejected(self):
        for replacement in (True, 281, 280.0):
            value = bindings()
            value['limits']['rootEnvelopeSeconds'] = replacement
            with self.subTest(replacement=replacement), self.assertRaisesRegex(ValueError, 'Frozen limits'):
                ADAPTER.validate_bindings(value)

    def test_extra_key_rejected(self):
        value = bindings()
        value['executeAutomatically'] = True
        with self.assertRaisesRegex(ValueError, 'Exact parent bindings'):
            ADAPTER.validate_bindings(value)

    def test_auxiliary_source_must_be_in_custody(self):
        value = bindings()
        value['custodyPins'].pop()
        with self.assertRaisesRegex(ValueError, 'Declared external SOURCE'):
            ADAPTER.validate_bindings(value)

    def test_duplicate_or_conflicting_pin_rejected(self):
        value = bindings()
        value['custodyPins'].append(copy.deepcopy(value['custodyPins'][0]))
        with self.assertRaisesRegex(ValueError, 'Distinct custody'):
            ADAPTER.validate_bindings(value)


class DockerProofTests(unittest.TestCase):
    def test_positive_literal_probe_observation(self):
        ADAPTER.validate_docker_proof(docker_proof())

    def test_existing_resource_or_wrong_nonce_rejected(self):
        for field, replacement in [('status', 200), ('target', '/v1.56/containers/other/json')]:
            value = docker_proof()
            value['responses'][2][field] = replacement
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, 'Exact local Docker'):
                ADAPTER.validate_docker_proof(value)

    def test_remote_socket_or_wrong_image_rejected(self):
        value = docker_proof()
        value['socket'] = 'tcp://remote:2375'
        with self.assertRaisesRegex(ValueError, 'Local read-only Docker'):
            ADAPTER.validate_docker_proof(value)
        value = docker_proof()
        value['responses'][1]['imageId'] = 'other'
        with self.assertRaisesRegex(ValueError, 'Pinned image'):
            ADAPTER.validate_docker_proof(value)


class DispatchTests(unittest.TestCase):
    def fixture(self):
        order = []
        callback = lambda *_: None
        shared = types.SimpleNamespace(capture_owned_session=callback)
        contract = types.SimpleNamespace(request_path=Path('/private/tmp/request'))
        def execute(path, digest, current, capture):
            self.assertEqual((path, digest, current, capture),
                             (contract.request_path, 'a' * 64, contract, callback))
            order.append('execute')
            return {'passed': True, 'originalResultAccredited': False}
        return order, types.SimpleNamespace(execute_once=execute), shared, contract

    def test_explicit_callback_and_before_after_guard(self):
        order, caller, shared, contract = self.fixture()
        result = ADAPTER.dispatch_once(caller, shared, contract, 'a' * 64,
                                       lambda: order.append('guard'))
        self.assertTrue(result['passed'])
        self.assertEqual(order, ['guard', 'execute', 'guard'])

    def test_failed_preflight_never_dispatches(self):
        order, caller, shared, contract = self.fixture()
        def reject():
            raise ValueError('Custody drift')
        with self.assertRaisesRegex(ValueError, 'Custody drift'):
            ADAPTER.dispatch_once(caller, shared, contract, 'a' * 64, reject)
        self.assertEqual(order, [])

    def test_failed_postcheck_does_not_retry(self):
        order, caller, shared, contract = self.fixture()
        def guard():
            if order:
                raise ValueError('Post-capture drift')
            order.append('guard')
        with self.assertRaisesRegex(ValueError, 'Post-capture drift'):
            ADAPTER.dispatch_once(caller, shared, contract, 'a' * 64, guard)
        self.assertEqual(order, ['guard', 'execute'])


if __name__ == '__main__':
    unittest.main()
