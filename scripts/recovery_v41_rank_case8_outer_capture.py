"""Exclusive case-eight ROOT280 caller and read-only pre-freeze admission.

Static admission creates no ROOT state and does not prove Docker availability.
The externally SHA-pinned request binds prospective publication identities, not
human/native approval. Capture never accredits original results or cleanup.
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
RECIPE_SHA = '8b2c8faaf80ede6498c5e2f73ec8a6cc626b89ef3998617d486344b62b169f25'
STAGING_SHA = '2c703f10078eae89b11788e4a28a8716c1aa6cb0cdad9b8213057c7e2bf4bd9c'
ARCHIVE = Path('/private/tmp/ordenfix-pro-root280-shared-ksagrxsy/original-outer-capture.py')
ARCHIVE_SHA = 'ed618024d7b954793c3243d1cd604c4cc404e1b0bb6ddb739cfe27d2f96dc147'
CURRENT_CONTROL_PIN = {'path': '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/case8-caller-s2j3gzb1/current-source-admission-01.json',
 'bytes': 1502988,
 'sha256': '4a67cdbfecdea96faf9d9d311a24f171a8b9552c76517ca9dfd118b146a668aa',
 'stat8': {'st_dev': 16777237,
           'st_ino': 4487280,
           'st_mode': 33152,
           'st_uid': 501,
           'st_gid': 20,
           'st_nlink': 1,
           'st_mtime_ns': 1792199434000000000,
           'st_ctime_ns': 1792199434000000000}}
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
    """Bound consumption and parse exactly the bytes hashed through one descriptor."""
    path = Path(path)
    require(path.is_absolute(), 'Absolute SOURCE path required')
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1,
            'Ordinary single-link SOURCE required: ' + str(path))
    limit = 16777216
    require(before.st_size <= limit, 'Bounded JSON input')

    def same_identity(current):
        return all(getattr(before, key) == getattr(current, key)
                   for key in STAT_FIELDS + ('st_size',))

    descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW)
    try:
        # Unbuffered reads must not prefetch beyond the limit-plus-one sentinel.
        source = os.fdopen(descriptor, 'rb', buffering=0)
    except BaseException:
        os.close(descriptor)
        raise
    with source:
        require(same_identity(os.fstat(source.fileno())), 'SOURCE changed at open')
        raw, observed_digest = bytearray(), hashlib.sha256()
        while True:
            block = source.read(min(65536, limit + 1 - len(raw)))
            if not block:
                break
            require(len(raw) + len(block) <= limit, 'Bounded JSON input')
            raw.extend(block)
            observed_digest.update(block)
        require(len(raw) == before.st_size
                and same_identity(os.fstat(source.fileno()))
                and same_identity(path.lstat()), 'SOURCE changed during read')
        observed_sha = observed_digest.hexdigest()
        require(observed_sha == digest, 'Pinned JSON SHA mismatch: ' + str(path))
        result = strict_json(bytes(raw))
        require(same_identity(os.fstat(source.fileno())) and same_identity(path.lstat()),
                'JSON identity changed during parsing')
    pin = {'path': str(path), 'bytes': len(raw), 'sha256': observed_sha,
           'stat8': {key: getattr(before, key) for key in STAT_FIELDS}}
    return result, pin


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
    """Fixed CLI bindings; fixture roots are an explicit in-process test seam only."""

    def __init__(self, root=ROOT, project=PROJECT):
        self.root, self.project = Path(root), Path(project)
        self.durable = self.project / 'release-validation.local/rank12-preparation-vcra7ulw'
        self.records = self.root / 'real-case-8-records'
        self.request_path = self.records / 'root280-request-01.json'
        self.marker = self.records / 'root280-once-01.json'
        self.output = self.records / 'root280-output-01'
        self.canonical = self.project / 'odd/tasks/pro-paid-period-cancellation.md'
        self.branch_ref = self.project / '.git/refs/heads/codex/v41-rank-launcher-integrated'
        self.head_file = self.project / '.git/HEAD'
        owner_relative = ('rows/row-8/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-'
                          'a2e7dea862994592b93705a8145b3541')
        self.owner = self.root / owner_relative
        self.prefreeze_absent_paths, self.prefreeze_directories = [], []
        root_directories, owner_absences = [], []
        for base in (self.root, self.durable):
            owner, records = base / owner_relative, base / 'real-case-8-records'
            report = records / 'launcher/launcher-report-01.json'
            self.prefreeze_directories.extend(owner / name for name in ('home', 'tmp', 'observed', 'runtime'))
            self.prefreeze_directories.extend(records / name for name in ('launcher/home', 'launcher/tmp'))
            root_directories.extend(records / name for name in ('root280-home', 'root280-tmp'))
            self.prefreeze_absent_paths.extend(records / name for name in (
                'root280-request-01.json', 'root280-home', 'root280-tmp',
                'root280-once-01.json', 'root280-output-01',
                'parent-runtime-once.json', 'parent-runtime-output'))
            self.prefreeze_absent_paths.extend((report, records / 'launcher/class-init.log',
                Path(str(report) + '.watchdog'), Path(str(report) + '.owner-stderr')))
            owner_absences.extend(owner / name for name in (
                'owner-once.json', 'once.json', 'owner-runtime-output', 'runtime-once.json'))
        self.prefreeze_absent_paths.extend(owner_absences)
        self.virgin_directories = self.prefreeze_directories + root_directories
        requests = {self.request_path, self.durable / 'real-case-8-records/root280-request-01.json'}
        self.absent_paths = [path for path in self.prefreeze_absent_paths
                             if path not in requests and path not in root_directories]
        self.future_directories, self.future_absent_paths = [], []
        self.anchors, self.extra_paths, self.import_paths = {}, set(), set()
        self.expected_historical_count = 10112
        self.expected_prior_data_count = 3637
        self.expected_prior_roots = None
        self.recipe, self.recipe_pin, self.parent, self.shared = None, None, None, None
        self.alias, self.prior_data = None, None
        self.control_path = Path(CURRENT_CONTROL_PIN['path'])
        self.control_pin = CURRENT_CONTROL_PIN
        self.expected_recovery_data, self.prepared_pairs = None, None

    @property
    def expected_recovery_data(self):
        return None if self._recovery_data_json is None else strict_json(self._recovery_data_json)

    @expected_recovery_data.setter
    def expected_recovery_data(self, value):
        self._recovery_data_json = None if value is None else json.dumps(value, sort_keys=True, allow_nan=False)

    @property
    def prepared_pairs(self):
        return None if self._prepared_pairs_json is None else strict_json(self._prepared_pairs_json)

    @prepared_pairs.setter
    def prepared_pairs(self, value):
        self._prepared_pairs_json = None if value is None else json.dumps(value, sort_keys=True, allow_nan=False)

    def current_admission(self):
        """Bind six immutable controls and four already-projected SOURCE mappings.

        The fixed DATA control is not SOURCE or execution authority. Original
        historical publication pins remain provenance; only a prospective request
        may bind current canonical/ref identities. Never project the recipe twice.
        """
        self.future_virgin()
        require(source_pin(self.control_path) == self.control_pin,
                'Current admission DATA full identity drift')
        control, control_pin = checked_json(self.control_path, self.control_pin['sha256'])
        keys = {'schema', 'role', 'case', 'originalRowIndex', 'originalInvocationOrdinal',
                'csvRow', 'ownerNonce', 'historicalSourceGate', 'currentSourceAdmissionPassed',
                'executionAuthorized', 'originalTestsModified', 'limitsChanged', 'recipe',
                'preparedPairs', 'mappings', 'priorDataRoots', 'protectedData'}
        require(control_pin == self.control_pin and type(control) is dict and set(control) == keys
                and control['schema'] == 'rank12-case8-current-source-admission/v1'
                and control['role'] == 'DATA_CURRENT_SOURCE_ADMISSION_NOT_EXECUTION_AUTHORITY'
                and control['case'] == 'case-8'
                and type(control['originalRowIndex']) is int and control['originalRowIndex'] == 7
                and type(control['originalInvocationOrdinal']) is int
                and control['originalInvocationOrdinal'] == 8
                and control['csvRow'] == 'en_US.utf8,true,V41_NOT_LATEST'
                and control['ownerNonce'] == 'a2e7dea862994592b93705a8145b3541'
                and control['historicalSourceGate'] == 'OPEN_MISSING_4'
                and all(control[key] is False for key in ('currentSourceAdmissionPassed',
                    'executionAuthorized', 'originalTestsModified', 'limitsChanged')),
                'Closed eighth-case current admission, never execution authority')
        require(control['recipe'] == self.recipe_pin and source_pin(self.recipe_pin['path']) == self.recipe_pin,
                'Recipe full identity drift')
        recipe, recipe_pin = checked_json(self.recipe_pin['path'], self.recipe_pin['sha256'])
        require(recipe_pin == self.recipe_pin and recipe == self.recipe, 'Exact immutable recipe contents')
        pairs = control['preparedPairs']
        require(type(pairs) is list and len(pairs) == 6 and pairs == self.prepared_pairs
                and all(type(pair) is dict and set(pair) == {'private', 'durable'} for pair in pairs),
                'Exactly six independent prepared control pairs')
        paired_pins = unique_pins([pin for pair in pairs for pin in pair.values()])
        require(len(paired_pins) == 12, 'Distinct prepared control pair identities')
        for pair in pairs:
            require(pair['private']['bytes'] == pair['durable']['bytes']
                    and pair['private']['sha256'] == pair['durable']['sha256'],
                    'Byte-identical prepared private/durable controls')
        for pin in paired_pins.values():
            require(source_pin(pin['path']) == pin, 'Prepared control full identity drift')
        mappings = control['mappings']
        identities = {'generic-parent-capture', 'parent-stages', 'original-row1-request', 'v42-baseline'}
        mapping_keys = {'identity', 'historicalMissingSource', 'archiveOrigin', 'newSource',
            'bytesIdentical', 'contentRewritten', 'oldPathRestored', 'timestampsCopied', 'role', 'usage'}
        require(type(mappings) is list and len(mappings) == 4
                and all(type(item) is dict and set(item) == mapping_keys for item in mappings)
                and {item['identity'] for item in mappings} == identities,
                'Exactly four closed unique recovered SOURCE mappings')
        expected_mappings = [dict(item, usage='RUNTIME_ENTRYPOINT'
            if item['identity'] == 'generic-parent-capture' else 'PROVENANCE_SOURCE_ONLY')
            for item in self.recipe['recoveredSourceMappings']]
        require(mappings == expected_mappings, 'Exact immutable source recovery provenance')
        require(self.recipe['archiveOriginSourcePins'] == [item['archiveOrigin'] for item in mappings],
                'Exactly four archival SOURCE anchors, never prior DATA')
        all_paths, physical = set(), set()
        for item in mappings:
            require(item['bytesIdentical'] is True
                    and all(item[key] is False for key in ('contentRewritten', 'oldPathRestored', 'timestampsCopied'))
                    and item['role'] == 'SOURCE_PAYLOAD_NOT_EXECUTION_AUTHORITY',
                    'Closed unchanged source recovery provenance')
            legs = [item[key] for key in ('historicalMissingSource', 'archiveOrigin', 'newSource')]
            pins = unique_pins(legs)
            require(len(pins) == 3 and not set(pins) & all_paths,
                    'Distinct exact old/archive/new paths, no alias or fallback')
            all_paths.update(pins)
            require(len({(pin['bytes'], pin['sha256']) for pin in legs}) == 1,
                    'Recovered SOURCE bytes must equal historical and archival provenance')
            require(not os.path.lexists(item['historicalMissingSource']['path']),
                    'Historical missing SOURCE must remain absent; old gate stays OPEN')
            for role in ('archiveOrigin', 'newSource'):
                pin = item[role]
                path = Path(pin['path'])
                require(all(not ancestor.is_symlink() for ancestor in (path,) + tuple(path.parents)),
                        'Recovered/archive path ancestry must not contain aliases')
                require(source_pin(path) == pin and not pin['stat8']['st_mode'] & 0o111,
                        'Ordinary non-executable recovered/archive full identity')
                identity = (pin['stat8']['st_dev'], pin['stat8']['st_ino'])
                require(identity not in physical, 'Recovered/archive physical alias')
                physical.add(identity)
        data = unique_pins(control['protectedData'])
        require(control['protectedData'] == self.expected_recovery_data and not set(data) & all_paths,
                'Exact independent recovery DATA custody')
        require(control['priorDataRoots'] == self.expected_prior_roots,
                'Exact independent prior DATA roots')
        for pin in data.values():
            require(source_pin(pin['path']) == pin, 'Recovery audit DATA identity drift')
        parent = next(item for item in mappings if item['identity'] == 'generic-parent-capture')
        original_argv = self.recipe['parentArgv']
        require(type(original_argv) is list and len(original_argv) == 9
                and original_argv[3] == parent['newSource']['path'],
                'Already-projected parent argv binds recovered generic capture only')
        require(self.parent == {'schema': 1, 'argv': original_argv,
                'cwd': self.recipe['parentCwd'], 'environment': self.recipe['parentEnvironment'],
                'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280},
                'All nine parent arguments/cwd/ENV/caps remain frozen')
        return mappings

    def project_current_sources(self, historical):
        for item in self.current_admission():
            old, new, archive = item['historicalMissingSource'], item['newSource'], item['archiveOrigin']
            require(old['path'] not in historical and historical.get(new['path']) == new,
                    'Exact already-projected SOURCE, no second old-to-new substitution')
            require(archive['path'] not in historical or historical[archive['path']] == archive,
                    'Conflicting archival SOURCE anchor')
            historical[archive['path']] = archive
        protected = {self.control_pin['path']}
        protected.update(pin['path'] for pin in self.expected_recovery_data)
        require(not protected & set(historical), 'Recovery DATA can never be SOURCE')
        return historical

    def expected_sources(self):
        historical = unique_pins(self.recipe['fixedPins'])
        require(len(historical) == self.expected_historical_count, 'Complete already-projected SOURCE set')
        require(self.recipe['extraSourcePins'] == [], 'No extra SOURCE projection')
        historical = self.project_current_sources(historical)
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

    def check_prior_data(self, sources):
        protection = self.prior_data
        require(type(protection) is dict and set(protection) ==
                {'role', 'roots', 'pins', 'sourceSubstitutionAllowed'}
                and protection['role'] == 'PRIOR_CONSUMED_DATA_AND_EVIDENCE_NOT_SOURCE'
                and protection['sourceSubstitutionAllowed'] is False
                and protection['roots'] == self.expected_prior_roots
                and len(set(protection['roots'])) == len(self.expected_prior_roots),
                'Closed prior consumed DATA custody; never SOURCE authority')
        pins = unique_pins(protection['pins'])
        require(len(pins) == self.expected_prior_data_count and not set(pins) & set(sources),
                'Exact prior DATA count/disjoint SOURCE roles')
        for pin in pins.values():
            require(any(Path(pin['path']).is_relative_to(Path(root)) for root in protection['roots']),
                    'Prior DATA inside exact custody roots')
            require(source_pin(pin['path']) == pin, 'Prior consumed DATA identity drift')
        return pins

    def check_alias(self):
        if self.alias is not None:
            require(os.readlink(self.alias['path']) == self.alias['readlink']
                    and {key: getattr(Path(self.alias['path']).lstat(), key) for key in STAT_FIELDS} == self.alias['stat8'],
                    'Exact installed Python alias identity')

    def future_virgin(self):
        require(all(not os.path.lexists(path) for path in self.future_absent_paths),
                'Future row state must remain absent; no other original may run')
        for path in self.future_directories:
            ordinary_empty_directory(path, 'Future row directory must remain virgin')

    def virgin(self):
        require(all(not os.path.lexists(path) for path in self.absent_paths),
                'Once marker/output/runtime DATA must be absent; no retry/reset')
        for path in self.virgin_directories:
            ordinary_empty_directory(path, 'Owned runtime directory must be ordinary and virgin')


def ordinary_empty_directory(path, reason):
    value = path.lstat()
    require(stat.S_ISDIR(value.st_mode)
            and all(not ancestor.is_symlink() for ancestor in (path,) + tuple(path.parents))
            and not any(path.iterdir()), reason + ': ' + str(path))


def validate_recipe(recipe):
    require(recipe['schema'] == 'rank12-eighth-original-case-execution-recipe/v1'
            and recipe['case'] == 'case-8'
            and type(recipe['originalRowIndex']) is int and recipe['originalRowIndex'] == 7
            and type(recipe['originalInvocationOrdinal']) is int and recipe['originalInvocationOrdinal'] == 8
            and recipe['csvRow'] == 'en_US.utf8,true,V41_NOT_LATEST', 'Historical eighth-row binding')
    plan = recipe['originalOperationPlan']
    require(type(plan) is dict and plan == {'execCount': 5, 'databaseCount': 3,
            'dumpCount': 1, 'restoreCount': 1, 'cloneCount': 0}
            and all(type(value) is int for value in plan.values()),
            'Exactly five operations/three databases, one dump/restore, no clone')
    require(recipe['extraSourcePinCount'] == 0 and recipe['completePriorSourceCount'] == 10112
            and recipe['extraSourcePins'] == [] and len(recipe['fixedPins']) == 10112,
            'Closed already-projected SOURCE metadata')
    limits = {'rootEnvelopeSeconds': 280, 'runTimeoutSeconds': 240,
        'totalTimeoutSeconds': 270, 'originalCaseSeconds': 120, 'execSeconds': 45,
        'launchSeconds': 60, 'ownerSeconds': 240, 'cleanupSeconds': 30,
        'readChunkBytes': 65536, 'stdoutCapBytes': 8388608, 'stderrCapBytes': 8388608}
    require(type(recipe['parentArgv']) is list and len(recipe['parentArgv']) == 9
            and all(type(recipe[key]) is int and recipe[key] == value for key, value in limits.items()),
            'Frozen original and capture limits')
    require(recipe['historicalSourceGate'] == 'OPEN_MISSING_4'
            and all(recipe[key] is False for key in ('runtimeAuthority', 'productionAuthority',
                'executionAuthorized', 'rootEnvelopeAvailable', 'callerAvailable', 'originalTestExecuted',
                'ownerExecuted', 'dockerApiSqlExecuted', 'limitsChanged', 'sourceRecompiled')),
            'Historical recipe is not execution authority')


def production_contract():
    contract = Contract()
    recipe_path = contract.records / 'execution-recipe-01.json'
    staging_path = contract.records / 'staging-validation-01.json'
    recipe, recipe_pin = checked_json(recipe_path, RECIPE_SHA)
    staging, staging_pin = checked_json(staging_path, STAGING_SHA)
    validate_recipe(recipe)
    contract.recipe, contract.recipe_pin = recipe, recipe_pin
    control, control_pin = checked_json(CURRENT_CONTROL_PIN['path'], CURRENT_CONTROL_PIN['sha256'])
    require(control_pin == CURRENT_CONTROL_PIN, 'Fixed current-source DATA control full identity')
    contract.expected_recovery_data = control['protectedData']
    contract.prepared_pairs = control['preparedPairs']
    contract.expected_prior_roots = control['priorDataRoots']
    require(len(contract.expected_prior_roots) == 129, 'Exactly129 literal prior custody roots')
    contract.prior_data = recipe['priorConsumedDataProtection']
    require(recipe['parentWrapper']['sha256'] ==
            '50755ad38ca03631875842d2ed078c7809979015b030caefe3820d20b8a73aec',
            'Unchanged recovered generic parent capture')
    contract.parent = {'schema': 1, 'argv': list(recipe['parentArgv']),
        'cwd': recipe['parentCwd'], 'environment': recipe['parentEnvironment'],
        'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280}
    pairs = staging['newPairs']
    expected_private = {str(contract.owner / name) for name in
        ('request.json', 'runtime-pins.json', 'real-case-8-enabled-spec-01.json')}
    expected_private.update(str(contract.records / name) for name in ('parent-input-01.json', 'execution-recipe-01.json'))
    require(type(pairs) is list and len(pairs) == 5
            and {pair['private']['path'] for pair in pairs} == expected_private,
            'Exactly five prepared predecessor pairs and staging pair')
    durable_staging = source_pin(DURABLE / staging_path.relative_to(ROOT))
    require(durable_staging['sha256'] == STAGING_SHA
            and control['preparedPairs'] == pairs + [{'private': staging_pin, 'durable': durable_staging}],
            'Exact six independent prepared pair bindings')
    for pair in control['preparedPairs']:
        require(set(pair) == {'private', 'durable'}, 'Closed prepared pair roles')
        private, durable = pair['private'], pair['durable']
        require(Path(durable['path']) == DURABLE / Path(private['path']).relative_to(ROOT),
                'Exact prepared durable counterpart')
        contract.anchors.update(unique_pins([private, durable]))
    for pin in (recipe['parentWrapper'], recipe['requestDonor'], recipe['pythonAlias']['target']):
        old = contract.anchors.get(pin['path'])
        require(old is None or old == pin, 'Conflicting recipe dependency')
        contract.anchors[pin['path']] = pin
    # This protected regression is SOURCE, never prior evidence DATA.
    protected_test = recipe['protectedNonExecutionTestSource']
    require(source_pin(protected_test['path']) == protected_test,
            'Protected non-execution test SOURCE identity drift')
    contract.anchors[protected_test['path']] = protected_test
    # Future rows stay virgin independently of consumed originals1-7 and active8.
    preparation_path = ROOT / 'preparation-manifest-01.json'
    preparation_pin = unique_pins(recipe['fixedPins'])[str(preparation_path)]
    preparation, actual_pin = checked_json(preparation_path, preparation_pin['sha256'])
    require(actual_pin == preparation_pin and len(preparation['rows']) == 12,
            'Original twelve-row preparation identity')
    for row in preparation['rows'][8:]:
        require(row['originalInvocationOrdinal'] > 8, 'Future original ordinal')
        for base in (ROOT, DURABLE):
            owner = base / Path(row['ownerRoot']).relative_to(ROOT)
            contract.future_directories.extend(owner / name for name in ('home', 'tmp', 'observed', 'runtime'))
            contract.future_absent_paths.extend(owner / name for name in (
                'once.json', 'owner-once.json', 'runtime-once.json', 'owner-runtime-output',
                'request.json', 'runtime-pins.json', 'real-' + row['case'] + '-enabled-spec-01.json'))
            contract.future_absent_paths.append(base / ('real-' + row['case'] + '-records'))
    allowlist_pin = recipe['unchangedAllowlist']
    allowlist, actual_pin = checked_json(allowlist_pin['path'], allowlist_pin['sha256'])
    require(actual_pin == allowlist_pin and allowlist['originalRowIndex'] == 7
            and allowlist['originalInvocationOrdinal'] == 8
            and allowlist['steps'] == ['case-8-setup-create', 'case-8-migrated-create',
                'case-8-dump', 'case-8-restored-create', 'case-8-restore']
            and allowlist['tokens'] == [7, 7, 6, 7, 8] and allowlist['vectors'] == [],
            'Unchanged original TRUE five-step operation allowlist')
    contract.alias = recipe['pythonAlias']
    contract.check_alias()
    for path, digest in ((SHARED, SHARED_SHA), (ARCHIVE, ARCHIVE_SHA),
            (PROJECT / 'release-validation.local/root280-shared-ksagrxsy/original-outer-capture.py', ARCHIVE_SHA)):
        pin = source_pin(path)
        require(pin['sha256'] == digest, 'Approved shared/archive SOURCE')
        contract.anchors[str(path)] = pin
    module_spec = importlib.util.spec_from_file_location('rank_owned_capture_case8', SHARED)
    module = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(module)
    require(source_pin(SHARED) == contract.anchors[str(SHARED)], 'Shared import SOURCE drift')
    contract.shared = module
    contract.extra_paths = {contract.canonical, contract.branch_ref, contract.head_file,
        Path(__file__), PROJECT / 'scripts/test_recovery_v41_rank_case8_outer_capture.py'}
    contract.import_paths = import_source_paths()
    require(staging['missingUntilExecution'] == [str(path) for path in contract.prefreeze_absent_paths],
            'Exact30 pre-freeze absence locators')
    contract.current_admission()
    # This is the recovered generic parent's PURE inner240/270 validator, not
    # shared.validate_spec (which belongs to a different, older argument shape).
    inner, inner_pin = checked_json(recipe['parentInput']['path'], recipe['parentInput']['sha256'])
    require(inner_pin == recipe['parentInput'], 'Exact prepared inner parent input')
    generic_spec = importlib.util.spec_from_file_location('case8_generic_parent_admission',
                                                        recipe['parentWrapper']['path'])
    generic = importlib.util.module_from_spec(generic_spec)
    generic_spec.loader.exec_module(generic)
    require(source_pin(recipe['parentWrapper']['path']) == recipe['parentWrapper'],
            'Recovered generic parent import SOURCE drift')
    generic.validate_spec(inner)
    return contract


def static_admission(contract=None):
    """Read-only prospective admission; never creates request, HOME, TMPDIR or marker."""
    contract = production_contract() if contract is None else contract
    require(len(contract.prefreeze_absent_paths) == 30
            and len(set(contract.prefreeze_absent_paths)) == 30
            and all(not os.path.lexists(path) for path in contract.prefreeze_absent_paths),
            'Pre-freeze runtime paths must remain absent')
    require(len(contract.prefreeze_directories) == 12 and len(set(contract.prefreeze_directories)) == 12,
            'Exactly12 independent pre-freeze directories')
    for path in contract.prefreeze_directories:
        ordinary_empty_directory(path, 'Pre-freeze directory must be ordinary and empty')
    sources = contract.expected_sources()
    request = {'schema': 'rank12-root280-case8/v1', 'case': 'case-8',
        'originalRowIndex': 7, 'originalInvocationOrdinal': 8,
        'csvRow': 'en_US.utf8,true,V41_NOT_LATEST', 'reviewedHead': contract.branch_ref.read_text().strip(),
        'capture': contract.parent, 'sourcePins': list(sources.values())}
    validate_request(request, contract)
    return {'schema': 'rank12-case8-static-admission/v1', 'passed': True,
        'sourceCount': len(sources), 'priorDataCount': contract.expected_prior_data_count,
        'priorDataRoots': len(contract.expected_prior_roots), 'preparedControlPairs': 6,
        'archivalSourceAnchors': 4, 'absentRuntimePaths': 30, 'emptyRuntimeDirectories': 12,
        'historicalSourceGate': 'OPEN_MISSING_4', 'rootEnvelopeAvailable': False,
        'originalResultAccredited': False, 'ownerCleanupAccredited': False,
        'dockerVerified': False, 'runtimeAuthority': False, 'productionAuthority': False}


def validate_request(request, contract):
    require(type(request) is dict and set(request) == REQUEST_KEYS
            and request['schema'] == 'rank12-root280-case8/v1' and request['case'] == 'case-8'
            and type(request['originalRowIndex']) is int and request['originalRowIndex'] == 7
            and type(request['originalInvocationOrdinal']) is int
            and request['originalInvocationOrdinal'] == 8 and request['csvRow'] == 'en_US.utf8,true,V41_NOT_LATEST',
            'Closed eighth original rank case only')
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
    contract.check_prior_data(supplied)
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
        contract.current_admission()
        contract.check_prior_data(sources)
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
    require(len(argv) == 5 and argv[0] == '--execute-parent-approved-rank12-case8-root280'
            and argv[1] == '--request' and argv[3] == '--request-sha'
            and re.fullmatch('[0-9a-f]{64}', argv[4]), 'Closed case-eight ROOT CLI')
    contract = production_contract()
    require(os.environ == clean_environment(contract.records / 'root280-home',
                                            contract.records / 'root280-tmp'), 'Clean ROOT ENV7')
    require(Path.cwd() == contract.records, 'Fixed ROOT cwd')
    result = execute_once(argv[2], argv[4], contract)
    print(json.dumps({'passed': result['passed'], 'originalResultAccredited': False}))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
