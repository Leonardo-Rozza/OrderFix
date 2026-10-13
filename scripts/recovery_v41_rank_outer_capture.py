"""Case-one-only ROOT280 caller over the approved owned-session engine.

The externally SHA-pinned request authorizes prospective canonical/ref snapshots;
it is not an independent human/native approval oracle. Capture is never original
result, owner cleanup, physical admission, runtime or production accreditation.
"""
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import stat
import sys

PROJECT = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend')
ROOT = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw')
DURABLE = PROJECT / 'release-validation.local/rank12-preparation-vcra7ulw'
SHARED = PROJECT / 'scripts/recovery_v41_outer_capture.py'
SHARED_SHA = '0ce15a0f1253b82a098a1fbe642956ad28fc4d48c5395255a6621fd3f9e1159a'
RECIPE_SHA = '5aad15b2957da6062b6b429cbf49fc268e2bc9d96b47a07f1eab6d3f868d8bf2'
STAGING_SHA = '3c3f92554210b7d407d81fafa2de933ae472452b5d1106a0692d84145f0f3a69'
ARCHIVE = Path('/private/tmp/ordenfix-pro-root280-shared-ksagrxsy/original-outer-capture.py')
ARCHIVE_SHA = 'ed618024d7b954793c3243d1cd604c4cc404e1b0bb6ddb739cfe27d2f96dc147'
STAT_FIELDS = ('st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_gid', 'st_nlink',
               'st_mtime_ns', 'st_ctime_ns')
REQUEST_KEYS = {'schema', 'case', 'originalRowIndex', 'originalInvocationOrdinal',
                'csvRow', 'reviewedHead', 'capture', 'sourcePins'}
PIN_KEYS = {'path', 'bytes', 'sha256', 'stat8'}
ENV_FIXED = {'PATH': '/usr/bin:/bin', 'LANG': 'C', 'LC_ALL': 'C',
             'PYTHONDONTWRITEBYTECODE': '1', '__CF_USER_TEXT_ENCODING': '0x1F5:0x0:0x8'}

# Closed transitive local Python3.10 imports, not the ambient sys.modules inventory.
IMPORT_NAMES = (
    '_blake2', '_collections_abc', '_frozen_importlib', '_frozen_importlib_external',
    '_hashlib', '_json', '_posixsubprocess', '_weakrefset', 'abc', 'codecs',
    'collections', 'collections.abc', 'contextlib', 'copyreg', 'encodings',
    'encodings.aliases', 'encodings.utf_8', 'enum', 'fcntl', 'fnmatch', 'functools',
    'genericpath', 'hashlib', 'importlib', 'importlib._abc', 'importlib._bootstrap',
    'importlib._bootstrap_external', 'importlib.util', 'io', 'json', 'json.decoder',
    'json.encoder', 'json.scanner', 'keyword', 'math', 'ntpath', 'operator', 'os',
    'os.path', 'pathlib', 'posixpath', 're', 'reprlib', 'resource', 'select',
    'selectors', 'signal', 'sre_compile', 'sre_constants', 'sre_parse', 'stat',
    'subprocess', 'threading', 'types', 'urllib', 'urllib.parse', 'warnings')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def strict_json(raw):
    def pairs(values):
        result = {}
        for key, value in values:
            require(key not in result, 'Duplicate JSON key: ' + key)
            result[key] = value
        return result
    def invalid(value):
        raise ValueError('Nonfinite JSON value: ' + value)
    def finite(value):
        result = float(value)
        require(math.isfinite(result), "Nonfinite JSON exponent")
        return result
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=invalid, parse_float=finite)


def source_pin(path):
    """Streaming ordinary SOURCE read, retaining full lstat/fstat identity."""
    path = Path(path)
    require(path.is_absolute(), 'Absolute SOURCE path required')
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1,
            'Ordinary single-link SOURCE required: ' + str(path))
    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    size, digest = 0, hashlib.sha256()
    with os.fdopen(descriptor, 'rb') as source:
        opened = os.fstat(source.fileno())
        require(all(getattr(before, key) == getattr(opened, key)
                    for key in STAT_FIELDS + ('st_size',)), 'SOURCE changed at open')
        for block in iter(lambda: source.read(65536), b''):
            size += len(block)
            digest.update(block)
        after = os.fstat(source.fileno())
    require(all(getattr(before, key) == getattr(after, key) == getattr(path.lstat(), key)
                for key in STAT_FIELDS + ('st_size',)), 'SOURCE changed during read')
    return {'path': str(path), 'bytes': size, 'sha256': digest.hexdigest(),
            'stat8': {key: getattr(before, key) for key in STAT_FIELDS}}


def checked_json(path, digest):
    before = source_pin(path)
    require(before['sha256'] == digest, 'Pinned JSON SHA mismatch: ' + str(path))
    require(before['bytes'] <= 16777216, 'Bounded JSON input')
    result = strict_json(Path(path).read_bytes())
    require(source_pin(path) == before, 'JSON identity changed during parsing')
    return result, before


def clean_environment(home, temporary):
    return dict(ENV_FIXED, HOME=str(home), TMPDIR=str(temporary))


def unique_pins(pins):
    require(type(pins) is list and len(pins) <= 20000, 'Bounded SOURCE list')
    result = {}
    for pin in pins:
        require(type(pin) is dict and set(pin) == PIN_KEYS
                and type(pin['path']) is str and Path(pin['path']).is_absolute()
                and '\0' not in pin['path'] and type(pin['bytes']) is int
                and pin['bytes'] >= 0 and type(pin['sha256']) is str
                and re.fullmatch('[0-9a-f]{64}', pin['sha256'])
                and type(pin['stat8']) is dict and set(pin['stat8']) == set(STAT_FIELDS)
                and all(type(value) is int for value in pin['stat8'].values()),
                'Exact SOURCE pin shape')
        require(pin['path'] not in result, 'Duplicate SOURCE path')
        result[pin['path']] = pin
    return result


def import_source_paths():
    paths = set()
    stdlib = Path('/Library/Frameworks/Python.framework/Versions/3.10/lib/python3.10')
    for name in IMPORT_NAMES:
        module = importlib.import_module(name)
        origin = getattr(module, '__file__', None)
        require(origin is not None and Path(origin).is_relative_to(stdlib),
                'Declared import origin must be installed Python3.10: ' + name)
        paths.add(Path(origin))
        cached = getattr(module, '__cached__', None)
        if cached and Path(cached).is_file():
            require(Path(cached).is_relative_to(stdlib), 'Installed bytecode SOURCE origin')
            paths.add(Path(cached))
    return paths


class Contract:
    """Fixed production bindings; small fixture roots are an explicit test seam.

    CLI always constructs the fixed production contract, never accepts roots,
    arbitrary expected sets, validators, capture functions or alternative argv.
    """
    def __init__(self, root=ROOT, project=PROJECT):
        self.root, self.project = Path(root), Path(project)
        self.records = self.root / 'real-case-1-records'
        self.request_path = self.records / 'root280-request-01.json'
        self.marker = self.records / 'root280-once-01.json'
        self.output = self.records / 'root280-output-01'
        self.canonical = self.project / 'odd/tasks/pro-paid-period-cancellation.md'
        self.branch_ref = self.project / '.git/refs/heads/codex/v41-rank-launcher-integrated'
        self.head_file = self.project / '.git/HEAD'
        self.owner = self.root / ('rows/row-1/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-'
                                  '62512faf39994009a3b16791a6e505dd')
        self.virgin_directories = [self.owner / name for name in ('home', 'tmp', 'observed', 'runtime')]
        self.virgin_directories += [self.records / 'launcher/home', self.records / 'launcher/tmp',
                                    self.records / 'root280-home', self.records / 'root280-tmp']
        report = self.records / 'launcher/launcher-report-01.json'
        self.absent_paths = [self.marker, self.output, self.records / 'parent-runtime-once.json',
            self.records / 'parent-runtime-output', report, self.records / 'launcher/class-init.log',
            Path(str(report) + '.watchdog'), Path(str(report) + '.owner-stderr')]
        self.anchors, self.extra_paths, self.import_paths = {}, set(), set()
        self.expected_historical_count = 9889
        self.recipe, self.parent, self.shared = None, None, None
        self.alias = None

    def expected_sources(self):
        historical = unique_pins(self.recipe['fixedPins'])
        require(len(historical) == self.expected_historical_count, 'Complete historical SOURCE set')
        # The prospective pinned request explicitly authorizes only current ref/canonical.
        historical.pop(str(self.branch_ref), None)
        historical.pop(str(self.canonical), None)
        for pin in self.anchors.values():
            old = historical.get(pin['path'])
            require(old is None or old == pin, 'Conflicting immutable SOURCE anchors')
            historical[pin['path']] = pin
        for path in self.extra_paths | self.import_paths:
            pin = source_pin(path)
            old = historical.get(str(path))
            require(old is None or old == pin, 'Import/current SOURCE conflicts with history')
            historical[str(path)] = pin
        return historical

    def check_alias(self):
        if self.alias is not None:
            require(os.readlink(self.alias["path"]) == self.alias["readlink"]
                    and {key: getattr(Path(self.alias["path"]).lstat(), key)
                         for key in STAT_FIELDS} == self.alias["stat8"],
                    "Exact installed Python alias identity")

    def virgin(self):
        require(all(not os.path.lexists(path) for path in self.absent_paths),
                'Once marker/output/runtime DATA must be absent; no retry/reset')
        for path in self.virgin_directories:
            value = path.lstat()
            require(stat.S_ISDIR(value.st_mode) and not any(path.iterdir()),
                    'Owned runtime directory must be ordinary and virgin: ' + str(path))


def production_contract():
    contract = Contract()
    recipe_path = contract.records / 'execution-recipe-01.json'
    staging_path = contract.records / 'staging-validation-01.json'
    recipe, recipe_pin = checked_json(recipe_path, RECIPE_SHA)
    staging, staging_pin = checked_json(staging_path, STAGING_SHA)
    contract.recipe = recipe
    require(recipe['case'] == 'case-1' and recipe['originalRowIndex'] == 0
            and recipe['csvRow'] == 'C,false,REORDER' and recipe['originalInvocationOrdinal'] == 1,
            'Historical first-row binding')
    require(recipe['parentWrapper']['sha256'] ==
            '50755ad38ca03631875842d2ed078c7809979015b030caefe3820d20b8a73aec',
            'Unchanged generic parent capture')
    require(len(recipe['parentArgv']) == 9 and recipe['rootEnvelopeSeconds'] == 280
            and recipe['runTimeoutSeconds'] == 240 and recipe['totalTimeoutSeconds'] == 270
            and recipe['originalCaseSeconds'] == 120 and recipe['execSeconds'] == 45
            and recipe['launchSeconds'] == 60 and recipe['ownerSeconds'] == 240
            and recipe['cleanupSeconds'] == 30 and recipe['readChunkBytes'] == 65536
            and recipe['stdoutCapBytes'] == recipe['stderrCapBytes'] == 8388608,
            'Frozen original and capture limits')
    contract.parent = {'schema': 1, 'argv': recipe['parentArgv'], 'cwd': recipe['parentCwd'],
        'environment': recipe['parentEnvironment'], 'runTimeoutSeconds': 280,
        'totalTimeoutSeconds': 280}
    pairs = staging['newPairs']
    require(len(pairs) == 5, 'Exactly five predecessor pairs and staging pair')
    expected_private = {str(contract.owner / name) for name in
        ('request.json', 'runtime-pins.json', 'real-case-1-enabled-spec-01.json')}
    expected_private |= {str(contract.records / name) for name in
        ('parent-input-01.json', 'execution-recipe-01.json')}
    require({pair['private']['path'] for pair in pairs} == expected_private,
            'Complete prepared SOURCE pairs')
    for pair in pairs:
        require(set(pair) == {'private', 'durable'}, 'Closed pair roles')
        private, durable = pair['private'], pair['durable']
        require(Path(durable['path']) == DURABLE / Path(private['path']).relative_to(ROOT)
                and private['bytes'] == durable['bytes'] and private['sha256'] == durable['sha256'],
                'Exact prepared durable counterpart')
        contract.anchors.update(unique_pins([private, durable]))
    contract.anchors[str(staging_path)] = staging_pin
    durable_staging = source_pin(DURABLE / staging_path.relative_to(ROOT))
    require(durable_staging['sha256'] == STAGING_SHA, 'Durable staging hash')
    contract.anchors[durable_staging['path']] = durable_staging
    require(contract.anchors[str(recipe_path)] == recipe_pin, 'Recipe predecessor identity')
    for pin in (recipe['parentWrapper'], recipe['requestDonor'], recipe['pythonAlias']['target']):
        existing = contract.anchors.get(pin['path'])
        require(existing is None or existing == pin, 'Conflicting recipe dependency')
        contract.anchors[pin['path']] = pin
    contract.alias = recipe['pythonAlias']
    contract.check_alias()
    for path, digest in [(SHARED, SHARED_SHA), (ARCHIVE, ARCHIVE_SHA),
        (PROJECT / 'release-validation.local/root280-shared-ksagrxsy/original-outer-capture.py', ARCHIVE_SHA)]:
        pin = source_pin(path)
        require(pin['sha256'] == digest, 'Approved shared/archive SOURCE')
        contract.anchors[str(path)] = pin
    module_spec = importlib.util.spec_from_file_location('rank_owned_capture', SHARED)
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    require(source_pin(SHARED) == contract.anchors[str(SHARED)], 'Shared import SOURCE drift')
    contract.shared = module
    contract.extra_paths = {contract.canonical, contract.branch_ref, contract.head_file,
        Path(__file__), PROJECT / 'scripts/test_recovery_v41_rank_outer_capture.py'}
    contract.import_paths = import_source_paths()
    return contract


def validate_request(request, contract):
    require(type(request) is dict and set(request) == REQUEST_KEYS
            and request['schema'] == 'rank12-root280-case1/v1' and request['case'] == 'case-1'
            and type(request['originalRowIndex']) is int and request['originalRowIndex'] == 0
            and type(request['originalInvocationOrdinal']) is int
            and request['originalInvocationOrdinal'] == 1 and request['csvRow'] == 'C,false,REORDER',
            'Closed first original rank case only')
    require(type(request['reviewedHead']) is str and re.fullmatch('[0-9a-f]{40}', request['reviewedHead']),
            'Explicit prospective reviewed boundary')
    require(request['capture'] == contract.parent
            and type(request['capture']) is dict
            and all(type(request['capture'][key]) is int for key in
                    ('schema', 'runTimeoutSeconds', 'totalTimeoutSeconds')),
            'Exact frozen parent argv9/cwd/ENV7 and ROOT280/280')
    contract.check_alias()
    supplied = unique_pins(request['sourcePins'])
    expected = contract.expected_sources()
    require(supplied == expected, 'Exact complete SOURCE union; no missing/extra/DATA/repinning')
    for pin in supplied.values():
        require(source_pin(pin['path']) == pin, 'Full SOURCE stat8/size/SHA drift: ' + pin['path'])
    require(contract.branch_ref.read_text() == request['reviewedHead'] + '\n'
            and contract.head_file.read_text() == 'ref: refs/heads/codex/v41-rank-launcher-integrated\n',
            'Pinned reviewed boundary must be current integrated branch')
    if contract.shared is not None:
        contract.shared.validate_capture_spec(request['capture'])
    return supplied


def write_new(path, value):
    raw = (json.dumps(value, sort_keys=True, indent=2, allow_nan=False) + '\n').encode()
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(descriptor, 'wb') as output:
        output.write(raw)
    require(Path(path).read_bytes() == raw, 'CREATE_NEW record readback')


def execute_once(path, digest, contract=None, capture=None):
    contract = production_contract() if contract is None else contract
    require(Path(path) == contract.request_path, 'Fixed prospective request locator')
    request, request_pin = checked_json(path, digest)
    sources = validate_request(request, contract)
    contract.virgin()
    require(source_pin(path) == request_pin, 'Request identity before consumption')
    write_new(contract.marker, {'schema': 'rank12-root280-once/v1', 'consumed': True,
        'request': request_pin, 'noAutomaticRetry': True})
    failures, result = [], None
    try:
        contract.output.mkdir(mode=0o700)
        run = capture if capture is not None else contract.shared.capture_owned_session
        result = run(request['capture'], contract.output)
    except (Exception, KeyboardInterrupt) as error:
        failures.append('Capture failed after consumption: ' + repr(error))
    try:
        contract.check_alias()
        for pin in sources.values():
            require(source_pin(pin['path']) == pin, 'Post-capture SOURCE drift: ' + pin['path'])
        require(source_pin(path) == request_pin, 'Post-capture request drift')
    except (Exception, KeyboardInterrupt) as error:
        failures.append(str(error))
    passed = type(result) is dict and result.get('passed') is True and not failures
    receipt = {'schema': 'rank12-root280-capture/v1', 'passed': passed,
        'capture': result, 'failures': failures, 'sourceCount': len(sources),
        'request': request_pin, 'originalResultAccredited': False,
        'ownerCleanupAccredited': False, 'runtimeAuthority': False, 'productionAuthority': False}
    if contract.output.is_dir() and not contract.output.is_symlink():
        write_new(contract.output / 'rank-capture-receipt.json', receipt)
    else:
        write_new(contract.records / 'root280-capture-failure-01.json', receipt)
    return receipt


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    require(len(argv) == 5 and argv[0] == '--execute-parent-approved-rank12-case1-root280'
            and argv[1] == '--request' and argv[3] == '--request-sha'
            and re.fullmatch('[0-9a-f]{64}', argv[4]), 'Closed case-one ROOT CLI')
    contract = production_contract()
    require(os.environ == clean_environment(contract.records / 'root280-home',
                                            contract.records / 'root280-tmp'), 'Clean ROOT ENV7')
    require(Path.cwd() == contract.records, 'Fixed ROOT cwd')
    result = execute_once(argv[2], argv[4], contract)
    print(json.dumps({'passed': result['passed'], 'originalResultAccredited': False}))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
