"""Read-only accreditation of the single saved ninth-row original and cleanup.

No process, Docker client, original test or caller is imported or executed.
Only pinned pure owner JSON validators are imported. One CREATE_NEW result is
permitted in an explicitly supplied existing audit directory; runtime is never
copied, overwritten, reset or retried. Parent independent accreditation remains
separate from this saved-only qualification.
"""
import base64
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import signal
import stat
import sys
import time

PROJECT = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend')
ROOT = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw')
DURABLE = PROJECT / 'release-validation.local/rank12-preparation-vcra7ulw'
RECORDS = ROOT / 'real-case-9-records'
NONCE = 'ca3647e6e83646a686934b2f5110ba70'
OWNER = ROOT / ('rows/row-9/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-' + NONCE)
FIELDS = ('st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_gid', 'st_nlink', 'st_mtime_ns', 'st_ctime_ns')
PIN_KEYS = {'path', 'bytes', 'sha256', 'stat8'}
BINDING_KEYS = {'schema', 'case', 'baseBindings', 'requestPair', 'transportPin', 'postDockerPin', 'preservedPins', 'closedRoots'}
BASE_KEYS = {'schema', 'case', 'rowIndex', 'ordinal', 'csvRow', 'nonce', 'caller', 'shared', 'adapter',
             'canonical', 'branchRef', 'indexB', 'custodyPins', 'closedRoots', 'auxiliarySources', 'limits'}
RECIPE_SHA = '7840d842ead8cfca506cb45ed66660fc2122375bf9fa4fd01c2c0df9f65fc568'
STAGING_SHA = 'f5c059599cef48b391570e72a4c3312256ef451f91e220bb13fb13f04b6af2ba'
CALLER_SHA = 'f253dbe4c597169dde037eb4036fd5409dfeec7ba8ccda529b7b90ed5ee56eba'
OLD_TEST_SHA = '1d323e2d0ea01c2f695e82094ae43a2b42b6331e7d16fee76f6e21c0adec3522'
SHARED_SHA = '0ce15a0f1253b82a098a1fbe642956ad28fc4d48c5395255a6621fd3f9e1159a'
LIMITS = {'rootEnvelopeSeconds': 280, 'runTimeoutSeconds': 240,
          'totalTimeoutSeconds': 270, 'originalCaseSeconds': 120, 'execSeconds': 45,
          'launchSeconds': 60, 'ownerSeconds': 240, 'cleanupSeconds': 30,
          'readChunkBytes': 65536, 'stdoutCapBytes': 8388608, 'stderrCapBytes': 8388608}
RETAINED_REFS = {
    'codex/v41-registry-completion-fix': '65c9cac07a2899c50bf39c94a7509b2a6766673e',
    'codex/v41-rank-runtime-review-chain': '333c8b8a979ec9e03587b63a6df28e31508fbb66',
    'codex/v41-rank-runtime-unsplit': '77b7d908a1e5718777f48983bb23a7832c13afad',
    'codex/v41-rank-registry-review': '38ec32b6f8686ede35faa13f61c4ccaa7534af54'}
START = None
CHECKS = []


def check(message, condition):
    if not condition:
        raise AssertionError(message)
    CHECKS.append(message)
    if START is not None and time.monotonic() - START > 120:
        raise TimeoutError('Saved-only120 deadline')


def ordinary(path):
    path = Path(path)
    check('Absolute nonalias path', path.is_absolute() and '..' not in path.parts
          and all(not item.is_symlink() for item in (path,) + tuple(path.parents)))
    return path


def bounded_raw(path, limit=16777216):
    path = ordinary(path)
    before = path.lstat()
    check('Ordinary bounded single-link read', stat.S_ISREG(before.st_mode)
          and before.st_nlink == 1 and before.st_size <= limit)
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW), 'rb', buffering=0) as source:
        check('Descriptor identity at open', all(getattr(before, key) == getattr(os.fstat(source.fileno()), key)
                                               for key in FIELDS + ('st_size',)))
        raw = bytearray()
        while True:
            block = source.read(min(65536, limit + 1 - len(raw)))
            if not block:
                break
            check('Bounded limit-plus-one read', len(raw) + len(block) <= limit)
            raw.extend(block)
        after = os.fstat(source.fileno())
    check('Stable complete bounded read', len(raw) == before.st_size
          and all(getattr(before, key) == getattr(after, key) == getattr(path.lstat(), key)
                  for key in FIELDS + ('st_size',)))
    return bytes(raw)


def pin(path):
    path = ordinary(path)
    before = path.lstat()
    check('Ordinary streaming fullpin', stat.S_ISREG(before.st_mode) and before.st_nlink == 1)
    digest, size = hashlib.sha256(), 0
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as source:
        opened = os.fstat(source.fileno())
        check('Streaming descriptor identity', all(getattr(before, key) == getattr(opened, key)
                                                  for key in FIELDS + ('st_size',)))
        for block in iter(lambda: source.read(65536), b''):
            digest.update(block)
            size += len(block)
        after = os.fstat(source.fileno())
    check('Stable streaming fullpin', size == before.st_size
          and all(getattr(before, key) == getattr(after, key) == getattr(path.lstat(), key)
                  for key in FIELDS + ('st_size',)))
    return {'path': str(path), 'bytes': size, 'sha256': digest.hexdigest(),
            'stat8': {key: getattr(before, key) for key in FIELDS}}


def strict_json(raw):
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError('Duplicate JSON key: ' + key)
            result[key] = value
        return result
    def reject(value):
        raise ValueError('Nonfinite JSON value: ' + value)
    def floating(value):
        number = float(value)
        if not math.isfinite(number):
            raise ValueError('Nonfinite JSON exponent')
        return number
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=reject, parse_float=floating)


def load(path):
    return strict_json(bounded_raw(path))


def pin_list(values):
    check('Bounded explicit pin list', type(values) is list and len(values) <= 30000)
    result = {}
    for value in values:
        check('Closed fullpin shape', type(value) is dict and set(value) == PIN_KEYS
              and type(value['path']) is str and Path(value['path']).is_absolute()
              and type(value['bytes']) is int and value['bytes'] >= 0
              and type(value['sha256']) is str and re.fullmatch('[0-9a-f]{64}', value['sha256'])
              and type(value['stat8']) is dict and set(value['stat8']) == set(FIELDS)
              and all(type(number) is int for number in value['stat8'].values()))
        check('Unique fullpin path', value['path'] not in result)
        result[value['path']] = value
    return result


def check_custody(pins, roots, historical):
    values = pin_list(pins)
    for path, expected in values.items():
        check('Preserved physical identity: ' + path, pin(path) == expected)
    check('Distinct closed root identities', type(roots) is list
          and len({root['root'] for root in roots}) == len(roots))
    for root in roots:
        check('Closed root schema', type(root) is dict and set(root) == {'root', 'files'}
              and type(root['files']) is list and len(set(root['files'])) == len(root['files']))
        directory = ordinary(root['root'])
        check('Exact closed root inventory', directory.is_dir()
              and all(Path(path).is_relative_to(directory) and path in values for path in root['files'])
              and {str(path) for path in directory.rglob('*') if path.is_file() or path.is_symlink()} == set(root['files']))
    check('Unique historical absence paths', len(set(historical)) == len(historical))
    for path in historical:
        check('Historical absence remains explicit', not os.path.lexists(path))
    return values


def validate_original(report, allow, recipe, sources, classlog):
    keys = ['testsFound', 'testsStarted', 'testsSucceeded', 'testsFailed', 'testsSkipped',
            'testsAborted', 'containersFailed', 'containersAborted']
    check('Original integer counts and exact1/1/1', all(type(report[key]) is int for key in keys)
          and [report[key] for key in keys] == [1, 1, 1, 0, 0, 0, 0, 0])
    check('Normal closed launcher schema', set(report) == set(keys + ['summaryAvailable', 'selectedClass',
        'selectedMethod', 'selectedParameterTypes', 'selectedMethods', 'selectionMarker', 'orderedCsvSource',
        'originalRowIndex', 'originalInvocationOrdinal', 'rankKind', 'selectedExecution', 'cleanupComplete',
        'processWorkersQuiescent', 'watchdogJoined', 'launcherFailure', 'testFailures', 'applicationShutdown', 'runtimeAdmission']))
    check('Original metadata exact immutable allowlist', report['selectedClass'] + '#' + report['selectedMethod']
          + '(' + report['selectedParameterTypes'] + ')' == allow['selector']
          and report['orderedCsvSource'] == allow['csvSource'] and report['selectionMarker'] == allow['selectionMarker']
          and type(report['originalRowIndex']) is int and report['originalRowIndex'] == 8
          and type(report['originalInvocationOrdinal']) is int and report['originalInvocationOrdinal'] == 9
          and report['rankKind'] == 'OLDER_TAIL')
    check('Launcher complete cleanup and workers', all(report[key] is True for key in
          ('summaryAvailable', 'cleanupComplete', 'processWorkersQuiescent', 'watchdogJoined'))
          and report['launcherFailure'] is None and report['testFailures'] == [])
    selected = report['selectedExecution']
    callbacks = [selected[key] for key in ('startedInvocations', 'finishedInvocations', 'succeededInvocations')]
    check('Exactly one identical original callback', selected['complete'] is True and selected['violations'] == []
          and callbacks[0] == callbacks[1] == callbacks[2] and len(callbacks[0]) == 1)
    invocation = callbacks[0][0]
    method = invocation['methodSource']
    check('Direct ninth original method identity', type(invocation['invocationIndex']) is int
          and invocation['invocationIndex'] == 9 and invocation['uniqueId'] == selected['admittedTemplateUniqueId']
          + '/[test-template-invocation:#9]' and invocation['templateUniqueId'] == selected['admittedTemplateUniqueId']
          and invocation['observedDisplayName'] == 'V41 recovery order locale="C", restored="false", drift="OLDER_TAIL"'
          and invocation['sourceEvidence'] == 'DIRECT_METHOD_SOURCE' and method['className'] == report['selectedClass']
          and method['methodName'] == report['selectedMethod']
          and method['methodParameterTypes'].replace(' ', '') == report['selectedParameterTypes'])
    runtime, app = report['runtimeAdmission'], report['applicationShutdown']
    check('PG admission exact jar and MR11 resource', runtime['runtimeAdmissionComplete'] is True
          and runtime['javaFeature'] == 21 and runtime['pgJarSha256'] == 'cab1cd67cfa25c25de4348e532298028288a877ba01c77d1619fe45416193387'
          and runtime['pgActualResourceSha256'] == '6b281c645d004a6f3875310b681bce2a689daa84952d14df4decff12f1127f26'
          and runtime['pgSingletonStableIdentity'] is True and runtime['pgSingletonClass'] == 'org.postgresql.util.LazyCleanerImpl'
          and runtime['pgCodeSource'] == '/Users/leonardorozza/.m2/repository/org/postgresql/postgresql/42.7.10/postgresql-42.7.10.jar'
          and runtime['pgActualResource'] == 'jar:file:' + runtime['pgCodeSource'] + '!/META-INF/versions/11/org/postgresql/util/LazyCleanerImpl.class'
          and sources[runtime['pgCodeSource']]['sha256'] == runtime['pgJarSha256'])
    check('Original120 zero-agent before discovery', runtime['runtimeInputArguments'] == recipe['javaOptions']
          and len(runtime['runtimeInputArguments']) == 5 and runtime['zeroAgentPolicyAdmitted'] is True
          and runtime['initializedBeforeSelectedDiscovery'] is True and runtime['selectedMetadataAdmittedWithoutInitialization'] is True
          and type(runtime['selectedOriginalTimeoutSeconds']) is int and runtime['selectedOriginalTimeoutSeconds'] == 120
          and runtime['selectedCsvSource'] == allow['csvSource'] and runtime['admissionMockitoWarmupPerformed'] is False
          and all(runtime[key] == report[key] for key in ('selectedClass', 'selectedMethod', 'selectedParameterTypes', 'selectionMarker')))
    check('No Boot expected and application workers joined', app['contextCaptured'] is False and app['bootContextExpected'] is False
          and app['applicationShutdownComplete'] is True and app['observedNewWorkersJoined'] is True and app['newLiveWorkers'] == []
          and app['applicationCleanupFinishedNanos'] <= app['applicationCleanupDeadlineNanos']
          and app['applicationBaselineCapturedNanos'] > runtime['runtimeAdmissionFinishedNanos'])
    check('Exhaustive application thread baselines and join ordering', len(app['applicationBaselineThreadIds'])
          == len(set(app['applicationBaselineThreadIds'])) == len(app['applicationBaselineThreadIdentityHashes'])
          and set(runtime['postInitializationThreadIds']) <= set(app['applicationBaselineThreadIds'])
          and app['observedNewWorkers'] == len(app['observedNewWorkerThreadIds'])
          and not set(app['observedNewWorkerThreadIds']) & set(app['applicationBaselineThreadIds'])
          and app['applicationCleanupStartedNanos'] <= app['applicationExhaustiveJoinsStartedNanos'] <= app['applicationCleanupFinishedNanos'])
    check('PG initialized before original class', classlog.index("Initializing 'org/postgresql/util/LazyCleanerImpl'")
          < classlog.index("Initializing '" + report['selectedClass'].replace('.', '/') + "'"))
    return invocation


def validate_registry(registry, allow):
    check('Exact original two-create registry', registry['complete'] is True and registry['failed'] is False
          and registry['completedSteps'] == 2 and registry['nextOrdinal'] is None and registry['dumps'] == []
          and len(registry['attempts']) == len(registry['databases']) == 2
          and registry['originalRowIndex'] == 8 and registry['originalInvocationOrdinal'] == 9
          and registry['rankKind'] == 'OLDER_TAIL' and registry['nonce'] == NONCE)
    check('Closed original registry metadata', all(registry[key] == allow[key] for key in ('scope', 'selector', 'methodName',
        'parameterTypes', 'selectionMarker', 'csvSource', 'sourcePin', 'maintenanceExec', 'originalRowIndex', 'originalInvocationOrdinal', 'rankKind')))
    roles, names = ['setup', 'migrated'], []
    for ordinal, role in enumerate(roles, 1):
        matches = [database for database in registry['databases'] if database['role'] == role]
        check('One phase-owned database ' + role, len(matches) == 1)
        database = matches[0]
        check('Exact C locale ninth database ' + role, re.fullmatch('profile_[0-9a-f]{32}', database['database'])
              and database['complete'] is True and database['restored'] is False
              and database['collate'] == database['ctype'] == 'C' and database['caseOrdinal'] == 9
              and database['rankKind'] == 'OLDER_TAIL' and database['createdAtOrdinal'] == ordinal)
        names.append(database['database'])
    check('Two fresh distinct database UUIDs', len(set(names)) == 2)
    phases = ['setup-create', 'migrated-create']
    check('Exact FALSE allowlisted tokens7,7', allow['steps'] == ['case-9-' + phase for phase in phases]
          and allow['tokens'] == [7, 7] and allow['vectors'] == [])
    for index, attempt in enumerate(registry['attempts']):
        argv = ['createdb', '--host=/var/run/postgresql', '--username=fixture', '--template=template0',
                '--lc-collate=C', '--lc-ctype=C', names[index]]
        check('Exact original database operation ' + str(index), attempt['ordinal'] == index + 1
              and attempt['completed'] is True and type(attempt['exitCode']) is int and attempt['exitCode'] == 0
              and attempt['framingEOF'] is True and attempt['step'] == 'case-9-' + phases[index]
              and attempt['phase'] == phases[index] and attempt['argv'] == argv and len(attempt['argv']) == 7
              and attempt['caseOrdinal'] == 9 and attempt['rankKind'] == 'OLDER_TAIL')
    return names


def validate_resources(actual, request, network_id):
    expected = strict_json(json.dumps(request['containerTemplate'], allow_nan=False))
    expected['HostConfig']['NetworkMode'] = network_id
    host = actual['HostConfig']
    check('Exact owned create request including resources', actual == expected
          and all(type(host[key]) is int for key in ('Memory', 'MemorySwap', 'NanoCpus', 'PidsLimit', 'ShmSize'))
          and host['Memory'] == host['MemorySwap'] == 1073741824 and host['NanoCpus'] == 1000000000
          and host['PidsLimit'] == 128 and host['ReadonlyRootfs'] is True and host['Privileged'] is False
          and host['Binds'] == [] and host['SecurityOpt'] == ['no-new-privileges']
          and host['PortBindings'] == {'5432/tcp': [{'HostIp': '127.0.0.1', 'HostPort': ''}]})


def validate_cleanup(owner, events, nonce):
    summary = owner['cleanup']
    check('Exact owner cleanup summary', type(summary) is dict and set(summary) == {'complete', 'handle', 'requestKey', 'unknownResources'}
          and type(summary['handle']) is dict and set(summary['handle']) == {'containerId', 'networkId'}
          and summary['complete'] is True and summary['unknownResources'] is False and summary['requestKey'] == nonce)
    cid, nid = summary['handle']['containerId'], summary['handle']['networkId']
    check('Genuine owned cleanup IDs', re.fullmatch('[0-9a-f]{64}', cid) and re.fullmatch('[0-9a-f]{64}', nid))
    check('Owner stopped and joined', owner['passed'] is True and owner['failure'] is None
          and owner['inputWorkerJoined'] is True and owner['finishedMonotonic'] <= owner['strictCleanupDeadline']
          and owner['physicalJUnitAccredited'] is False)
    full = None
    for kind in ('cleanup', 'owner-cleanup'):
        matches = [event for event in events if event['kind'] == kind]
        check('Single cleanup event ' + kind, len(matches) == 1)
        event = matches[0]
        check('Complete bounded cleanup ' + kind, event['passed'] is True and event['errors'] == event['unknownIds'] == []
              and event['ambiguousCreates'] == {'container': False, 'network': False}
              and event['containerId'] == cid and event['networkId'] == nid and event['containerStopped'] is True
              and event['containerRemovalAcknowledged'] == 204 and event['networkAbsentStatus'] == 404
              and event['workersJoined'] is True and type(event['activeSockets']) is int and event['activeSockets'] == 0
              and abs(event['strictCleanupDeadline'] - event['firstStop'] - 30) < 1e-6
              and event['finishedMonotonic'] <= event['strictCleanupDeadline'])
        if kind == 'owner-cleanup':
            full = event
    check('No unknown owner exec or cancellation', full['execCreateUnknown'] is False and full['unaccreditedExecIds'] == full['cancelErrors'] == []
          and full['unknownResources'] is False and full['recoveryRegistry'] == owner['recoveryRegistry'])
    lifecycle = owner['lifecycle']
    check('Owner240 and earliest-stop30 actual joins', owner['finishedMonotonic'] - owner['startedMonotonic'] <= 240
          and not lifecycle['unknownResources'] and full['firstStop'] == lifecycle['firstStopMonotonic']
          and owner['strictCleanupDeadline'] == full['strictCleanupDeadline'] == lifecycle['cleanupDeadlineMonotonic'] == full['firstStop'] + 30)
    return full


def causal_pairs(http, cid, nid, api):
    result = []
    for index, event in enumerate(http):
        if event['path'] != api + '/containers/' + cid + '/json':
            continue
        check('Causal container GET', event['method'] == 'GET' and event['status'] == 200)
        check('Container observation has next network observation', index + 1 < len(http))
        network = http[index + 1]
        check('Exact adjacent same-owner network GET', network['method'] == 'GET'
              and network['path'] == api + '/networks/' + nid and network['status'] == 200)
        result.append((event, network))
    check('At least one causal container/network pair', bool(result))
    return result


def pure_guard(sources):
    modules = []
    for name, digest in (('http_framing', '7fe21c39dca73139d7fcbdb06266d737b6be3421a34eda13487565c246d86d30'),
                         ('fixture_guard', '8d7bb1d577329b5d19936a791105c61ecbeeb8ade990909c74dc2aaf7d96494c')):
        path = OWNER / (name + '.py')
        check('Pinned pure owner validator SOURCE', sources.get(str(path)) == pin(path)
              and sources[str(path)]['sha256'] == digest)
        spec = importlib.util.spec_from_file_location('case9_saved_' + name, path)
        module = importlib.util.module_from_spec(spec)
        old = sys.modules.get('http_framing')
        if modules:
            sys.modules['http_framing'] = modules[0]
        try:
            spec.loader.exec_module(module)
        finally:
            if old is None:
                sys.modules.pop('http_framing', None)
            else:
                sys.modules['http_framing'] = old
        check('Pure validator unchanged after import', pin(path) == sources[str(path)])
        modules.append(module)
    return modules[1]


def validate_http(owner, events, request, allow, sources):
    by = lambda kind: [event for event in events if event['kind'] == kind]
    check('Closed owner ledger event kinds', 0 < len(events) <= 512 and {event['kind'] for event in events} == {
        'bootstrap-requested', 'http', 'network-create-requested', 'network-created', 'container-create-requested',
        'container-created', 'container-start-requested', 'ready', 'exec-create-requested', 'exec-created',
        'exec-stream', 'exec-result', 'cleanup', 'owner-cleanup'})
    cid, nid = (owner['cleanup']['handle'][key] for key in ('containerId', 'networkId'))
    api, registry = request['apiVersion'], owner['recoveryRegistry']
    check('Exact local request nonce socket image API', request['root'] == str(OWNER) and request['nonce'] == NONCE
          and request['socket'] == '/Users/leonardorozza/.docker/run/docker.sock' and request['socketUid'] == 501
          and api == '/v1.56' and request['imageId'] == 'sha256:57c72fd2a128e416c7fcc499958864df5301e940bca0a56f58fddf30ffc07777')
    for kind in ('bootstrap-requested', 'network-create-requested', 'network-created', 'container-create-requested',
                 'container-created', 'container-start-requested', 'ready'):
        check('Exactly one owner event ' + kind, len(by(kind)) == 1)
    network_request, network_done, create, created, start = (by(kind)[0] for kind in (
        'network-create-requested', 'network-created', 'container-create-requested', 'container-created', 'container-start-requested'))
    check('Create/start owned IDs and causal times', set(start) == {'id', 'kind', 'monotonic'} and start['id'] == cid
          and network_request['nonce'] == network_done['nonce'] == create['nonce'] == created['nonce'] == NONCE
          and network_done['id'] == nid and created['id'] == cid
          and network_request['monotonic'] <= network_done['monotonic'] <= create['monotonic'] <= created['monotonic'] <= start['monotonic'])
    check('Exact owned network create request', network_request['request'] == request['networkCreate'])
    validate_resources(create['request'], request, nid)
    http = by('http')
    images = [event for event in http if event['path'] == api + '/images/' + request['imageId'] + '/json']
    check('Exactly one successful pinned image observation', len(images) == 1 and images[0]['status'] == 200)
    image = images[0]['response']
    check('Pinned linux arm64 PG16.14', image['Id'] == request['imageId'] and image['Os'] == 'linux'
          and image['Architecture'] == 'arm64' and [item for item in image['Config']['Env'] if item.startswith('PG_VERSION=')] == ['PG_VERSION=16.14'])
    guard = pure_guard(sources)
    binding = dict(request, containerId=cid, networkId=nid, imageEnvironment=image['Config']['Env'])
    networks = [event['response'] for event in http if event['path'] == api + '/networks/' + nid and event['status'] == 200]
    check('Saved network lifecycle includes empty final membership', bool(networks) and networks[-1]['Containers'] == {})
    for network in networks:
        check('Owned network response security and membership', network['Id'] == nid and network['Name'] == request['networkName']
              and network['Labels'] == request['labels'] and network['Internal'] is False and network['EnableIPv6'] is False
              and network['Driver'] == 'bridge' and set(network['Containers']) <= {cid} and guard.network_options_allowed(network))
    pairs = causal_pairs(http, cid, nid, api)
    for container_event, network_event in pairs:
        guard.validate(container_event['response'], network_event['response'], binding,
                       require_running=None, require_healthy=False, require_published=False)
    ready = by('ready')[0]
    check('Ready observation within unchanged launch60', ready['monotonic'] <= ready['launchDeadline']
          and ready['launchDeadline'] == owner['lifecycle']['launchDeadlineMonotonic'])
    guard.validate(ready['observation']['container'], ready['observation']['network'], binding)
    for event in http:
        headers = base64.b64decode(event['rawHeadersBase64'], validate=True)
        check('HTTP saved metadata and bounded framing', event['socketCloseError'] is None and 'failure' not in event
              and event['monotonic'] <= event['deadline'] and type(event['response']) is dict
              and len(headers) <= 65536 and headers.startswith(('HTTP/1.1 ' + str(event['status'])).encode())
              and event['responseBytes'] <= 1048576 and re.fullmatch('[0-9a-f]{64}', event['responseSha256']))
    groups = [by(kind) for kind in ('exec-create-requested', 'exec-created', 'exec-stream', 'exec-result')]
    check('Exactly two exec lifecycles', all(len(group) == 2 for group in groups))
    for index, (reserved, created, stream, result) in enumerate(zip(*groups)):
        attempt, observation, eid = registry['attempts'][index], result['observation'], created['id']
        check('Exact source reservation and registry prefix', reserved['registryReservation'] == dict(attempt, completed=False, exitCode=None, framingEOF=False)
              and len(reserved['recoveryRegistry']['attempts']) == index + 1
              and result['recoveryRegistry']['completedSteps'] == index + 1
              and result['recoveryRegistry']['attempts'] == registry['attempts'][:index + 1]
              and (index == 0 or result['recoveryRegistry'] == registry))
        check('Stopped genuine exec identity and exact argv', reserved['argv'] == created['argv'] == result['argv'] == attempt['argv']
              and eid == result['id'] == observation['ID'] and re.fullmatch('[0-9a-f]{64}', eid)
              and observation['ContainerID'] == cid and observation['Running'] is False
              and type(observation['ExitCode']) is int and observation['ExitCode'] == result['exitCode'] == 0
              and observation['OpenStdin'] is False and observation['OpenStdout'] is True and observation['OpenStderr'] is True
              and observation['ProcessConfig']['tty'] is False and observation['ProcessConfig']['entrypoint'] == attempt['argv'][0]
              and observation['ProcessConfig']['arguments'] == attempt['argv'][1:])
        check('Exec45 causal ordering complete stream', reserved['monotonic'] <= created['monotonic'] <= stream['monotonic']
              <= result['monotonic'] <= reserved['deadline'] and reserved['deadline'] - reserved['monotonic'] <= 45.000001
              and stream['deadline'] == reserved['deadline'] and stream['socketCloseError'] is None and 'failure' not in stream
              and stream['frames'] <= 512 and stream['path'] == api + '/exec/' + eid + '/start'
              and stream['requestBody'] == {'Detach': False, 'Tty': False})
        headers = base64.b64decode(stream['rawHeadersBase64'], validate=True).decode('ascii').lower()
        check('Supported exact exec stream framing', 'transfer-encoding:' not in headers and (
            stream['status'] == 101 and headers.startswith('http/1.1 101 ') and '\r\nconnection: upgrade\r\n' in headers
            and '\r\nupgrade: tcp\r\n' in headers and 'content-length:' not in headers
            or stream['status'] == 200 and headers.startswith('http/1.1 200 ')
            and '\r\ncontent-type: application/vnd.docker.raw-stream' in headers and '\r\nupgrade:' not in headers))
        for channel in ('stdout', 'stderr'):
            raw = base64.b64decode(result[channel + 'Base64'], validate=True)
            check('Exec channel bytes and hash', len(raw) == stream[channel + 'Bytes'] <= 65536
                  and hashlib.sha256(raw).hexdigest() == stream[channel + 'Sha256'])
    check('Exactly two distinct exec IDs', len({event['id'] for event in groups[1]}) == 2)
    check('Actual acknowledged owned deletion and absence', any(event['method'] == 'DELETE'
          and event['path'] == api + '/containers/' + cid + '?v=0&force=0' and event['status'] == 204 for event in http)
          and any(event['method'] == 'DELETE' and event['path'] == api + '/networks/' + nid and event['status'] == 204 for event in http)
          and any(event['method'] == 'GET' and event['path'] == api + '/networks/' + nid and event['status'] == 404 for event in http))
    bootstrap = by('bootstrap-requested')[0]
    check('Physical owner lifecycle launch60 owner240 cleanup30', abs(bootstrap['launchDeadline'] - bootstrap['monotonic'] - 60) < .001
          and abs(bootstrap['ownerDeadline'] - bootstrap['launchDeadline'] - 180) < 1e-6
          and owner['finishedMonotonic'] <= bootstrap['ownerDeadline'] + 30)
    return {'containerId': cid, 'networkId': nid, 'execIds': [event['id'] for event in groups[1]]}


def validate_transport(transport, post_docker):
    check('Actual successful tool transport', type(transport) is dict and type(transport.get('exit_code')) is int
          and transport['exit_code'] == 0
          and type(transport.get('output')) is str)
    check('Tool stdout remains capture-only', strict_json(transport['output']) == {'passed': True, 'originalResultAccredited': False})
    check('Parent independent resource absence', post_docker['passed'] is True and len(post_docker['responses']) == 2
          and [item['status'] for item in post_docker['responses']] == [404, 404])


def validate_capture(root, outer, parent, request, request_pin, recipe, streams):
    check('Capture receipt never self-accredits original', root['passed'] is True and root['capture'] == outer
          and root['request'] == request_pin and root['failures'] == [] and all(root[key] is False
          for key in ('originalResultAccredited', 'ownerCleanupAccredited', 'runtimeAuthority', 'productionAuthority')))
    for tag, value, seconds, argv, cwd, environment in (
            ('root', outer, 280, recipe['parentArgv'], recipe['parentCwd'], recipe['parentEnvironment']),
            ('parent', parent, 270, recipe['launcherArgv'], recipe['launcherCwd'], recipe['launcherEnvironment'])):
        check(tag + ' exact argv/cwd/ENV7', value['argv'] == argv and value['cwd'] == cwd
              and value['environment'] == environment and len(environment) == 7)
        check(tag + ' exit drain reap deadline', value['passed'] is True and type(value['exit']) is int and value['exit'] == 0
              and value['targetReaped'] is True and value['failures'] == value['signals'] == []
              and value['readWorkersJoined'] is True and value['readWorkersCreated'] == 0
              and value['finishedMonotonic'] <= value['absoluteDeadlineMonotonic']
              and abs(value['absoluteDeadlineMonotonic'] - value['startedMonotonic'] - seconds) < 1e-6
              and 0 <= value['wallSeconds'] <= seconds)
        for name in ('stdout', 'stderr'):
            raw, metadata = streams[tag][name], value[name]
            check(tag + ' ' + name + ' complete bounded EOF/hash', metadata['eof'] is True and metadata['closed'] is True
                  and metadata['overflow'] is False and metadata['bytesObserved'] == metadata['bytesSaved'] == len(raw) <= 8388608
                  and metadata['sha256'] == hashlib.sha256(raw).hexdigest())
    check('Root owned session is reaped and gone', outer['processGroupGone'] is True and outer['ownedProcessGroup'] == outer['targetPid'])
    check('Frozen parent capture request matches root', request['capture'] == {'schema': 1, 'argv': recipe['parentArgv'],
          'cwd': recipe['parentCwd'], 'environment': recipe['parentEnvironment'], 'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280})


def derive_sources(request, recipe, staging, protected, base):
    sources = pin_list(request['sourcePins'])
    check('Exact ninth ROOT request schema', set(request) == {'schema', 'case', 'originalRowIndex', 'originalInvocationOrdinal',
        'csvRow', 'reviewedHead', 'capture', 'sourcePins'} and request['schema'] == 'rank12-root280-case9/v1'
        and request['case'] == 'case-9' and request['originalRowIndex'] == 8 and request['originalInvocationOrdinal'] == 9
        and request['csvRow'] == 'C,false,OLDER_TAIL')
    expected = pin_list(recipe['fixedPins'])
    check('Inherited SOURCE10128 metadata', len(expected) == recipe['completePriorSourceCount'] == 10128
          and recipe['extraSourcePins'] == [] and recipe['extraSourcePinCount'] == 0)
    for value in (base['canonical'], base['branchRef']):
        check('Only explicit same-path publication identity replacement', value['path'] in expected)
        expected[value['path']] = value
    additions = [value for pair in staging['newPairs'] for value in pair.values()]
    additions += [protected[str(base_root / 'real-case-9-records/staging-validation-01.json')]
                  for base_root in (ROOT, DURABLE)]
    additions += [protected[str(PROJECT / 'scripts' / name)] for name in (
        'recovery_v41_rank_case9_outer_capture.py', 'test_recovery_v41_rank_case9_outer_capture.py')]
    for value in additions:
        check('Exact operational SOURCE anchor without conflicts', expected.get(value['path'], value) == value)
        expected[value['path']] = value
    check('Exact complete already-projected SOURCE10142', len(expected) == 10142 and sources == expected)
    check('Immutable caller9 and frozen19 SOURCE', sources[str(PROJECT / 'scripts/recovery_v41_rank_case9_outer_capture.py')]['sha256'] == CALLER_SHA
          and sources[str(PROJECT / 'scripts/test_recovery_v41_rank_case9_outer_capture.py')]['sha256'] == OLD_TEST_SHA)
    prior = recipe['priorConsumedDataProtection']
    check('Inherited DATA3637/129 never substituted for SOURCE', prior == recipe['previousDataProtection']
          and len(pin_list(prior['pins'])) == 3637 and len(set(prior['roots'])) == len(prior['roots']) == 129
          and prior['role'] == 'PRIOR_CONSUMED_DATA_AND_EVIDENCE_NOT_SOURCE'
          and prior['sourceSubstitutionAllowed'] is False and not set(sources) & set(pin_list(prior['pins'])))
    check_custody(list(sources.values()) + [value for value in prior['pins'] if value['path'] not in sources], [], recipe['historicalAbsentPaths'])
    check('Exactly thirteen explicit physical gaps', len(set(recipe['historicalAbsentPaths'])) == len(recipe['historicalAbsentPaths']) == 13)
    return sources


def validate_bindings(bindings):
    check('Exact saved-only post-bindings schema', type(bindings) is dict and set(bindings) == BINDING_KEYS
          and bindings['schema'] == 'rank12-case9-saved-parent-bindings/v1' and bindings['case'] == 'case-9')
    check('Exact private/durable execution request pair', type(bindings['requestPair']) is dict
          and set(bindings['requestPair']) == {'private', 'durable'}
          and bindings['requestPair']['private']['path'] == str(RECORDS / 'root280-request-01.json')
          and bindings['requestPair']['durable']['path'] == str(DURABLE / 'real-case-9-records/root280-request-01.json'))
    external = pin_list(bindings['preservedPins'])
    check('Complete then-current custody baseline, not a reduced snapshot', len(external) >= 14316)
    base_pin = bindings['baseBindings']
    check('Externally pinned complete admitted base', pin(base_pin['path']) == base_pin)
    base = load(base_pin['path'])
    check('Exact sixteen-key case9 base admission', set(base) == BASE_KEYS
          and base['schema'] == 'rank12-case9-parent-bindings/v1' and base['case'] == 'case-9'
          and type(base['rowIndex']) is int and base['rowIndex'] == 8 and type(base['ordinal']) is int and base['ordinal'] == 9
          and base['csvRow'] == 'C,false,OLDER_TAIL' and base['nonce'] == NONCE)
    check('Frozen admitted limits', type(base['limits']) is dict and base['limits'] == LIMITS
          and all(type(value) is int for value in base['limits'].values()))
    original = pin_list(base['custodyPins'])
    check('Postbindings preserve every admitted custody identity', len(original) >= 14316
          and all(external.get(path) == value for path, value in original.items()))
    auxiliary = pin_list(base['auxiliarySources'])
    check('Reader and new test auxiliary SOURCE preserved separately', all(external.get(path) == value for path, value in auxiliary.items())
          and str(PROJECT / 'scripts/recovery_v41_rank_case9_saved_reader.py') in auxiliary
          and str(PROJECT / 'scripts/test_recovery_v41_rank_case9_saved_reader.py') in auxiliary)
    check('Exact publication and index locations', base['canonical']['path'] == str(PROJECT / 'odd/tasks/pro-paid-period-cancellation.md')
          and base['branchRef']['path'] == str(PROJECT / '.git/refs/heads/codex/v41-rank-launcher-integrated')
          and base['indexB']['path'] == str(PROJECT / '.git/index'))
    check('Real indexB identity remains unchanged', base['indexB']['bytes'] == 78648
          and base['indexB']['sha256'] == '119d92db43419fe93877e16116d35e0e9bb3a30bd7b78d386edb5d89636692ab')
    for name, commit in RETAINED_REFS.items():
        path = PROJECT / '.git/refs/heads' / name
        check('Retained ref is bound in original and post custody', str(path) in original
              and external.get(str(path)) == original[str(path)] and bounded_raw(path) == (commit + '\n').encode())
    for value in [base_pin, base['caller'], base['shared'], base['adapter'], base['canonical'], base['branchRef'], base['indexB'],
                  bindings['transportPin'], bindings['postDockerPin']] + list(bindings['requestPair'].values()):
        check('Explicit postbinding identity conflicts rejected', external.get(value['path'], value) == value)
        external[value['path']] = value
    check('Approved caller and shared capture SHA', base['caller']['sha256'] == CALLER_SHA and base['shared']['sha256'] == SHARED_SHA)
    check('Postbindings retain complete admitted closed roots', all(root in bindings['closedRoots'] for root in base['closedRoots'])
          and len(bindings['closedRoots']) >= 25)
    check('Request pair content equal', bindings['requestPair']['private']['bytes'] == bindings['requestPair']['durable']['bytes']
          and bindings['requestPair']['private']['sha256'] == bindings['requestPair']['durable']['sha256'])
    return base, external


def runtime_files():
    root_output, parent_output, launcher, observed = RECORDS / 'root280-output-01', RECORDS / 'parent-runtime-output', RECORDS / 'launcher', OWNER / 'observed'
    check('Closed ROOT four files', {path.name for path in root_output.iterdir()} == {
        'parent-execution.json', 'rank-capture-receipt.json', 'target.stdout.bin', 'target.stderr.bin'})
    check('Closed parent three files', {path.name for path in parent_output.iterdir()} == {'parent-execution.json', 'target.stdout.bin', 'target.stderr.bin'})
    check('Closed launcher three files and two dirs', {path.name for path in launcher.iterdir()} == {
        'class-init.log', 'launcher-report-01.json', 'launcher-report-01.json.owner-stderr', 'home', 'tmp'})
    owner_files = sorted(observed.iterdir())
    ledger = sorted(observed.glob('[0-9]*.json'))
    check('Closed numbered owner ledger and two receipts', {path.name for path in owner_files}
          == {path.name for path in ledger} | {'once.json', 'owner-receipt.json'})
    paths = sorted(root_output.iterdir()) + sorted(parent_output.iterdir()) + [launcher / name for name in (
        'class-init.log', 'launcher-report-01.json', 'launcher-report-01.json.owner-stderr')] + owner_files
    paths += [RECORDS / 'root280-once-01.json', RECORDS / 'parent-runtime-once.json']
    check('Derived complete unique runtime inventory', len(paths) == len(set(paths)) == 12 + len(owner_files))
    events = []
    for number, path in enumerate(ledger, 1):
        event = load(path)
        check('Contiguous monotonic owner ledger', path.name == f'{number:03d}-' + event['kind'] + '.json'
              and (not events or event['monotonic'] >= events[-1]['monotonic']))
        events.append(event)
    return paths, events, len(owner_files)


def write_result(audit_root, value):
    directory = ordinary(audit_root)
    check('Explicit existing ordinary0700 audit directory', directory.is_dir() and stat.S_IMODE(directory.lstat().st_mode) == 0o700)
    raw = (json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + '\n').encode()
    check('Bounded generated qualification JSON', len(raw) <= 16777216)
    destination = directory / 'saved-qualification-01.json'
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'wb') as output:
        output.write(raw)
    check('CREATE_NEW0600 qualification readback', bounded_raw(destination) == raw
          and stat.S_IMODE(destination.lstat().st_mode) == 0o600)
    return pin(destination)


def future_virgin(sources):
    prep_path = ROOT / 'preparation-manifest-01.json'
    check('Pinned original twelve-row preparation', pin(prep_path) == sources[str(prep_path)])
    preparation = load(prep_path)
    check('Twelve-row original preparation count', len(preparation['rows']) == 12)
    for row in preparation['rows'][9:]:
        for base in (ROOT, DURABLE):
            owner = base / Path(row['ownerRoot']).relative_to(ROOT)
            absent = [owner / name for name in ('once.json', 'owner-once.json', 'runtime-once.json',
                'owner-runtime-output', 'request.json', 'runtime-pins.json', 'real-' + row['case'] + '-enabled-spec-01.json')]
            absent.append(base / ('real-' + row['case'] + '-records'))
            check('Future row remains absent', all(not os.path.lexists(path) for path in absent))
            for name in ('home', 'tmp', 'observed', 'runtime'):
                directory = ordinary(owner / name)
                check('Future row directory virgin', directory.is_dir() and stat.S_IMODE(directory.lstat().st_mode) == 0o700
                      and not any(directory.iterdir()))


def main(argv=None):
    global START
    argv = sys.argv[1:] if argv is None else argv
    check('Exact saved-reader CLI', len(argv) == 6 and argv[0] == '--bindings' and argv[2] == '--bindings-sha'
          and re.fullmatch('[0-9a-f]{64}', argv[3]) and argv[4] == '--audit-root')
    START = time.monotonic()
    def deadline(*_):
        raise TimeoutError('Saved-only120 deadline')
    prior_handler = signal.signal(signal.SIGALRM, deadline)
    signal.alarm(120)
    try:
        binding_pin = pin(argv[1])
        check('Externally SHA-pinned postbindings', binding_pin['sha256'] == argv[3])
        bindings = load(argv[1])
        base, protected = validate_bindings(bindings)
        check('Recipe and staging preserved before parse', pin(RECORDS / 'execution-recipe-01.json') == protected[str(RECORDS / 'execution-recipe-01.json')]
              and pin(RECORDS / 'staging-validation-01.json') == protected[str(RECORDS / 'staging-validation-01.json')])
        recipe, staging = load(RECORDS / 'execution-recipe-01.json'), load(RECORDS / 'staging-validation-01.json')
        check('Immutable recipe/staging SHA', protected[str(RECORDS / 'execution-recipe-01.json')]['sha256'] == RECIPE_SHA
              and protected[str(RECORDS / 'staging-validation-01.json')]['sha256'] == STAGING_SHA)
        request_pin = bindings['requestPair']['private']
        request = load(request_pin['path'])
        sources = derive_sources(request, recipe, staging, protected, base)
        check('Frozen prospective reviewed boundary', Path(base['branchRef']['path']).read_text() == request['reviewedHead'] + '\n'
              and (PROJECT / '.git/HEAD').read_text() == 'ref: refs/heads/codex/v41-rank-launcher-integrated\n')
        check('Exact original FALSE plan', recipe['originalOperationPlan'] == {'execCount': 2, 'databaseCount': 2, 'dumpCount': 0, 'restoreCount': 0, 'cloneCount': 0})
        check('Recipe and admitted runtime limits agree exactly', all(type(recipe[key]) is int
              and recipe[key] == value for key, value in LIMITS.items()))
        def custody(stage):
            check(stage + ' postbinding physical identity', pin(binding_pin['path']) == binding_pin)
            check_custody(list(protected.values()), bindings['closedRoots'], recipe['historicalAbsentPaths'])
            future_virgin(sources)
        custody('BEFORE')
        paths, events, owner_count = runtime_files()
        runtime_pins = [pin(path) for path in paths]
        root = load(RECORDS / 'root280-output-01/rank-capture-receipt.json')
        outer = load(RECORDS / 'root280-output-01/parent-execution.json')
        parent = load(RECORDS / 'parent-runtime-output/parent-execution.json')
        consumed = load(RECORDS / 'root280-once-01.json')
        check('Consumed exact request and no retry', consumed['request'] == request_pin and consumed['consumed'] is True and consumed['noAutomaticRetry'] is True)
        check('Consumed parent exact original input/wrapper', load(RECORDS / 'parent-runtime-once.json') == {
            'inputSha256': sources[str(RECORDS / 'parent-input-01.json')]['sha256'],
            'wrapperSha256': '50755ad38ca03631875842d2ed078c7809979015b030caefe3820d20b8a73aec'})
        streams = {tag: {name: bounded_raw(folder / ('target.' + name + '.bin'), 8388608)
                   for name in ('stdout', 'stderr')} for tag, folder in (
                       ('root', RECORDS / 'root280-output-01'), ('parent', RECORDS / 'parent-runtime-output'))}
        validate_capture(root, outer, parent, request, request_pin, recipe, streams)
        allow = load(OWNER / 'exec-allowlist.json')
        report = load(RECORDS / 'launcher/launcher-report-01.json')
        check('No launcher watchdog remains', not os.path.lexists(RECORDS / 'launcher/launcher-report-01.json.watchdog'))
        invocation = validate_original(report, allow, recipe, sources, bounded_raw(RECORDS / 'launcher/class-init.log').decode())
        owner = load(OWNER / 'observed/owner-receipt.json')
        names = validate_registry(owner['recoveryRegistry'], allow)
        cleanup = validate_cleanup(owner, events, NONCE)
        ids = validate_http(owner, events, load(OWNER / 'request.json'), allow, sources)
        check('Owner once marker exact nonce/entry', load(OWNER / 'observed/once.json') == {
            'nonce': NONCE, 'marker': '--execute-parent-approved-recovery-v41-rank12-owned-stdio'})
        post_docker = load(bindings['postDockerPin']['path'])
        validate_transport(load(bindings['transportPin']['path']), post_docker)
        targets = ['/v1.56/containers/ordenfix-pro-recovery-v41-rank12-pg-' + NONCE + '/json',
                   '/v1.56/networks/ordenfix-pro-recovery-v41-rank12-net-' + NONCE]
        check('Parent post-Docker proof is exclusive local read-only absence',
              post_docker['socket'] == '/Users/leonardorozza/.docker/run/docker.sock'
              and post_docker['readOnlyGET'] is True and post_docker['globalInventoryQueried'] is False
              and all(item['method'] == 'GET' and item['target'] == target
                      for item, target in zip(post_docker['responses'], targets)))
        custody('AFTER_ALL_READS')
        for expected in runtime_pins:
            check('Runtime original unchanged after reading', pin(expected['path']) == expected)
        result = {'schema': 'rank12-case9-saved-evidence-proof/v1', 'role': 'DATA', 'qualified': True,
            'case': 'case-9', 'originalRowIndex': 8, 'originalInvocationOrdinal': 9, 'csvRow': 'C,false,OLDER_TAIL',
            'parentBindings': binding_pin, 'requestPair': bindings['requestPair'], 'sourceCount': len(sources),
            'priorDataCount': 3637, 'priorDataRoots': 129, 'preservationPinCount': len(protected),
            'closedCustodyRoots': len(bindings['closedRoots']), 'historicalMissing': 13,
            'runtimePins': runtime_pins, 'runtimeDataCount': len(runtime_pins), 'ownerFiles': owner_count,
            'ownerLedgerEvents': len(events), 'originalInvocation': invocation, 'databaseNames': names,
            'originalCounts': {key: report[key] for key in ('testsFound', 'testsStarted', 'testsSucceeded', 'testsFailed', 'testsSkipped', 'testsAborted', 'containersFailed', 'containersAborted')},
            'execCount': 2, 'dumpCount': 0, 'restoreCount': 0, 'cloneCount': 0, 'cleanup': cleanup,
            'containerId': ids['containerId'], 'networkId': ids['networkId'], 'execIds': ids['execIds'],
            'rootSeconds': outer['wallSeconds'], 'parentSeconds': parent['wallSeconds'],
            'ownerSeconds': owner['finishedMonotonic'] - owner['startedMonotonic'],
            'cleanupSeconds': cleanup['finishedMonotonic'] - cleanup['firstStop'],
            'originalConsumed': True, 'originalReplayed': False, 'originalResultAccredited': True,
            'ownerCleanupAccredited': True, 'pendingParentIndependentAccreditation': True,
            'productionAuthority': False, 'sourceMutation': False, 'limitsChanged': False,
            'runtimeJavaOwnerInvokedByAudit': False, 'extraDockerApiSql': False,
            'coverageRecommendation': {'verified': 45, 'pending': 30, 'pendingParentIndependentAccreditation': True},
            'checkCountBeforeResult': len(CHECKS), 'secondsBeforeResult': time.monotonic() - START,
            'limitations': ['No per-method duration or SQL/default-settings snapshot is emitted; original assertions require the actual successful direct JUnit callback.',
                'Raw HTTP response body bytes are not retained; parsed observations and recorded metadata are checked without inventing bodies.',
                'Original result and cleanup remain pending parent independent accreditation.']}
        proof = write_result(argv[5], result)
        custody('AFTER_RESULT')
        for expected in runtime_pins:
            check('Runtime physical identity after result', pin(expected['path']) == expected)
        print(json.dumps({'qualified': True, 'proof': proof, 'originalReplayed': False,
            'pendingParentIndependentAccreditation': True, 'checks': len(CHECKS), 'seconds': time.monotonic() - START}, sort_keys=True))
        return 0
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, prior_handler)


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print(json.dumps({'qualified': False, 'error': str(error), 'originalReplayed': False,
                          'productionAuthority': False}, sort_keys=True), file=sys.stderr)
        raise SystemExit(1)
