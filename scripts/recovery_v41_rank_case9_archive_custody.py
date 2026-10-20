"""Case-nine archive content resolution; never restore historical physical identity."""
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import time

P = Path('/Volumes/DiscoExtern/Desktop/mvgr-reparaciones-frontend')
U = P / 'release-validation.local/case9-final-parent-xyv2gggg'
FIELDS = ('st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_gid', 'st_nlink', 'st_mtime_ns', 'st_ctime_ns')
PIN_KEYS = {'path', 'bytes', 'sha256', 'stat8'}
LIMITS = {'cleanupSeconds': 30, 'execSeconds': 45, 'launchSeconds': 60, 'originalCaseSeconds': 120, 'ownerSeconds': 240, 'readChunkBytes': 65536, 'rootEnvelopeSeconds': 280, 'runTimeoutSeconds': 240, 'stderrCapBytes': 8388608, 'stdoutCapBytes': 8388608, 'totalTimeoutSeconds': 270}
PURE = {'jsonCapBytes': 16777216, 'readChunkBytes': 65536, 'runSeconds': 120, 'stderrCapBytes': 8388608, 'stdoutCapBytes': 8388608, 'totalSeconds': 150}
BASELINE_SHA = '2c58e6c4456ff3f060688e2704e6eadd8ce1d90cbafe18a39f8365b0c18aa77b'
REQUEST_SHA = '2a914e870f3bcf06741ea5a750af6cf85b539f8df58c380af07d45630f0bb7b3'
RECIPE_SHA = '7840d842ead8cfca506cb45ed66660fc2122375bf9fa4fd01c2c0df9f65fc568'
BASE_SHA = 'b6acb482d0ac672ead1748cc743ce6cf5550c9c847cb8cef4bff420c94407222'
STATUS_SHA = '376772025fd105eed25645346c461f0f91498f884cfc59f9b56169601d378712'
GAP_PATHS = set(['/private/tmp/ordenfix-pro-rank-case1-saved-proof-n6u0i3ku/case1-documentary-publication-index', '/private/tmp/ordenfix-pro-rank-case2-caller-ti89s8g2/case2-caller-publication-index', '/private/tmp/ordenfix-pro-rank-case2-data-593886mj/case2-data-documentary-index', '/private/tmp/ordenfix-pro-rank-case2-saved-proof-43p9ban2/case2-documentary-publication-index', '/private/tmp/ordenfix-pro-rank-case3-caller-c7ryoa44/case3-caller-publication-index', '/private/tmp/ordenfix-pro-rank-case3-data-2gjv569o/case3-data-documentary-index', '/private/tmp/ordenfix-pro-rank-case3-saved-proof-ub7o__a2/case3-documentary-publication-index', '/private/tmp/ordenfix-pro-rank-case4-data-owvxmf68/case4-data-documentary-index'])
CLAIMS = {'currentLiveCustodyPassed': False, 'historicalDataGapCount': 8, 'historicalIdentityRestored': False, 'mode': 'ARCHIVE_HISTORICAL_EXECUTION_NOT_LIVE_CUSTODY', 'originalReplayed': False, 'productionAuthority': False, 'runtimeLimitsChanged': False}
KEYS = {'schema', 'case', 'baseline', 'baseBindings', 'sourceRequest', 'recipe', 'parentStatus',
        'mappings', 'gaps', 'limits', 'pureCheckLimits', 'claims'}
START = time.monotonic()


def require(condition, message):
    if not condition:
        raise AssertionError(message)
    if time.monotonic() - START > 120:
        raise TimeoutError('Archive pure120 deadline')


def ordinary(path):
    path = Path(path)
    require(path.is_absolute() and '..' not in path.parts
            and all(not part.is_symlink() for part in (path,) + tuple(path.parents)),
            'Archive ordinary absolute path')
    return path


def validate_pin(value):
    require(type(value) is dict and set(value) == PIN_KEYS and type(value['path']) is str
            and Path(value['path']).is_absolute() and type(value['bytes']) is int and value['bytes'] >= 0
            and type(value['sha256']) is str and re.fullmatch('[0-9a-f]{64}', value['sha256'])
            and type(value['stat8']) is dict and set(value['stat8']) == set(FIELDS)
            and all(type(number) is int for number in value['stat8'].values()), 'Archive exact fullpin shape')


def unique(values):
    require(type(values) is list and len(values) <= 30000, 'Archive bounded pin list')
    result = {}
    for value in values:
        validate_pin(value)
        require(value['path'] not in result, 'Archive distinct logical identity')
        result[value['path']] = value
    return result


def pin(path):
    path = ordinary(path)
    before = path.lstat()
    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and before.st_uid in (0, 501),
            'Archive ordinary single-link file')
    digest, size = hashlib.sha256(), 0
    with os.fdopen(os.open(path, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as source:
        opened = os.fstat(source.fileno())
        require(all(getattr(before, key) == getattr(opened, key) for key in FIELDS + ('st_size',)),
                'Archive opened identity drift')
        for chunk in iter(lambda: source.read(65536), b''):
            size += len(chunk)
            digest.update(chunk)
            require(True, 'Archive streaming deadline')
        after = os.fstat(source.fileno())
    require(all(getattr(before, key) == getattr(after, key) == getattr(path.lstat(), key)
                for key in FIELDS + ('st_size',)) and size == before.st_size, 'Archive read identity drift')
    return {'path': str(path), 'bytes': size, 'sha256': digest.hexdigest(),
            'stat8': {key: getattr(before, key) for key in FIELDS}}


def checked_json(expected, digest=None):
    validate_pin(expected)
    require((digest is None or expected['sha256'] == digest) and pin(expected['path']) == expected,
            'Archive externally bound full identity/SHA')
    chunks, size = [], 0
    with Path(expected['path']).open('rb') as source:
        for chunk in iter(lambda: source.read(65536), b''):
            size += len(chunk)
            require(size <= 16777216, 'Archive JSON16MiB')
            chunks.append(chunk)
    raw = b''.join(chunks)
    require(size == expected['bytes'] and hashlib.sha256(raw).hexdigest() == expected['sha256']
            and pin(expected['path']) == expected, 'Archive JSON bytes/fullpin drift')
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'Archive duplicate JSON key')
            result[key] = value
        return result
    def invalid(value):
        raise ValueError('Archive nonfinite JSON: ' + value)
    return json.loads(raw, object_pairs_hook=pairs, parse_constant=invalid)


class ArchiveCustody:
    def __init__(self, manifest_pin, base, protected):
        self.manifest_pin = manifest_pin
        self.value = checked_json(manifest_pin)
        value = self.value
        require(type(value) is dict and set(value) == KEYS
                and value['schema'] == 'rank12-case9-archive-custody/v1'
                and value['case'] == 'case-9', 'Exact exclusive archive manifest schema')
        require(value['limits'] == LIMITS == base['limits'] and value['pureCheckLimits'] == PURE
                and value['claims'] == CLAIMS
                and all(type(value['limits'][key]) is int for key in LIMITS)
                and all(type(value['pureCheckLimits'][key]) is int for key in PURE)
                and all(type(value['claims'][key]) is type(CLAIMS[key]) for key in CLAIMS),
                'Archive unchanged limits and explicit non-live claims')
        baseline = checked_json(value['baseline'], BASELINE_SHA)
        admitted = checked_json(value['baseBindings'], BASE_SHA)
        request = checked_json(value['sourceRequest'], REQUEST_SHA)
        recipe = checked_json(value['recipe'], RECIPE_SHA)
        status = checked_json(value['parentStatus'], STATUS_SHA)
        require(admitted == base and value['baseBindings']['path'] == str(U / 'parent-bindings-01.json')
                and value['baseline']['path'] == str(U / 'locale-before-custody-01.json')
                and value['parentStatus']['path'] == str(U / 'parent-status-01.json'),
                'Archive immutable baseline/base/status locators')
        self.declared = unique(baseline['pins'])
        self.sources = unique(request['sourcePins'])
        self.prior = unique(recipe['priorConsumedDataProtection']['pins'])
        require(len(self.sources) == 10142 and len(self.prior) == 3637
                and not self.sources.keys() & self.prior.keys()
                and recipe['priorConsumedDataProtection'] == recipe['previousDataProtection']
                and all(type(recipe[key]) is int and recipe[key] == number for key, number in LIMITS.items()),
                'Archive complete logical SOURCE10142 and disjoint DATA3637 with unchanged limits')
        self.missing = unique(baseline['missingPinsUnwaived'])
        require(len(self.missing) == 4283 and len(self.declared) == 14472
                and all(self.declared.get(path) == expected and not os.path.lexists(path)
                        for path, expected in self.missing.items()), 'Archive exact missing-original baseline, no restoration')
        for reference in ('baseBindings', 'recipe', 'parentStatus'):
            expected = value[reference]
            require(self.declared.get(expected['path']) == expected, 'Archive admitted evidence reference')
        post_pin = self.declared[str(U / 'post-bindings-01.json')]
        post = checked_json(post_pin)
        require(post['baseBindings'] == value['baseBindings']
                and post['requestPair']['durable'] == value['sourceRequest'],
                'Archive frozen request is the exact admitted durable request-pair role')
        self.reference_pins = [value[key] for key in ('baseline', 'baseBindings', 'sourceRequest', 'recipe', 'parentStatus')] + [post_pin]
        self.runtime = unique(status['runtimePins'])
        require(len(self.runtime) == 80 and status['runtimePins'] == baseline['runtimePins']
                and status['originalExecutedOnce'] is True and status['originalReplayed'] is False,
                'Archive exact immutable eighty runtime identities')
        require(all(pin(path) == expected for path, expected in self.runtime.items()),
                'Archive runtime output must remain physically unchanged')
        require(type(value['mappings']) is list and len(value['mappings']) == 4275
                and type(value['gaps']) is list and len(value['gaps']) == 8, 'Archive exact mapping/gap counts')
        self.mappings, self.current, observed = {}, {}, {}
        counts = {'SOURCE': 0, 'PRIOR_DATA': 0}
        for row in value['mappings']:
            require(type(row) is dict and set(row) == {'historical', 'current', 'role', 'provenance'},
                    'Archive exact mapping shape')
            historical, current, role = row['historical'], row['current'], row['role']
            validate_pin(historical)
            validate_pin(current)
            path = historical['path']
            require(path not in self.mappings and self.missing.get(path) == historical
                    and role in counts, 'Archive exact unique historical mapping identity')
            roles = self.sources if role == 'SOURCE' else self.prior
            require(roles.get(path) == historical and current['path'] not in self.runtime
                    and (historical['bytes'], historical['sha256']) == (current['bytes'], current['sha256']),
                    'Archive role/content preserved; runtime substitution denied')
            self._provenance(row, roles)
            physical = current['path']
            require(observed.get(physical, current) == current, 'Archive conflicting current physical identity')
            if physical not in observed:
                require(pin(physical) == current, 'Archive current byte/hash/stat drift')
                observed[physical] = current
            self.mappings[path] = row
            self.current[physical] = current
            counts[role] += 1
        self.gaps = {}
        for row in value['gaps']:
            require(type(row) is dict and set(row) == {'historical', 'role', 'reason'}
                    and row['role'] == 'PRIOR_DATA'
                    and row['reason'] == 'HISTORICAL_TEMPORARY_GIT_PUBLICATION_INDEX_UNAVAILABLE',
                    'Archive explicit historical DATA gap schema')
            expected = row['historical']
            validate_pin(expected)
            path = expected['path']
            require(path in GAP_PATHS and path not in self.gaps and self.missing.get(path) == expected
                    and self.prior.get(path) == expected and path not in self.sources,
                    'Archive only the exact eight historical DATA indices')
            self.gaps[path] = expected
        require(set(self.gaps) == GAP_PATHS and not self.gaps.keys() & self.mappings.keys()
                and self.gaps.keys() | self.mappings.keys() == self.missing.keys()
                and counts == {'SOURCE': 3493, 'PRIOR_DATA': 782}, 'Archive complete role-preserving partition')
        require(all(protected.get(path) == expected for path, expected in unique(base['custodyPins']).items()),
                'Archive never rewrites the original admitted custody identities')

    def _provenance(self, row, roles):
        historical, current, origin = row['historical'], row['current'], row['provenance']
        require(type(origin) is dict, 'Archive explicit provenance')
        kind = origin.get('kind')
        if kind == 'admitted_counterpart':
            require(set(origin) == {'kind'} and roles.get(current['path']) == current
                    and self.declared.get(current['path']) == current, 'Archive already-admitted same-role counterpart')
        elif kind == 'git_blob':
            require(origin == {'kind': 'git_blob', 'commit': 'fb83779d66bda90ada5d78edb8286b16cf4a6daf',
                    'blob': '61e0e95db809ef671e0e657b1c752d18ed89072b'}
                    and row['role'] == 'SOURCE'
                    and historical['path'] == '/private/tmp/ordenfix-pro-frozen-spec-read-1bbqaymb/frozen/RecoveryOwnedOwnerDriver.java'
                    and historical['bytes'] == 28947
                    and historical['sha256'] == '0e7f5f6e573a00378430783e06d12068a7b5eb995756fffbbafc5904dd21fa1f'
                    and current['path'] == str(U / 'archive-source-01/RecoveryOwnedOwnerDriver.java'),
                    'Archive exact new Git-derived SOURCE projection')
        elif kind == 'embedded_json':
            require(set(origin) == {'kind', 'container', 'pointer', 'serialization'}
                    and row['role'] == 'SOURCE' and historical['path'] == '/private/tmp/rank12-compiler-cap-data.json'
                    and historical['bytes'] == 307
                    and historical['sha256'] == '7812d5ecd67a07efda129c327881ec984d7f38f8883c71e4454084549a34d9ff'
                    and current['path'] == str(U / 'archive-source-01/rank12-compiler-cap-data.json')
                    and origin['pointer'] == '/capEvidence'
                    and origin['serialization'] == 'json.dumps(sort_keys=True,indent=2)+newline'
                    and self.declared.get(origin['container']['path']) == origin['container'],
                    'Archive exact embedded compiler SOURCE projection')
            container = checked_json(origin['container'], 'b0db1c80a258a995d957c30dc24c4000c18ecfc0dc5b2fddd6159ae9f7749d1e')
            raw = (json.dumps(container['capEvidence'], sort_keys=True, indent=2) + '\n').encode()
            require(len(raw) == current['bytes'] and hashlib.sha256(raw).hexdigest() == current['sha256'],
                    'Archive exact embedded serialization bytes')
        else:
            require(False, 'Archive unknown provenance is not admitted')

    def check(self, expected):
        validate_pin(expected)
        path = expected['path']
        if path in self.mappings:
            row = self.mappings[path]
            require(expected == row['historical'] and not os.path.lexists(path)
                    and pin(row['current']['path']) == row['current'], 'Archive mapped content identity drift')
            return 'MAPPED_CONTENT_NOT_HISTORICAL_PHYSICAL_IDENTITY'
        if path in self.gaps:
            require(expected == self.gaps[path] and not os.path.lexists(path), 'Archive historical DATA gap drift')
            return 'EXPLICIT_HISTORICAL_DATA_GAP'
        require(pin(path) == expected, 'Archive unchanged original current physical identity')
        return 'CURRENT_ORIGINAL_PHYSICAL_IDENTITY'

    def source(self, logical_path, sources):
        path = str(logical_path)
        require(path in self.sources and sources.get(path) == self.sources[path] and path not in self.runtime,
                'Archive read/import only exact logical SOURCE, never runtime or DATA')
        expected = sources[path]
        self.check(expected)
        return self.mappings[path]['current'] if path in self.mappings else expected

    def check_manifest(self):
        require(pin(self.manifest_pin['path']) == self.manifest_pin, 'Archive manifest fullpin drift')
        require(all(pin(expected['path']) == expected for expected in self.reference_pins),
                'Archive immutable evidence references unchanged')
        require(all(pin(path) == expected for path, expected in self.runtime.items()),
                'Archive eighty original runtime identities remain unchanged')
        require(all(not os.path.lexists(path) for path in self.missing), 'Archive originals remain explicitly absent')

    def summary(self):
        self.check_manifest()
        return {'archiveManifest': self.manifest_pin, 'mappedMissingIdentities': len(self.mappings),
                'logicalHistoricalSourceCount': len(self.sources), 'sourceContentMappings': 3493,
                'priorDataContentMappings': 782, 'missingHistoricalData': list(self.gaps.values()),
                'missingOriginalPhysicalIdentities': len(self.missing), 'currentLiveCustodyPassed': False,
                'historicalIdentityRestored': False, 'currentPhysicalContentPins': list(self.current.values())}
