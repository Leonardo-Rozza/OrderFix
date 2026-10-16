"""Case-six-only current-source ROOT280 caller over the approved owned-session engine.

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
RECIPE_SHA = 'ba8a23a75b5f4135fe04f2cd66057ef6240dce3bc9ce942b630d2954a7af1378'
STAGING_SHA = '44b1f929f507561f5e26e420b40e5e04fe23e25d25275d94ce8463affb702bd6'
ARCHIVE = Path('/private/tmp/ordenfix-pro-root280-shared-ksagrxsy/original-outer-capture.py')
ARCHIVE_SHA = 'ed618024d7b954793c3243d1cd604c4cc404e1b0bb6ddb739cfe27d2f96dc147'
CURRENT_CONTROL_PIN = {'bytes': 10945,
 'path': '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case6-caller-73fcbd5405c24aad/current-source-admission-01.json',
 'sha256': '1ab14be7e122caa33152d21bb6d76e37e06603119d25219842fcd11762d29855',
 'stat8': {'st_ctime_ns': 1792156854000000000,
           'st_dev': 16777237,
           'st_gid': 20,
           'st_ino': 4475679,
           'st_mode': 33152,
           'st_mtime_ns': 1792156854000000000,
           'st_nlink': 1,
           'st_uid': 501}}
DONOR_PINS = [{'bytes': 27172,
  'path': '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case6-caller-73fcbd5405c24aad/donor-recovery_v41_rank_case5_outer_capture.py',
  'sha256': '17ae3624986b5f0531c18bb48491455a4103103ece2245a45a6e0d675e2ad042',
  'stat8': {'st_ctime_ns': 1792156853000000000,
            'st_dev': 16777237,
            'st_gid': 20,
            'st_ino': 4475677,
            'st_mode': 33152,
            'st_mtime_ns': 1792156853000000000,
            'st_nlink': 1,
            'st_uid': 501}},
 {'bytes': 16117,
  'path': '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case6-caller-73fcbd5405c24aad/donor-test_recovery_v41_rank_case5_outer_capture.py',
  'sha256': 'e083b1e1f7d8509b536f974d6ba1c0f79d108b0c8f44211f5b784f56dda04ccc',
  'stat8': {'st_ctime_ns': 1792156853000000000,
            'st_dev': 16777237,
            'st_gid': 20,
            'st_ino': 4475678,
            'st_mode': 33152,
            'st_mtime_ns': 1792156853000000000,
            'st_nlink': 1,
            'st_uid': 501}}]

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
        self.records = self.root / 'real-case-6-records'
        self.request_path = self.records / 'root280-request-01.json'
        self.marker = self.records / 'root280-once-01.json'
        self.output = self.records / 'root280-output-01'
        self.canonical = self.project / 'odd/tasks/pro-paid-period-cancellation.md'
        self.branch_ref = self.project / '.git/refs/heads/codex/v41-rank-launcher-integrated'
        self.head_file = self.project / '.git/HEAD'
        self.owner = self.root / ('rows/row-6/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-'
                                  'b86106497c0c47c4a2a89a4f1edd9bc8')
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
        self.prior_data = None
        self.expected_prior_data_count = 2515
        self.expected_prior_roots = [
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/real-case-1-records',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/real-case-1-records',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/rows/row-1/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-62512faf39994009a3b16791a6e505dd/observed',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/rows/row-1/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-62512faf39994009a3b16791a6e505dd/observed',
            '/private/tmp/ordenfix-pro-rank-case1-saved-proof-n6u0i3ku',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case1-saved-proof-n6u0i3ku',
            '/private/tmp/ordenfix-pro-rank12-case1-freeze-2ul3gc5l',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-case1-freeze-2ul3gc5l',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/real-case-2-records',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/real-case-2-records',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/rows/row-2/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-7dc5722ab40043df920bc114cb3451b9/observed',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/rows/row-2/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-7dc5722ab40043df920bc114cb3451b9/observed',
            '/private/tmp/ordenfix-pro-rank-case2-data-593886mj',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case2-data-593886mj',
            '/private/tmp/ordenfix-pro-rank-case2-caller-ti89s8g2',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case2-caller-ti89s8g2',
            '/private/tmp/ordenfix-pro-rank12-case2-freeze-xdvb3b9p',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-case2-freeze-xdvb3b9p',
            '/private/tmp/ordenfix-pro-rank-case2-saved-proof-43p9ban2',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case2-saved-proof-43p9ban2',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/real-case-3-records',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/real-case-3-records',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/rows/row-3/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-9a0dd86fa5e14b9a88354e265c5ce99b/observed',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/rows/row-3/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-9a0dd86fa5e14b9a88354e265c5ce99b/observed',
            '/private/tmp/ordenfix-pro-rank-case3-data-2gjv569o',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case3-data-2gjv569o',
            '/private/tmp/ordenfix-pro-rank-case3-caller-c7ryoa44',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case3-caller-c7ryoa44',
            '/private/tmp/ordenfix-pro-rank12-case3-freeze-3h_yjz8m',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-case3-freeze-3h_yjz8m',
            '/private/tmp/ordenfix-pro-rank-case3-saved-proof-ub7o__a2',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/ordenfix-pro-rank-case3-saved-proof-ub7o__a2',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/real-case-4-records',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/real-case-4-records',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/rows/row-4/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-b165e77c41074a1ebdf2c74e30d0eacb/observed',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/rows/row-4/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-b165e77c41074a1ebdf2c74e30d0eacb/observed',
            '/private/tmp/ordenfix-pro-rank-case4-data-owvxmf68',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case4-data-owvxmf68',
            '/private/tmp/ordenfix-pro-rank-case4-caller-e7sk5eoj',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case4-caller-e7sk5eoj',
            '/private/tmp/ordenfix-pro-rank12-case4-freeze-dne8k59g',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-case4-freeze-dne8k59g',
            '/private/tmp/ordenfix-pro-rank-case4-saved-proof-c9wikn87',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/ordenfix-pro-rank-case4-saved-proof-c9wikn87',
            '/private/tmp/ordenfix-pro-rank-case4-parent-readback-c5rqi3ic',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case4-parent-readback-c5rqi3ic',
            '/private/tmp/ordenfix-pro-rank-case4-delivery-kk787pjj',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case4-delivery-kk787pjj',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/real-case-5-records',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/real-case-5-records',
            '/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw/rows/row-5/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-b14ca1b2634f4c93ab749b8a397bb34f/observed',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-preparation-vcra7ulw/rows/row-5/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-b14ca1b2634f4c93ab749b8a397bb34f/observed',
            '/private/tmp/ordenfix-pro-rank-case5-data-t3imp2b5',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case5-data-t3imp2b5',
            '/private/tmp/ordenfix-pro-rank-case5-caller-36hf9pdm',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case5-caller-36hf9pdm',
            '/private/tmp/ordenfix-pro-rank-case5-delivery-515lwnhs',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case5-delivery-515lwnhs',
            '/private/tmp/ordenfix-pro-rank-case5-caller-delivery-pyavwlz0',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case5-caller-delivery-pyavwlz0',
            '/private/tmp/ordenfix-pro-rank-case5-native-oq9y7pcu',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case5-native-oq9y7pcu',
            '/private/tmp/ordenfix-pro-rank12-case5-freeze-0i5u1hh2',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank12-case5-freeze-0i5u1hh2',
            '/private/tmp/ordenfix-pro-rank-case5-saved-proof-jnqyonbs',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case5-saved-proof-jnqyonbs',
            '/private/tmp/ordenfix-pro-case5-final-readback-capture-je_y94s2',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/case5-final-readback-capture-je_y94s2',
            '/private/tmp/ordenfix-pro-rank-case5-original-delivery-l8ok49nd',
            '/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend/release-validation.local/rank-case5-original-delivery-l8ok49nd',
        ]
        self.control_path = Path(CURRENT_CONTROL_PIN['path'])
        self.control_pin = CURRENT_CONTROL_PIN
        self.provenance_pin = None
        self.recipe_pin = None
        self.expected_recovery_data = None


    def expected_sources(self):
        historical = unique_pins(self.recipe['fixedPins'])
        require(len(historical) == self.expected_historical_count, 'Complete historical SOURCE set')
        extra = unique_pins(self.recipe['extraSourcePins'])
        require(len(extra) == 188 and not set(extra) & set(historical)
                and str(self.canonical) not in extra and str(self.branch_ref) not in extra,
                'Exactly188 disjoint immutable extra SOURCE anchors')
        historical.update(extra)
        historical = self.project_current_sources(historical)
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

    @property
    def expected_recovery_data(self):
        # Freeze the expected DATA pins independently of a caller-owned mutable list.
        return None if self._recovery_data_json is None else strict_json(self._recovery_data_json)

    @expected_recovery_data.setter
    def expected_recovery_data(self, value):
        self._recovery_data_json = (None if value is None else
            json.dumps(value, sort_keys=True, allow_nan=False))

    def current_admission(self):
        """Check closed current provenance without clearing the historical gate.

        The fixed CLI control binds four records, not a relocation/search engine.
        Recovery audit DATA and archival origins are protected independently and
        can never substitute for the requested current SOURCE union.
        """
        require(source_pin(self.control_path) == self.control_pin,
                'Current admission DATA full identity drift')
        control, control_pin = checked_json(self.control_path, self.control_pin['sha256'])
        require(control_pin == self.control_pin, 'Current admission DATA identity')
        keys = {'schema', 'role', 'case', 'originalRowIndex', 'originalInvocationOrdinal',
                'csvRow', 'ownerNonce', 'historicalSourceGate',
                'currentSourceAdmissionPassed', 'executionAuthorized',
                'originalTestsModified', 'limitsChanged', 'recipe', 'provenance',
                'mappings', 'protectedData'}
        require(type(control) is dict and set(control) == keys
                and control['schema'] == 'rank12-case6-current-source-admission/v1'
                and control['role'] == 'DATA_CURRENT_SOURCE_ADMISSION_NOT_EXECUTION_AUTHORITY'
                and control['case'] == 'case-6'
                and type(control['originalRowIndex']) is int and control['originalRowIndex'] == 5
                and type(control['originalInvocationOrdinal']) is int
                and control['originalInvocationOrdinal'] == 6
                and control['csvRow'] == 'C,true,V41_NOT_LATEST'
                and control['ownerNonce'] == 'b86106497c0c47c4a2a89a4f1edd9bc8'
                and control['historicalSourceGate'] == 'OPEN_MISSING_4'
                and all(control[key] is False for key in ('currentSourceAdmissionPassed',
                    'executionAuthorized', 'originalTestsModified', 'limitsChanged')),
                'Closed sixth-case current admission, never execution authority')
        require(control['recipe'] == self.recipe_pin
                and control['provenance'] == self.provenance_pin,
                'Exact independent recipe/provenance bindings')
        for pin in unique_pins([control['recipe'], control['provenance']]).values():
            require(source_pin(pin['path']) == pin, 'Recipe/provenance full identity drift')
        provenance, pin = checked_json(self.provenance_pin['path'], self.provenance_pin['sha256'])
        require(pin == self.provenance_pin
                and provenance['schema'] == 'rank12-persistent-source-provenance/v1'
                and provenance['role'] == 'DATA_AUDIT_NOT_SOURCE_SUBSTITUTION'
                and provenance['historicalSourceGate'] == 'OPEN_MISSING_4'
                and provenance['currentSourceAdmissionPassed'] is False
                and provenance['executionAuthorized'] is False,
                'Historical recovery remains immutable and unaccredited')
        mappings = control['mappings']
        identities = {'generic-parent-capture', 'parent-stages',
                      'original-row1-request', 'v42-baseline'}
        require(type(mappings) is list and len(mappings) == 4
                and all(type(item) is dict and set(item) ==
                    {'identity', 'historicalMissingSource', 'archiveOrigin', 'newSource', 'usage'}
                    and type(item['identity']) is str for item in mappings)
                and {item['identity'] for item in mappings} == identities,
                'Exactly four closed unique recovered SOURCE mappings')
        original = provenance['mappings']
        require(type(original) is list and len(original) == 4
                and {item['identity'] for item in original} == identities,
                'Exactly four original provenance identities')
        originals = {item['identity']: item for item in original}
        all_paths, physical = set(), set()
        for item in mappings:
            recovered = originals[item['identity']]
            require(set(recovered) == {'identity', 'historicalMissingSource', 'archiveOrigin',
                    'newSource', 'bytesIdentical', 'contentRewritten', 'oldPathRestored',
                    'timestampsCopied', 'role'}
                    and recovered['bytesIdentical'] is True
                    and all(recovered[key] is False for key in
                            ('contentRewritten', 'oldPathRestored', 'timestampsCopied'))
                    and recovered['role'] == 'SOURCE_PAYLOAD_NOT_EXECUTION_AUTHORITY',
                    'Closed unchanged source recovery provenance')
            require(item['usage'] == ('RUNTIME_ENTRYPOINT'
                    if item['identity'] == 'generic-parent-capture' else 'PROVENANCE_SOURCE_ONLY'),
                    'Only generic parent capture is a runtime entrypoint')
            legs = [item[key] for key in ('historicalMissingSource', 'archiveOrigin', 'newSource')]
            pins = unique_pins(legs)
            require(len(pins) == 3 and not set(pins) & all_paths,
                    'Distinct exact old/archive/new paths, no alias or fallback')
            all_paths.update(pins)
            require(all(item[key] == recovered[key] for key in
                    ('historicalMissingSource', 'archiveOrigin', 'newSource'))
                    and len({(pin['bytes'], pin['sha256']) for pin in legs}) == 1,
                    'All four mappings exactly match immutable recovery provenance')
            require(not os.path.lexists(item['historicalMissingSource']['path']),
                    'Historical missing SOURCE must remain absent; old gate stays OPEN')
            for key in ('archiveOrigin', 'newSource'):
                expected = item[key]
                path = Path(expected['path'])
                require(all(not ancestor.is_symlink() for ancestor in (path,) + tuple(path.parents)),
                        'Recovered/archive path ancestry must not contain aliases')
                require(source_pin(path) == expected and not expected['stat8']['st_mode'] & 0o111,
                        'Ordinary non-executable recovered/archive full identity')
                identity = (expected['stat8']['st_dev'], expected['stat8']['st_ino'])
                require(identity not in physical, 'Recovered/archive physical alias')
                physical.add(identity)
        data = unique_pins(control['protectedData'])
        require(control['protectedData'] == self.expected_recovery_data
                and not set(data) & all_paths,
                'Exact independent recovery DATA custody')
        for pin in data.values():
            require(source_pin(pin['path']) == pin, 'Recovery audit DATA identity drift')
        parent = [item for item in mappings if item['identity'] == 'generic-parent-capture'][0]
        original_argv = self.recipe['parentArgv']
        require(type(original_argv) is list and len(original_argv) == 9
                and original_argv[3] == parent['historicalMissingSource']['path'],
                'Original parent vector binds historical generic capture only')
        projected_argv = list(original_argv)
        projected_argv[3] = parent['newSource']['path']
        require(self.parent == {'schema': 1, 'argv': projected_argv,
                'cwd': self.recipe['parentCwd'], 'environment': self.recipe['parentEnvironment'],
                'runTimeoutSeconds': 280, 'totalTimeoutSeconds': 280},
                'Only parent argv[3] changes; other eight arguments/cwd/ENV/caps frozen')
        return mappings

    def project_current_sources(self, historical):
        for mapping in self.current_admission():
            old, new = mapping['historicalMissingSource'], mapping['newSource']
            require(historical.get(old['path']) == old and new['path'] not in historical,
                    'Exact historical SOURCE projection, no omitted or extra substitution')
            del historical[old['path']]
            historical[new['path']] = new
        protected = {self.control_pin['path'], self.provenance_pin['path']}
        protected.update(pin['path'] for pin in self.expected_recovery_data)
        require(not protected & set(historical), 'Recovery DATA can never be SOURCE')
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
            require(any(Path(pin['path']).is_relative_to(Path(root))
                        for root in protection['roots']), 'Prior DATA inside exact custody roots')
            require(source_pin(pin['path']) == pin, 'Prior consumed DATA identity drift')
        return pins

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
    control, control_pin = checked_json(CURRENT_CONTROL_PIN['path'], CURRENT_CONTROL_PIN['sha256'])
    require(control_pin == CURRENT_CONTROL_PIN, 'Fixed current-source DATA control full identity')
    contract.recipe_pin = recipe_pin
    contract.provenance_pin = control['provenance']
    contract.expected_recovery_data = control['protectedData']
    require(recipe['extraSourcePinCount'] == 188 and recipe['completePriorSourceCount'] == 10078
            and len(recipe['extraSourcePins']) == 188, 'Closed complete prior SOURCE metadata')
    contract.prior_data = recipe['priorConsumedDataProtection']
    require(recipe['case'] == 'case-6' and recipe['originalRowIndex'] == 5
            and recipe['csvRow'] == 'C,true,V41_NOT_LATEST' and recipe['originalInvocationOrdinal'] == 6,
            'Historical sixth-row binding')
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
    parent_argv = list(recipe['parentArgv'])
    parent_argv[3] = next(item['newSource']['path'] for item in control['mappings']
                          if item['identity'] == 'generic-parent-capture')
    contract.parent = {'schema': 1, 'argv': parent_argv, 'cwd': recipe['parentCwd'],
        'environment': recipe['parentEnvironment'], 'runTimeoutSeconds': 280,
        'totalTimeoutSeconds': 280}
    pairs = staging['newPairs']
    require(len(pairs) == 5, 'Exactly five predecessor pairs and staging pair')
    expected_private = {str(contract.owner / name) for name in
        ('request.json', 'runtime-pins.json', 'real-case-6-enabled-spec-01.json')}
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
    replacements = {item['historicalMissingSource']['path']: item for item in contract.current_admission()}
    for pin in (recipe['parentWrapper'], recipe['requestDonor'], recipe['pythonAlias']['target']):
        if pin['path'] in replacements:
            mapping = replacements[pin['path']]
            require(pin == mapping['historicalMissingSource'], 'Exact historical dependency projection')
            pin = mapping['newSource']
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
        Path(__file__), PROJECT / 'scripts/test_recovery_v41_rank_case6_outer_capture.py'}
    for expected in DONOR_PINS:
        require(source_pin(expected['path']) == expected, 'Exact archived case-five donor')
        contract.anchors[expected['path']] = expected
    contract.import_paths = import_source_paths()
    return contract


def validate_request(request, contract):
    require(type(request) is dict and set(request) == REQUEST_KEYS
            and request['schema'] == 'rank12-root280-case6/v1' and request['case'] == 'case-6'
            and type(request['originalRowIndex']) is int and request['originalRowIndex'] == 5
            and type(request['originalInvocationOrdinal']) is int
            and request['originalInvocationOrdinal'] == 6 and request['csvRow'] == 'C,true,V41_NOT_LATEST',
            'Closed sixth original rank case only')
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
    require(len(argv) == 5 and argv[0] == '--execute-parent-approved-rank12-case6-root280'
            and argv[1] == '--request' and argv[3] == '--request-sha'
            and re.fullmatch('[0-9a-f]{64}', argv[4]), 'Closed case-six ROOT CLI')
    contract = production_contract()
    require(os.environ == clean_environment(contract.records / 'root280-home',
                                            contract.records / 'root280-tmp'), 'Clean ROOT ENV7')
    require(Path.cwd() == contract.records, 'Fixed ROOT cwd')
    result = execute_once(argv[2], argv[4], contract)
    print(json.dumps({'passed': result['passed'], 'originalResultAccredited': False}))
    return 0 if result['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
