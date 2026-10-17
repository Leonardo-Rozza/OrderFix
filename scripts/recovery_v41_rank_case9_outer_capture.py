"""Exclusive ninth-row prospective ROOT caller and read-only static admission.

Admission is not Docker readiness, execution consent or result accreditation.
Only the fixture callback seam is exercised by this module's isolated tests.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import sys

PROJECT = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend')
ROOT = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw')
DURABLE = PROJECT / 'release-validation.local/rank12-preparation-vcra7ulw'
NONCE = 'ca3647e6e83646a686934b2f5110ba70'
HELPER = PROJECT / 'scripts/recovery_v41_rank_case8_outer_capture.py'
HELPER_SHA = 'bb64e267256606ad8c738baffb762cbae3c4856b36e915a517e5df9d40ae0940'
CONTROL = PROJECT / 'release-validation.local/case9-caller-xtvefkqz/caller-control-01.json'
CONTROL_SHA = 'c1dc80ba5dc060528130ef95393e14b8e3b154ea9f8296a206f99fcc56dd1123'
CONTROL_STAT = {'st_dev': 16777237, 'st_ino': 4495567, 'st_mode': 33152,
                'st_uid': 501, 'st_gid': 20, 'st_nlink': 1,
                'st_mtime_ns': 1792276883000000000, 'st_ctime_ns': 1792276883000000000}
RECIPE_SHA = '7840d842ead8cfca506cb45ed66660fc2122375bf9fa4fd01c2c0df9f65fc568'
STAGING_SHA = 'f5c059599cef48b391570e72a4c3312256ef451f91e220bb13fb13f04b6af2ba'
LIMITS = {'rootEnvelopeSeconds': 280, 'runTimeoutSeconds': 240,
          'totalTimeoutSeconds': 270, 'originalCaseSeconds': 120, 'execSeconds': 45,
          'launchSeconds': 60, 'ownerSeconds': 240, 'cleanupSeconds': 30,
          'readChunkBytes': 65536, 'stdoutCapBytes': 8388608, 'stderrCapBytes': 8388608}

# Import only an immutable module of pure helpers; never call its case8 admissions.
if HELPER.is_symlink() or hashlib.sha256(HELPER.read_bytes()).hexdigest() != HELPER_SHA:
    raise ValueError('Pinned pure helper SOURCE required')
_spec = importlib.util.spec_from_file_location('case9_pinned_pure_helpers', HELPER)
_helpers = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_helpers)
require = _helpers.require
source_pin = _helpers.source_pin
checked_json = _helpers.checked_json
unique_pins = _helpers.unique_pins
write_new = _helpers.write_new
clean_environment = _helpers.clean_environment
require(source_pin(HELPER)['sha256'] == HELPER_SHA, 'Pure helper SOURCE changed at import')


def check_path(path):
    path = Path(path)
    require(path.is_absolute() and '..' not in path.parts
            and all(not ancestor.is_symlink() for ancestor in (path,) + tuple(path.parents)),
            'Absolute ordinary nonalias path: ' + str(path))


def check_absent(paths):
    require(len(set(map(str, paths))) == len(paths), 'Distinct absence locators')
    require(all(not os.path.lexists(path) for path in paths),
            'Historical, consumed or future runtime path is present; no retry/reset')


def check_empty(paths):
    require(len(set(map(str, paths))) == len(paths), 'Distinct empty directory locators')
    for path in map(Path, paths):
        check_path(path)
        value = path.lstat()
        require(stat.S_ISDIR(value.st_mode) and stat.S_IMODE(value.st_mode) == 0o700
                and not any(path.iterdir()), 'Ordinary empty 0700 directory: ' + str(path))


def check_sources(supplied, expected):
    require(unique_pins(supplied) == expected,
            'Exact complete SOURCE union; no missing/extra/DATA/repinning')
    physical = set()
    for pin in expected.values():
        check_path(pin['path'])
        identity = (pin['stat8']['st_dev'], pin['stat8']['st_ino'])
        require(identity not in physical and source_pin(pin['path']) == pin,
                'Full SOURCE physical identity drift or alias: ' + pin['path'])
        physical.add(identity)


def check_closed_roots(roots):
    require(type(roots) is list and len({root['root'] for root in roots}) == len(roots),
            'Distinct closed custody roots')
    for root in roots:
        require(type(root) is dict and set(root) == {'root', 'files'}
                and type(root['files']) is list and len(set(root['files'])) == len(root['files']),
                'Exact closed inventory schema')
        path = Path(root['root'])
        check_path(path)
        require(path.is_dir(), 'Closed root must remain a directory')
        actual = set()
        for entry in path.rglob('*'):
            check_path(entry)
            require(entry.is_dir() or entry.is_file(), 'Ordinary closed inventory entry')
            if entry.is_file():
                actual.add(str(entry))
        require(actual == set(root['files'])
                and all(Path(value).is_relative_to(path) for value in root['files']),
                'Closed custody inventory missing/extra file')


def check_pairs(pairs, private_root, durable_root, count=6):
    require(type(pairs) is list and len(pairs) == count
            and all(type(pair) is dict and set(pair) == {'private', 'durable'} for pair in pairs),
            'Exact prepared pair roles/count')
    pins = unique_pins([pin for pair in pairs for pin in pair.values()])
    require(len(pins) == count * 2, 'Distinct prepared control identities')
    for pair in pairs:
        private, durable = pair['private'], pair['durable']
        require(Path(private['path']).is_relative_to(private_root)
                and Path(durable['path']) == durable_root / Path(private['path']).relative_to(private_root)
                and (private['bytes'], private['sha256']) == (durable['bytes'], durable['sha256']),
                'Exact byte-identical durable counterpart')
    check_sources(list(pins.values()), pins)


def validate_recipe(recipe):
    require(type(recipe) is dict and recipe['schema'] == 'rank12-ninth-original-case-execution-recipe/v1'
            and recipe['case'] == 'case-9' and type(recipe['originalRowIndex']) is int
            and recipe['originalRowIndex'] == 8 and type(recipe['originalInvocationOrdinal']) is int
            and recipe['originalInvocationOrdinal'] == 9 and recipe['csvRow'] == 'C,false,OLDER_TAIL',
            'Exclusive ninth original C,false,OLDER_TAIL binding')
    require(recipe['originalOperationPlan'] == {'execCount': 2, 'databaseCount': 2,
            'dumpCount': 0, 'restoreCount': 0, 'cloneCount': 0}
            and all(type(value) is int for value in recipe['originalOperationPlan'].values()),
            'Exactly two FALSE operations/two databases/no dump/restore/clone')
    require(all(type(recipe[key]) is int and recipe[key] == value for key, value in LIMITS.items()),
            'Frozen original/resource/stream limits')
    require(type(recipe['completePriorSourceCount']) is int and recipe['completePriorSourceCount'] == 10128
            and len(unique_pins(recipe['fixedPins'])) == 10128
            and type(recipe['extraSourcePinCount']) is int and recipe['extraSourcePinCount'] == 0
            and recipe['extraSourcePins'] == [], 'Already-projected SOURCE metadata')
    require(recipe['historicalSourceGate'] == 'OPEN_MISSING_4_AND_9'
            and all(recipe[key] is False for key in ('runtimeAuthority', 'productionAuthority',
                'executionAuthorized', 'rootEnvelopeAvailable', 'callerAvailable', 'originalTestExecuted',
                'ownerExecuted', 'dockerApiSqlExecuted', 'limitsChanged', 'sourceRecompiled')),
            'Preparation recipe is not execution authority')


def validate_provenance(recipe):
    """Validate already-projected 4+9 provenance without projecting or repinning."""
    sources = unique_pins(recipe['fixedPins'])
    paths, historical, physical = set(), [], set()
    four, nine = recipe['recoveredSourceMappings'], recipe['sourceRecoveryMappings']
    require(len(four) == 4 and {item['identity'] for item in four} == {
            'generic-parent-capture', 'parent-stages', 'original-row1-request', 'v42-baseline'}
            and len(nine) == 9,
            'Complete unique four plus nine SOURCE mappings')
    for group, old_key, donor_key, new_key, role in (
            (four, 'historicalMissingSource', 'archiveOrigin', 'newSource',
             'SOURCE_PAYLOAD_NOT_EXECUTION_AUTHORITY'),
            (nine, 'oldExpectedPin', 'donorPin', 'newSourcePin',
             'CURRENT_SOURCE_PAYLOAD_PREPARATION_NOT_ADMISSION_AUTHORITY')):
        for item in group:
            old, donor, new = (item[key] for key in (old_key, donor_key, new_key))
            legs = unique_pins([old, donor, new])
            require(len(legs) == 3 and not paths & set(legs)
                    and item['role'] == role and item['bytesIdentical'] is True
                    and all(item[key] is False for key in ('contentRewritten', 'oldPathRestored', 'timestampsCopied'))
                    and all(item.get(key, False) is False for key in (
                        'historicalIdentityRestored', 'substitutionPerformed')),
                    'Exact unchanged provenance mapping, no duplicate or role substitution')
            paths.update(legs)
            historical.append(old['path'])
            require(old['path'] not in sources and sources.get(new['path']) == new
                    and sources.get(donor['path']) == donor
                    and len({(pin['bytes'], pin['sha256']) for pin in legs.values()}) == 1,
                    'Already-projected SOURCE required; second projection forbidden')
            for pin in (donor, new):
                check_path(pin['path'])
                identity = (pin['stat8']['st_dev'], pin['stat8']['st_ino'])
                require(identity not in physical and source_pin(pin['path']) == pin,
                        'Provenance full physical identity or alias drift')
                physical.add(identity)
    require(len(historical) == 13 and set(historical) == set(recipe['historicalAbsentPaths']),
            'All thirteen historical gaps remain explicit')
    check_absent(historical)
    controls = recipe['sourceRecoveryControls']
    require(len(controls) == 2, 'Exact nine-payload manifest/final controls')
    manifest, mp = checked_json(controls[0]['path'], controls[0]['sha256'])
    final, fp = checked_json(controls[1]['path'], controls[1]['sha256'])
    require(mp == controls[0] and fp == controls[1] and manifest['mappings'] == nine
            and final['manifest'] == mp and final['historicalIdentityRestored'] is False
            and final['dependencyReconstructionPassed'] is True,
            'Immutable reconstruction provenance, never restored historical custody')
    files = unique_pins(manifest['files'])
    check_sources(list(files.values()), files)
    check_closed_roots([{'root': str(Path(mp['path']).parent), 'files': manifest['expectedClosedFiles']}])


def validate_owner_request(request, owner):
    require(request['nonce'] == NONCE and request['root'] == str(owner)
            and request['containerName'] == 'ordenfix-pro-recovery-v41-rank12-pg-' + NONCE
            and request['networkName'] == 'ordenfix-pro-recovery-v41-rank12-net-' + NONCE
            and request['budgets'] == {'cleanupSeconds': 30, 'helperSeconds': 30, 'httpSeconds': 10, 'launchSeconds': 60},
            'Fixed owner nonce/identity/cleanup budgets')
    config = request['containerTemplate']['HostConfig']
    expected = {'Binds': [], 'Memory': 1073741824, 'MemorySwap': 1073741824,
        'NanoCpus': 1000000000, 'NetworkMode': '@NEW_OWNED_NETWORK_ID@', 'PidsLimit': 128,
        'PortBindings': {'5432/tcp': [{'HostIp': '127.0.0.1', 'HostPort': ''}]},
        'Privileged': False, 'PublishAllPorts': False, 'ReadonlyRootfs': True,
        'SecurityOpt': ['no-new-privileges'], 'ShmSize': 67108864,
        'Tmpfs': {'/tmp': 'rw,nosuid,noexec,size=134217728',
            '/var/lib/postgresql/data': 'rw,nosuid,noexec,size=536870912',
            '/var/run/postgresql': 'rw,nosuid,noexec,size=16777216'}}
    require(config == expected and all(type(config[key]) is int for key in
            ('Memory', 'MemorySwap', 'NanoCpus', 'PidsLimit', 'ShmSize'))
            and all(type(config[key]) is bool for key in ('Privileged', 'PublishAllPorts', 'ReadonlyRootfs')),
            'Unchanged 1GiB/local-only container resources')


class Contract:
    """One immutable prospective snapshot; repeated checks never refresh pins."""
    def __init__(self, recipe, control, control_pin):
        self.recipe, self.control, self.control_pin = recipe, control, control_pin
        self.records = ROOT / 'real-case-9-records'
        self.request_path = self.records / 'root280-request-01.json'
        self.marker = self.records / 'root280-once-01.json'
        self.output = self.records / 'root280-output-01'
        self.canonical = PROJECT / 'odd/tasks/pro-paid-period-cancellation.md'
        self.branch_ref = PROJECT / '.git/refs/heads/codex/v41-rank-launcher-integrated'
        self.head_file = PROJECT / '.git/HEAD'
        self.parent = {'schema': 1, 'argv': recipe['parentArgv'], 'cwd': recipe['parentCwd'],
                       'environment': recipe['parentEnvironment'], 'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280}
        self.publications = unique_pins([source_pin(self.canonical), source_pin(self.branch_ref)])
        self.reviewed_head = self.branch_ref.read_text().strip()
        self.fixture_only = False
        self.sources = unique_pins(recipe['fixedPins'])
        self.sources.update(self.publications)
        additions = [pin for pair in control['preparedPairs'] for pin in pair.values()]
        additions += control['operationalPins'] + [recipe[key] for key in (
            'parentWrapper', 'requestDonor', 'unchangedAllowlist', 'unchangedDisabledSpec')]
        additions += [source_pin(path) for path in _helpers.import_source_paths() | {
            Path(__file__), PROJECT / 'scripts/test_recovery_v41_rank_case9_outer_capture.py', self.head_file}]
        for pin in additions:
            require(self.sources.get(pin['path'], pin) == pin, 'Conflicting operational SOURCE anchor')
            self.sources[pin['path']] = pin
        self._source_snapshot = json.dumps(self.sources, sort_keys=True, allow_nan=False)
        self.absent, self.empty, self.future_absent, self.future_empty = [], [], [], []
        owner_absences = []
        for base in (ROOT, DURABLE):
            owner = base / Path(recipe['ownerRoot']).relative_to(ROOT)
            records = base / 'real-case-9-records'
            self.empty.extend(owner / name for name in ('home', 'tmp', 'observed', 'runtime'))
            self.empty.extend(records / name for name in ('launcher/home', 'launcher/tmp'))
            self.absent.extend(records / name for name in ('root280-request-01.json', 'root280-home', 'root280-tmp',
                'root280-once-01.json', 'root280-output-01', 'parent-runtime-once.json', 'parent-runtime-output',
                'launcher/launcher-report-01.json', 'launcher/class-init.log',
                'launcher/launcher-report-01.json.watchdog', 'launcher/launcher-report-01.json.owner-stderr'))
            owner_absences.extend(owner / name for name in ('owner-once.json', 'once.json', 'owner-runtime-output', 'runtime-once.json'))
        self.absent.extend(owner_absences)
        prep_pin = self.sources[str(ROOT / 'preparation-manifest-01.json')]
        preparation, observed = checked_json(prep_pin['path'], prep_pin['sha256'])
        require(observed == prep_pin and len(preparation['rows']) == 12, 'Exact twelve-row preparation')
        for row in preparation['rows'][9:]:
            for base in (ROOT, DURABLE):
                owner = base / Path(row['ownerRoot']).relative_to(ROOT)
                self.future_empty.extend(owner / name for name in ('home', 'tmp', 'observed', 'runtime'))
                self.future_absent.extend(owner / name for name in ('once.json', 'owner-once.json', 'runtime-once.json',
                    'owner-runtime-output', 'request.json', 'runtime-pins.json', 'real-' + row['case'] + '-enabled-spec-01.json'))
                self.future_absent.append(base / ('real-' + row['case'] + '-records'))

    def check(self):
        require(source_pin(CONTROL) == self.control_pin, 'Caller DATA control full identity drift')
        control, observed = checked_json(CONTROL, CONTROL_SHA)
        recipe, recipe_pin = checked_json(control['recipe']['path'], RECIPE_SHA)
        require(observed == self.control_pin and control == self.control
                and recipe_pin == control['recipe'] and recipe == self.recipe,
                'Immutable recipe and custody declarations may not be refreshed')
        require(self.sources == _helpers.strict_json(self._source_snapshot),
                'Prospective SOURCE snapshot may not be repinned')
        validate_recipe(self.recipe)
        validate_provenance(self.recipe)
        check_pairs(self.control['preparedPairs'], ROOT, DURABLE)
        custody = unique_pins(self.control['custodyPins'])
        check_sources(list(custody.values()), custody)
        check_closed_roots(self.control['closedRoots'])
        check_sources(list(self.sources.values()), self.sources)
        prior = self.recipe['priorConsumedDataProtection']
        pins = unique_pins(prior['pins'])
        require(prior == self.recipe['previousDataProtection'] and len(pins) == 3637
                and len(prior['roots']) == len(set(prior['roots'])) == 129
                and prior['role'] == 'PRIOR_CONSUMED_DATA_AND_EVIDENCE_NOT_SOURCE'
                and prior['sourceSubstitutionAllowed'] is False and not set(pins) & set(self.sources),
                'Exact inherited DATA3637/129, disjoint SOURCE roles')
        check_sources(list(pins.values()), pins)
        check_absent(self.control['historicalAbsentPaths'])
        check_absent(self.future_absent)
        check_empty(self.future_empty)
        require(self.branch_ref.read_text() == self.reviewed_head + '\n'
                and self.head_file.read_text() == 'ref: refs/heads/codex/v41-rank-launcher-integrated\n',
                'Prospective publication snapshot/current branch drift')
        alias = self.recipe['pythonAlias']
        require(os.readlink(alias['path']) == alias['readlink']
                and {key: getattr(Path(alias['path']).lstat(), key) for key in _helpers.STAT_FIELDS} == alias['stat8']
                and source_pin(alias['target']['path']) == alias['target'], 'Installed Python alias drift')

    def virgin(self):
        check_absent([path for path in self.absent if path != self.request_path
                      and path != DURABLE / 'real-case-9-records/root280-request-01.json'
                      and path.name not in ('root280-home', 'root280-tmp')])
        check_empty(self.empty + [base / 'real-case-9-records' / name
                                 for base in (ROOT, DURABLE) for name in ('root280-home', 'root280-tmp')])

    def prefreeze(self):
        check_absent(self.absent)
        check_empty(self.empty)
        for base in (ROOT, DURABLE):
            records = base / 'real-case-9-records'
            launcher = records / 'launcher'
            for path in (records, launcher):
                check_path(path)
                value = path.lstat()
                require(stat.S_ISDIR(value.st_mode) and stat.S_IMODE(value.st_mode) == 0o700,
                        'Ordinary private 0700 records/launcher directory')
            require({path.name for path in records.iterdir()} == {
                    'parent-input-01.json', 'execution-recipe-01.json', 'staging-validation-01.json', 'launcher'}
                    and {path.name for path in launcher.iterdir()} == {'home', 'tmp'},
                    'Exact prepared records and launcher inventories, no runtime residue')


def production_contract():
    control, cp = checked_json(CONTROL, CONTROL_SHA)
    require(cp == {'path': str(CONTROL), 'bytes': 8457157, 'sha256': CONTROL_SHA,
                   'stat8': CONTROL_STAT}, 'Fixed full physical caller control identity')
    keys = {'schema', 'role', 'recipe', 'staging', 'preparedPairs', 'custodyPins', 'closedRoots',
            'historicalAbsentPaths', 'indexB', 'retainedRefs', 'operationalPins',
            'inheritedSourceCount', 'inheritedPriorDataCount', 'inheritedPriorRootCount'}
    require(set(control) == keys and control['schema'] == 'rank12-case9-caller-control/v1'
            and control['role'] == 'DATA_CUSTODY_NOT_SOURCE_OR_EXECUTION_AUTHORITY'
            and control['inheritedSourceCount'] == 10128 and control['inheritedPriorDataCount'] == 3637
            and control['inheritedPriorRootCount'] == 129, 'Closed complete DATA control, never execution authority')
    recipe, rp = checked_json(control['recipe']['path'], RECIPE_SHA)
    staging, sp = checked_json(control['staging']['path'], STAGING_SHA)
    require(rp == control['recipe'] and sp == control['staging'], 'Immutable recipe/staging fullpins')
    validate_recipe(recipe)
    require(control['historicalAbsentPaths'] == recipe['historicalAbsentPaths'], 'Exact historical absences')
    require(staging['newPairs'] + [control['preparedPairs'][-1]] == control['preparedPairs']
            and control['preparedPairs'][-1]['private'] == sp, 'Six immutable prepared pairs')
    contract = Contract(recipe, control, cp)
    require(staging['missingUntilExecution'] == list(map(str, contract.absent)), 'Exact thirty runtime absences')
    custody = unique_pins(control['custodyPins'])
    require(custody.get(control['indexB']['path']) == control['indexB']
            and len(control['retainedRefs']) == 4
            and all(custody.get(pin['path']) == pin for pin in control['retainedRefs']),
            'Real indexB and four retained refs bound by full custody')
    request, request_pin = checked_json(recipe['request']['path'], recipe['request']['sha256'])
    require(request_pin == recipe['request'], 'Fixed owner request physical identity')
    validate_owner_request(request, recipe['ownerRoot'])
    allowlist, ap = checked_json(recipe['unchangedAllowlist']['path'], recipe['unchangedAllowlist']['sha256'])
    require(ap == recipe['unchangedAllowlist'] and allowlist['originalRowIndex'] == 8
            and allowlist['originalInvocationOrdinal'] == 9 and allowlist['rankKind'] == 'OLDER_TAIL'
            and allowlist['steps'] == ['case-9-setup-create', 'case-9-migrated-create']
            and allowlist['tokens'] == [7, 7] and allowlist['vectors'] == [], 'Exact FALSE two-exec allowlist')
    require(len(recipe['parentArgv']) == 9 and recipe['parentArgv'][3] == recipe['parentWrapper']['path']
            and recipe['parentArgv'][6] == recipe['parentInput']['path']
            and recipe['parentArgv'][8] == recipe['parentInput']['sha256']
            and recipe['parentCwd'] == str(contract.records)
            and recipe['parentEnvironment'] == clean_environment(contract.records / 'launcher/home', contract.records / 'launcher/tmp')
            and recipe['ownerEnvironment'] == clean_environment(Path(recipe['ownerRoot']) / 'home', Path(recipe['ownerRoot']) / 'tmp')
            and len(recipe['ownerArgv']) == 11 and len(recipe['launcherArgv']) == 12,
            'Frozen parent9/owner11/launcher12 argv and clean ENV7')
    return contract


def prospective_request(contract):
    return {'schema': 'rank12-root280-case9/v1', 'case': 'case-9', 'originalRowIndex': 8,
        'originalInvocationOrdinal': 9, 'csvRow': 'C,false,OLDER_TAIL', 'reviewedHead': contract.reviewed_head,
        'capture': contract.parent, 'sourcePins': list(contract.sources.values())}


def validate_request(request, contract):
    require(type(request) is dict and set(request) == _helpers.REQUEST_KEYS
            and request['schema'] == 'rank12-root280-case9/v1' and request['case'] == 'case-9'
            and type(request['originalRowIndex']) is int and request['originalRowIndex'] == 8
            and type(request['originalInvocationOrdinal']) is int and request['originalInvocationOrdinal'] == 9
            and request['csvRow'] == 'C,false,OLDER_TAIL'
            and type(request['reviewedHead']) is str and re.fullmatch('[0-9a-f]{40}', request['reviewedHead'])
            and request['reviewedHead'] == contract.reviewed_head and request['capture'] == contract.parent
            and type(request['capture']) is dict and all(type(request['capture'][key]) is int
                for key in ('schema', 'runTimeoutSeconds', 'totalTimeoutSeconds')),
            'Exact exclusive ninth-row prospective request and publication snapshot')
    check_sources(request['sourcePins'], contract.sources)
    contract.check()
    return contract.sources


def static_admission(contract=None):
    contract = production_contract() if contract is None else contract
    contract.prefreeze()
    validate_request(prospective_request(contract), contract)
    # Close the read-only admission with the same snapshot, never a refreshed pin set.
    contract.check()
    contract.prefreeze()
    return {'schema': 'rank12-case9-static-admission/v1', 'passed': True,
        'sourceCount': len(contract.sources), 'priorDataCount': 3637, 'priorDataRoots': 129,
        'custodyPinCount': len(contract.control['custodyPins']), 'closedCustodyRoots': len(contract.control['closedRoots']),
        'preparedControlPairs': 6, 'absentRuntimePaths': len(contract.absent),
        'emptyRuntimeDirectories': len(contract.empty), 'historicalAbsentCount': 13,
        'futureAbsentPaths': len(contract.future_absent), 'futureEmptyDirectories': len(contract.future_empty),
        'dockerVerified': False, 'rootEnvelopeAvailable': False, 'runtimeAuthority': False,
        'originalResultAccredited': False, 'ownerCleanupAccredited': False, 'productionAuthority': False}


def execute_once(path, digest, contract, capture=None):
    """Consume before an explicit injected capture; no implicit real dispatch or retry."""
    require(callable(capture), 'Explicit capture callback required; static admission is not runtime authority')
    require(Path(path) == contract.request_path, 'Fixed ninth-row request locator')
    request, request_pin = checked_json(path, digest)
    sources = _helpers.strict_json(json.dumps(validate_request(request, contract), allow_nan=False))
    contract.virgin()
    require(source_pin(path) == request_pin, 'Request identity before consumption')
    write_new(contract.marker, {'schema': 'rank12-root280-once/v1', 'consumed': True,
                               'request': request_pin, 'noAutomaticRetry': True})
    failures, result = [], None
    try:
        contract.output.mkdir(mode=0o700)
        result = capture(request['capture'], contract.output)
    except (Exception, KeyboardInterrupt) as error:
        failures.append('Capture failed after consumption: ' + repr(error))
    try:
        contract.check()
        check_sources(list(sources.values()), sources)
        require(source_pin(path) == request_pin, 'Post-capture request identity drift')
    except (Exception, KeyboardInterrupt) as error:
        failures.append(str(error))
    receipt = {'schema': 'rank12-root280-capture/v1',
        'passed': type(result) is dict and result.get('passed') is True and not failures,
        'capture': result, 'failures': failures, 'sourceCount': len(sources), 'request': request_pin,
        'originalResultAccredited': False, 'ownerCleanupAccredited': False,
        'runtimeAuthority': False, 'productionAuthority': False}
    target = contract.output / 'rank-capture-receipt.json' if contract.output.is_dir() and not contract.output.is_symlink() \
        else contract.records / 'root280-capture-failure-01.json'
    write_new(target, receipt)
    return receipt


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    require(argv == ['--static-admission'], 'Only read-only static admission is exposed by this CLI')
    print(json.dumps(static_admission(), sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
