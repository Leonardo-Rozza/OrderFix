"""Run-specific orchestration of the immutable ninth caller, never a new supervisor.

The parent owns native/human authorization and fresh local Docker observations.
Auxiliary execution SOURCE and later proof custody stay outside frozen SOURCE10142.
Capture success does not accredit the original test, SQL operations or cleanup.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys

PROJECT = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend')
CALLER = PROJECT / 'scripts/recovery_v41_rank_case9_outer_capture.py'
CALLER_SHA = 'f253dbe4c597169dde037eb4036fd5409dfeec7ba8ccda529b7b90ed5ee56eba'
SHARED = PROJECT / 'scripts/recovery_v41_outer_capture.py'
SHARED_SHA = '0ce15a0f1253b82a098a1fbe642956ad28fc4d48c5395255a6621fd3f9e1159a'
NONCE = 'ca3647e6e83646a686934b2f5110ba70'
IMAGE = 'sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777'
SOCKET = '/Users/leonardorozza/.docker/run/docker.sock'
LIMITS = {'rootEnvelopeSeconds': 280, 'runTimeoutSeconds': 240,
          'totalTimeoutSeconds': 270, 'originalCaseSeconds': 120, 'execSeconds': 45,
          'launchSeconds': 60, 'ownerSeconds': 240, 'cleanupSeconds': 30,
          'readChunkBytes': 65536, 'stdoutCapBytes': 8388608, 'stderrCapBytes': 8388608}
BINDING_KEYS = {'schema', 'case', 'rowIndex', 'ordinal', 'csvRow', 'nonce', 'caller',
                'shared', 'adapter', 'canonical', 'branchRef', 'indexB', 'custodyPins',
                'closedRoots', 'auxiliarySources', 'limits'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_bindings(value):
    require(type(value) is dict and set(value) == BINDING_KEYS,
            'Exact parent bindings schema')
    require(value['schema'] == 'rank12-case9-parent-bindings/v1'
            and value['case'] == 'case-9' and type(value['rowIndex']) is int
            and value['rowIndex'] == 8 and type(value['ordinal']) is int
            and value['ordinal'] == 9 and value['csvRow'] == 'C,false,OLDER_TAIL'
            and value['nonce'] == NONCE, 'Exclusive ninth-row parent bindings')
    require(value['limits'] == LIMITS and type(value['limits']) is dict
            and all(type(item) is int for item in value['limits'].values()), 'Frozen limits')
    require(type(value['custodyPins']) is list and 0 < len(value['custodyPins']) <= 20000,
            'Bounded complete custody declaration')
    pins = {pin['path']: pin for pin in value['custodyPins']}
    require(len(pins) == len(value['custodyPins']), 'Distinct custody pins')
    require(type(value['auxiliarySources']) is list and value['auxiliarySources']
            and type(value['closedRoots']) is list, 'Explicit auxiliary SOURCE and inventories')
    roles = [value[key] for key in ('caller', 'shared', 'adapter', 'canonical', 'branchRef', 'indexB')]
    roles += value['auxiliarySources']
    require(all(pins.get(pin['path']) == pin for pin in roles),
            'Declared external SOURCE/publication/index missing or conflicting in custody')
    require(len({pin['path'] for pin in roles}) == len(roles), 'Distinct external SOURCE roles')


def validate_docker_proof(value):
    """Validate actual parent observations, without opening a socket or claiming freshness."""
    require(type(value) is dict and value.get('socket') == SOCKET
            and value.get('passed') is True and value.get('readOnlyGET') is True
            and value.get('globalInventoryQueried') is False,
            'Local read-only Docker observation required')
    rows = value.get('responses')
    targets = ['/version', '/v1.56/images/' + IMAGE + '/json',
               '/v1.56/containers/ordenfix-pro-recovery-v41-rank12-pg-' + NONCE + '/json',
               '/v1.56/networks/ordenfix-pro-recovery-v41-rank12-net-' + NONCE]
    require(type(rows) is list and len(rows) == 4
            and all(type(row) is dict and row.get('method') == 'GET'
                    and row.get('target') == target and type(row.get('status')) is int
                    and row['status'] == status
                    for row, target, status in zip(rows, targets, (200, 200, 404, 404))),
            'Exact local Docker four GETs and exclusive nonce vacancy')
    require(rows[0].get('apiVersion') == '1.56' and rows[1].get('imageId') == IMAGE
            and rows[1].get('platform') == 'linux/arm64' and rows[1].get('pgVersion') == '16.14',
            'Pinned image, platform, PostgreSQL and Docker API')


def dispatch_once(caller, shared, contract, request_digest, guard):
    """Delegate consumption/capture exactly once; failed guards never cause a retry."""
    guard()
    result = caller.execute_once(contract.request_path, request_digest, contract,
                                 capture=shared.capture_owned_session)
    guard()
    return result


def load_module(name, path, expected_sha):
    # Only fixed ordinary SHA-pinned SOURCE is imported, never a caller CLI.
    path = Path(path)
    require(path.is_absolute() and not path.is_symlink()
            and all(not item.is_symlink() for item in path.parents), 'Ordinary import path')
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(65536), b''):
            digest.update(block)
    require(digest.hexdigest() == expected_sha, 'Fixed imported SOURCE SHA')
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Admission:
    def __init__(self, path, digest):
        self.caller = load_module('case9_immutable_runtime_caller', CALLER, CALLER_SHA)
        self.path, self.digest = Path(path), digest
        self.value, self.control_pin = self.caller.checked_json(self.path, digest)
        validate_bindings(self.value)
        self.pins = self.caller.unique_pins(self.value['custodyPins'])
        self.caller.check_sources(list(self.pins.values()), self.pins)
        require(self.value['caller']['path'] == str(CALLER)
                and self.value['caller']['sha256'] == CALLER_SHA
                and self.value['shared']['path'] == str(SHARED)
                and self.value['shared']['sha256'] == SHARED_SHA
                and self.value['adapter']['path'] == str(Path(__file__).absolute()),
                'Fixed caller/shared/adapter execution SOURCE locators')
        self.contract = self.caller.production_contract()
        self.shared = load_module('case9_immutable_owned_capture', SHARED, SHARED_SHA)
        self.shared.validate_capture_spec(self.contract.parent)
        require(len(self.contract.sources) == 10142 and self.contract.recipe['originalOperationPlan'] == {
                'execCount': 2, 'databaseCount': 2, 'dumpCount': 0, 'restoreCount': 0, 'cloneCount': 0},
                'Unchanged SOURCE10142 and exact FALSE plan')
        require(self.value['limits'] == self.caller.LIMITS
                and self.value['indexB'] == self.contract.control['indexB']
                and self.value['canonical'] == self.contract.publications[str(self.contract.canonical)]
                and self.value['branchRef'] == self.contract.publications[str(self.contract.branch_ref)]
                and all(self.pins.get(path) == pin for path, pin in self.contract.sources.items()),
                'Frozen SOURCE/publications/index bound by complete external custody')
        self.check()

    def check(self):
        caller = self.caller
        value, observed = caller.checked_json(self.path, self.digest)
        require(value == self.value and observed == self.control_pin,
                'External custody control may not be refreshed')
        caller.check_sources(list(self.pins.values()), self.pins)
        caller.check_closed_roots(self.value['closedRoots'])
        self.contract.check()

    def docker(self, path, digest):
        value, pin = self.caller.checked_json(path, digest)
        validate_docker_proof(value)
        require(self.caller.source_pin(path) == pin, 'Parent Docker observation identity drift')
        return pin

    def admit(self):
        self.check()
        result = self.caller.static_admission(self.contract)
        self.check()
        return dict(result, completeExternalCustodyCount=len(self.pins),
                    completeClosedInventories=len(self.value['closedRoots']),
                    externalBinding=self.control_pin, pendingParentFreshDockerGate=True)

    def freeze(self, docker_path, docker_digest):
        self.admit()
        docker_pin = self.docker(docker_path, docker_digest)
        request = self.caller.prospective_request(self.contract)
        self.caller.validate_request(request, self.contract)
        self.contract.prefreeze()
        # CREATE_NEW only, with partial state retained on every failure.
        pairs, directories = {}, []
        for label, base in (('private', self.caller.ROOT), ('durable', self.caller.DURABLE)):
            records = base / 'real-case-9-records'
            path = records / 'root280-request-01.json'
            self.caller.write_new(path, request)
            pairs[label] = self.caller.source_pin(path)
            for name in ('root280-home', 'root280-tmp'):
                directory = records / name
                directory.mkdir(mode=0o700)
                directories.append(str(directory))
        require((pairs['private']['bytes'], pairs['private']['sha256']) == (
                pairs['durable']['bytes'], pairs['durable']['sha256']), 'Byte-identical frozen request pair')
        self.caller.validate_request(request, self.contract)
        self.contract.virgin()
        self.check()
        require(self.caller.source_pin(docker_path) == docker_pin,
                'Same parent Docker observation after freeze')
        return {'schema': 'rank12-case9-frozen-request/v1', 'passed': True,
                'requestPair': pairs, 'rootDirectories': directories,
                'binding': self.control_pin, 'dockerObservation': docker_pin,
                'sourceCount': 10142, 'original9Executed': False,
                'pendingParentFreshDockerGate': True, 'runtimeAuthority': False}

    def execute(self, request_digest, docker_path, docker_digest):
        require(os.environ == self.caller.clean_environment(
                self.contract.records / 'root280-home', self.contract.records / 'root280-tmp')
                and Path.cwd() == self.contract.records, 'Exact ROOT cwd and clean ENV7')
        docker_pin = self.docker(docker_path, docker_digest)
        private = self.contract.request_path
        durable = self.caller.DURABLE / 'real-case-9-records/root280-request-01.json'
        request, request_pin = self.caller.checked_json(private, request_digest)
        durable_request, durable_pin = self.caller.checked_json(durable, request_digest)
        require(request == durable_request
                and (request_pin['bytes'], request_pin['sha256']) == (
                    durable_pin['bytes'], durable_pin['sha256']), 'Exact frozen request pair')
        self.caller.validate_request(request, self.contract)
        self.contract.virgin()
        def guard():
            self.check()
            require(self.caller.source_pin(docker_path) == docker_pin
                    and self.caller.source_pin(private) == request_pin
                    and self.caller.source_pin(durable) == durable_pin,
                    'Frozen request/probe identity changed; never retry')
        return dispatch_once(self.caller, self.shared, self.contract, request_digest, guard)


def parse_arguments(argv):
    require(argv and argv[0] in ('--admit', '--freeze', '--execute-once'), 'Explicit operation required')
    mode, values = argv[0], {}
    require(len(argv[1:]) % 2 == 0, 'Named argument pairs required')
    for key, value in zip(argv[1::2], argv[2::2]):
        require(key not in values, 'Duplicate adapter argument')
        values[key] = value
    expected = {'--bindings', '--bindings-sha'}
    if mode != '--admit':
        expected |= {'--docker-proof', '--docker-proof-sha'}
    if mode == '--execute-once':
        expected.add('--request-sha')
    require(set(values) == expected and all(re.fullmatch('[0-9a-f]{64}', value)
            for key, value in values.items() if key.endswith('-sha')), 'Exact adapter argument schema')
    return mode, values


def main(argv=None):
    mode, args = parse_arguments(sys.argv[1:] if argv is None else argv)
    admission = Admission(args['--bindings'], args['--bindings-sha'])
    if mode == '--admit':
        result = admission.admit()
    elif mode == '--freeze':
        result = admission.freeze(args['--docker-proof'], args['--docker-proof-sha'])
    else:
        receipt = admission.execute(args['--request-sha'], args['--docker-proof'], args['--docker-proof-sha'])
        result = {'passed': receipt['passed'], 'originalResultAccredited': False}
    print(json.dumps(result, sort_keys=True))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
