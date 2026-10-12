"""Read-only verification of the four consumed V41 cases, never a stage replay.

Pinned AST extraction retains the actual physical readers. This adapter has no
owner, JVM, Docker, SQL, subprocess, socket, thread, or receipt-writing capability.
The caller may preserve its returned JSON in a distinct correction receipt.
"""
import ast
import base64
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import types


FAMILY = Path('/private/tmp/ordenfix-pro-recovery-v41-final-m3daoe_6')
UNIT = Path(__file__).resolve().parents[1] / (
    'release-validation.local/recovery-v41-final-u1in8maq/fourcase-execution-01')
PRESERVATION = UNIT / 'actual-artifacts-preservation-01.json'
PRESERVATION_PIN = (1982321, '288d66360a473de81c7a41be217792257abcb692ca01a5ef8106d4beccee87e2')
POST = FAMILY / 'inputs/final-environment-post-runtime-bindings-01.json'
POST_PIN = (326423, 'e284bb2e2ef67a86ad86ae5e8ca8f88c3ef79a0b61eeee2dee67f44cc658bade')
SOURCE_PINS = {
    'parent_stages.py': (175802, '4ed4d8eafab0e7483cf2fb8d84aee59a60ea1a6d10f422416abee97737b66c4d'),
    'preflight_results.py': (7095, '668bfdeae87db7b4821b18586d05bc72097102c9271a86826ce1ca6748ed8f9d'),
    'preflight_guards.py': (21463, '1b91809d3b9a1dc0d0d3a9ad16782112c309139f287012ee16e3c3b27a536258'),
}
READERS = frozenset('''_final_physical_plan _stage_row_path capture_check
    epoch_registry_check events_check exact_json_value exec_check
    execution_witness_check final_family_root final_object final_pair_root
    junit_check migration_witness_check owner_check registry_prefix
    report_selection_check resources_check runtime_jvm_arguments
    runtime_selection_check'''.split())
GUARD_FUNCTIONS = frozenset('''require sha finite strict_pairs parse_json
    path_check pin check_pin read_json normalize_exclusions v41_runtime_data_check
    manifest_check unique_pins raw_exec_headers'''.split())
PARENT_CONSTANTS = frozenset('''SELECTED_CLASS FINAL_METHOD FINAL_PARAMETERS
    FINAL_SELECTION_MARKER FINAL_CSV CANDIDATE_PIN FORBIDDEN_INIT PG_SHA
    PG_RESOURCE_SHA PG_CODE_SOURCE'''.split())
STAT_FIELDS = ('st_dev', 'st_ino', 'st_mode', 'st_uid', 'st_gid', 'st_nlink',
               'st_mtime_ns', 'st_ctime_ns')


def _stat8(path):
    info = path.lstat()
    return {key: getattr(info, key) for key in STAT_FIELDS}


def _read_exact(path, size, digest, expected_stat=None):
    """Full byte/hash/stat identity, rejecting links before any content read."""
    path = Path(path)
    if not path.is_absolute() or str(path) != os.path.normpath(str(path)):
        raise ValueError('Normalized absolute evidence path required')
    for ancestor in (path, *path.parents):
        if stat.S_ISLNK(ancestor.lstat().st_mode):
            raise ValueError('Evidence symlink rejected')
    before = _stat8(path)
    if not stat.S_ISREG(before['st_mode']) or before['st_nlink'] != 1:
        raise ValueError('Ordinary singly linked evidence required')
    if expected_stat is not None and before != expected_stat:
        raise ValueError('Saved evidence stat identity changed: ' + str(path))
    raw = path.read_bytes()
    if (len(raw), hashlib.sha256(raw).hexdigest()) != (size, digest):
        raise ValueError('Saved evidence bytes/hash changed: ' + str(path))
    if before != _stat8(path):
        raise ValueError('Evidence changed during read')
    return raw, before


def _extract(raw, filename, names, namespace, constants=(), imports=False,
             classes=()):
    """Only the named inert pure callgraph is compiled; no stage/main imports."""
    tree = ast.parse(raw, filename=filename)
    selected = []
    found = set()
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name in names:
            selected.append(node)
            found.add(node.name)
        elif isinstance(node, ast.ClassDef) and node.name in classes:
            selected.append(node)
        elif isinstance(node, ast.Assign):
            assigned = {target.id for target in node.targets if isinstance(target, ast.Name)}
            if assigned & set(constants):
                selected.append(node)
        elif imports and isinstance(node, (ast.Import, ast.ImportFrom)):
            selected.append(node)
    if found != set(names):
        raise ValueError('Pinned pure callgraph incomplete')
    exec(compile(ast.Module(body=selected, type_ignores=[]), filename, 'exec'), namespace)
    return types.SimpleNamespace(**namespace)


class SavedEvidence:
    """Closed exact saved DATA plus the fifteen frozen SOURCE pins per owner."""

    def __init__(self):
        raw, receipt_stat = _read_exact(PRESERVATION, *PRESERVATION_PIN)
        receipt = json.loads(raw)
        if len(receipt['files']) != 1701 or receipt['originalsExecutedByThisCopy'] != 0:
            raise ValueError('Exact finite preservation receipt required')
        self.pins = {str(PRESERVATION): (*PRESERVATION_PIN, receipt_stat)}
        for item in receipt['files']:
            for name, field in (('source', 'sourceStat8'), ('copy', 'copyStat8')):
                self.pins[item[name]] = (item['bytes'], item['sha256'], item[field])
        raw, post_stat = _read_exact(POST, *POST_PIN)
        self.pins[str(POST)] = (*POST_PIN, post_stat)
        self.rows = json.loads(raw)['rows']
        if len(self.rows) != 4:
            raise ValueError('Four fixed saved bindings required')
        self.source_inputs = []
        for index, row in enumerate(self.rows):
            if row['originalRowIndex'] != index:
                raise ValueError('Exact ordered original rows required')
            family = row['python']
            root = Path(family['root'])
            if root.parent != FAMILY / 'rows' / ('row-%d' % (index + 1)):
                raise ValueError('Exact owner SOURCE family required')
            manifest_pin = family['manifest']
            if manifest_pin['path'] != str(root / 'freeze-manifest.json'):
                raise ValueError('Exact owner manifest required')
            manifest_raw, _ = _read_exact(Path(manifest_pin['path']),
                                         manifest_pin['bytes'], manifest_pin['sha256'])
            manifest = json.loads(manifest_raw)
            if manifest['dependencies'] != [] or len(manifest['files']) != 13:
                raise ValueError('Closed thirteen SOURCE members, no external dependencies')
            for pin in [*manifest['files'], manifest_pin, family['validation']]:
                path = Path(pin['path'])
                if path.parent != root:
                    raise ValueError('Foreign owner SOURCE pin rejected')
                _, identity = _read_exact(path, pin['bytes'], pin['sha256'])
                self.pins[str(path)] = (pin['bytes'], pin['sha256'], identity)
                self.source_inputs.append({**pin, 'stat8': identity})
        self.directories = {str(parent) for name in self.pins for parent in Path(name).parents}
        for row in self.rows:
            root = Path(row['python']['root'])
            self.directories.update(str(root / name) for name in ('observed', 'home', 'tmp'))
            self.directories.add(row['java']['root'])

    def read(self, path):
        name = str(path)
        if name not in self.pins:
            raise ValueError('Unadmitted evidence path rejected before lookup')
        size, digest, identity = self.pins[name]
        return _read_exact(Path(name), size, digest, identity)[0]

    def preserve(self):
        for name in self.pins:
            self.read(name)
        return {'savedFiles': 1701, 'ownerSourcePins': len(self.source_inputs),
                'fullByteHashStatBeforeAfterExact': True,
                'sourceInputPins': copy.deepcopy(self.source_inputs)}


def load_verifier():
    evidence = SavedEvidence()
    source = {name: _read_exact(FAMILY / 'parent' / name, *pin)[0]
              for name, pin in SOURCE_PINS.items()}
    # Correct only the two pinned pure guards in memory. The frozen parent and
    # its four failed receipts remain byte-exact; neither stage is invoked.
    corrections = (
        ('preflight_results.py',
         '"[test-template:" + method + "(" + parameters + ")]"',
         '"[test-template:" + method + "(" + parameters.replace(",", ", ") + ")]"'),
        ('parent_stages.py',
         'and owner["startedMonotonic"] <= lifecycle["launchDeadlineMonotonic"]\n'
         '              <= first_stop <= cleanup["finishedMonotonic"]',
         'and owner["startedMonotonic"] <= lifecycle["launchDeadlineMonotonic"]\n'
         '              and owner["startedMonotonic"] <= first_stop <= cleanup["finishedMonotonic"]'),
    )
    for name, old, new in corrections:
        old_bytes, new_bytes = old.encode(), new.encode()
        if source[name].count(old_bytes) != 1 or new_bytes in source[name]:
            raise ValueError('Exactly one pinned verifier correction required')
        corrected = source[name].replace(old_bytes, new_bytes, 1)
        inverse = corrected.replace(new_bytes, old_bytes, 1)
        if (len(inverse), hashlib.sha256(inverse).hexdigest()) != SOURCE_PINS[name]:
            raise ValueError('Correction inverse must match the exact frozen source')
        source[name] = corrected
    guard_tree = ast.parse(source['preflight_guards.py'])
    constants = {target.id for node in guard_tree.body if isinstance(node, ast.Assign)
                 for target in node.targets if isinstance(target, ast.Name)}
    guards = _extract(source['preflight_guards.py'], 'pinned:preflight_guards.py',
                      GUARD_FUNCTIONS, {}, constants, imports=True, classes=('GuardError',))
    namespace = guards.require.__globals__
    original_path_check = namespace['path_check']

    def closed_path_check(path, directory=False, private=False):
        allowed = evidence.directories if directory else evidence.pins
        guards.require(str(path) in allowed, 'Unadmitted evidence path rejected before lookup')
        return original_path_check(path, directory, private)

    def closed_json(path, max_bytes=16 * 1024 * 1024):
        raw = evidence.read(path)
        guards.require(len(raw) <= max_bytes, 'Bounded saved JSON required')
        return guards.parse_json(raw)

    namespace.update(path_check=closed_path_check, read_json=closed_json)
    guards.path_check, guards.read_json = closed_path_check, closed_json
    results = _extract(source['preflight_results.py'], 'pinned:preflight_results.py',
                       {'functional_result', '_selected_callback_status'}, {'g': guards},
                       constants=('COUNT_KEYS', 'PARAMETER_TYPES'))
    parent_namespace = {'g': guards, 'results': results, 'Path': Path, 're': re,
                        'base64': base64, 'copy': copy, 'json': json,
                        '__file__': str(FAMILY / 'parent/parent_stages.py')}
    parent = _extract(source['parent_stages.py'], 'pinned:parent_stages.py',
                      READERS, parent_namespace, PARENT_CONSTANTS)
    return types.SimpleNamespace(evidence=evidence, guards=guards, results=results,
                                 parent=parent)


def verify_saved(verifier=None):
    """Run the six inherited physical readers, not proof_stage or any producer."""
    verifier = verifier or load_verifier()
    p, g, evidence = verifier.parent, verifier.guards, verifier.evidence
    before = evidence.preserve()
    output = []
    for index, binding in enumerate(evidence.rows):
        root = FAMILY / 'physical' / ('row-%d' % (index + 1))
        row = {'rowIndex': index, 'functionalPassed': False,
               'lifecycleVerified': False, 'verificationFailures': []}
        try:
            report, functional = p.junit_check(binding, root)
            row['functionalPassed'] = functional
            outer = g.read_json(root / 'root-execution.json')
            p.capture_check(root, outer, functional)
            events = p.events_check(binding)
            bootstrap = [event for event in events if event['kind'] == 'bootstrap-requested']
            request = g.read_json(Path(binding['python']['root']) / 'request.json')
            g.require(len(bootstrap) == 1 and bootstrap[0]['nonce'] == request['nonce'],
                      'One actual correlated bootstrap, not isolated cleanup shape')
            owner, cleanup, deadline = p.owner_check(binding, events, outer)
            registry, operations = p.exec_check(binding, events, owner, cleanup)
            publication = p.resources_check(binding, events, cleanup)
            row.update(lifecycleVerified=True, actualMaintenanceExecCount=len(operations),
                       databaseCount=len(registry['databases']), dumpCount=len(registry['dumps']),
                       restoreCount=sum(item['phase'] == 'restore' for item in registry['attempts']),
                       earliestPythonCleanupDeadline=deadline, publication=publication,
                       actualJUnitCounts={key: report[key] for key in verifier.results.COUNT_KEYS},
                       readersCompleted=['junit_check', 'capture_check', 'events_check',
                                         'owner_check', 'exec_check', 'resources_check'])
        except (ValueError, OSError, KeyError, TypeError) as error:
            row['verificationFailures'].append({'error': repr(error)})
        output.append(row)
    after = evidence.preserve()
    if before != after:
        raise ValueError('Read-only saved evidence preservation changed')
    return {'schema': 1, 'scope': 'DISTINCT_OFFLINE_SAVED_V41_VERIFICATION',
            'originalsExecuted': 0, 'consumedProofStagesExecuted': 0,
            'frozenFailedReceiptsModified': False, 'sourceIntegration': False,
            'nativeApproval': False, 'productionAuthority': False,
            'preservation': after, 'rows': output,
            'allFourPassed': all(row['functionalPassed'] and row['lifecycleVerified']
                                 and not row['verificationFailures'] for row in output)}


if __name__ == '__main__':
    print(json.dumps(verify_saved(), indent=2, allow_nan=False))
