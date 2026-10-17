"""Real case-nine guard regressions using disposable files, never runtime capture.

Only filesystem/hash globals and instance assembly are fixture-specific. Contract
methods, validators and all consequential helper functions remain unmodified.
The immutable recipe supplies read-only inherited provenance and prior DATA.
"""
import argparse
import copy
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest


P = Path(__file__).resolve().parents[1]
RECIPE_PATH = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw') / 'real-case-9-records/execution-recipe-01.json'
parser = argparse.ArgumentParser()
parser.add_argument('--candidate', required=True)
args, remaining = parser.parse_known_args()
spec = importlib.util.spec_from_file_location('case9_boundary_candidate', Path(args.candidate).resolve())
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
SEED = json.loads(RECIPE_PATH.read_bytes())


class ProductionBoundaryTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='case9-real-guards-', dir='/private/tmp')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.private = self.directory('private')
        self.durable = self.directory('durable')
        self.contract = m.Contract.__new__(m.Contract)
        self.contract.recipe = copy.deepcopy(SEED)
        self.contract.records = self.private / 'real-case-9-records'
        self.contract.request_path = self.contract.records / 'root280-request-01.json'
        self.contract.marker = self.contract.records / 'root280-once-01.json'
        self.contract.output = self.contract.records / 'root280-output-01'
        self.contract.reviewed_head = 'a' * 40
        self.contract.branch_ref = self.root / 'publication/branch'
        self.contract.head_file = self.root / 'publication/HEAD'
        self.file(self.contract.branch_ref, self.contract.reviewed_head + '\n')
        self.file(self.contract.head_file, 'ref: refs/heads/codex/v41-rank-launcher-integrated\n')
        self.contract.sources = {}
        for path in (self.contract.branch_ref, self.contract.head_file,
                     self.root / 'source/isolated.py'):
            if not path.exists():
                self.file(path, 'fixture SOURCE\n')
            pin = m.source_pin(path)
            self.contract.sources[str(path)] = pin
        self.contract._source_snapshot = json.dumps(self.contract.sources, sort_keys=True, allow_nan=False)
        self.contract.absent, self.contract.empty = [], []
        self.contract.future_absent, self.contract.future_empty = [], []
        self.future_owners = []
        for base in (self.private, self.durable):
            records = base / 'real-case-9-records'
            owner = base / 'owners/row-9'
            for name in ('home', 'tmp', 'observed', 'runtime'):
                self.contract.empty.append(self.directory(owner / name))
            for name in ('launcher/home', 'launcher/tmp'):
                self.contract.empty.append(self.directory(records / name))
            self.contract.absent.extend(records / name for name in (
                'root280-request-01.json', 'root280-home', 'root280-tmp', 'root280-once-01.json',
                'root280-output-01', 'parent-runtime-once.json', 'parent-runtime-output',
                'launcher/launcher-report-01.json', 'launcher/class-init.log',
                'launcher/launcher-report-01.json.watchdog', 'launcher/launcher-report-01.json.owner-stderr'))
            self.contract.absent.extend(owner / name for name in (
                'owner-once.json', 'once.json', 'owner-runtime-output', 'runtime-once.json'))
            for row in (10, 11, 12):
                future = base / ('owners/row-' + str(row))
                self.future_owners.append(future)
                for name in ('home', 'tmp', 'observed', 'runtime'):
                    self.contract.future_empty.append(self.directory(future / name))
                self.contract.future_absent.extend(future / name for name in (
                    'once.json', 'owner-once.json', 'runtime-once.json', 'owner-runtime-output',
                    'request.json', 'runtime-pins.json', 'real-case-' + str(row) + '-enabled-spec-01.json'))
                self.contract.future_absent.append(base / ('real-case-' + str(row) + '-records'))
        pairs = []
        for name in ('real-case-9-records/parent-input-01.json',
                     'real-case-9-records/execution-recipe-01.json',
                     'real-case-9-records/staging-validation-01.json',
                     'owners/row-9/request.json', 'owners/row-9/runtime-pins.json',
                     'owners/row-9/enabled-spec.json'):
            payload = json.dumps(self.contract.recipe, sort_keys=True) if 'execution-recipe' in name else '{}'
            pairs.append({'private': self.file(self.private / name, payload),
                          'durable': self.file(self.durable / name, payload)})
        recipe_pin = pairs[1]['private']
        custody = self.file(self.root / 'custody/index-and-ref', 'fixed custody')
        closed = self.file(self.root / 'closed/record.json', '{}')
        self.contract.control = {
            'recipe': recipe_pin, 'preparedPairs': pairs, 'custodyPins': [custody, closed],
            'closedRoots': [{'root': str(self.root / 'closed'), 'files': [closed['path']]}],
            'historicalAbsentPaths': self.contract.recipe['historicalAbsentPaths']}
        self.contract.control_pin = self.file(
            self.root / 'fixture-control.json', json.dumps(self.contract.control, sort_keys=True))
        globals_before = {key: getattr(m, key) for key in ('ROOT', 'DURABLE', 'CONTROL', 'CONTROL_SHA', 'RECIPE_SHA')}
        self.addCleanup(lambda: [setattr(m, key, value) for key, value in globals_before.items()])
        m.ROOT, m.DURABLE = self.private, self.durable
        m.CONTROL = Path(self.contract.control_pin['path'])
        m.CONTROL_SHA, m.RECIPE_SHA = self.contract.control_pin['sha256'], recipe_pin['sha256']

    def directory(self, path):
        path = Path(path)
        if not path.is_absolute():
            path = self.root / path
        path.mkdir(mode=0o700, parents=True, exist_ok=True)
        # mkdir(parents=True) uses the umask for intermediates; fix fixture dirs only.
        for directory in (path,) + tuple(path.parents):
            if directory == self.root.parent:
                break
            directory.chmod(0o700)
        return path

    def file(self, path, text):
        path = Path(path)
        self.directory(path.parent)
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(descriptor, 'w') as handle:
            handle.write(text)
        return m.source_pin(path)

    def healthy(self):
        self.assertIs(type(self.contract), m.Contract)
        self.assertEqual((len(self.contract.future_absent), len(self.contract.future_empty)), (48, 24))
        self.assertEqual((len(self.contract.absent), len(self.contract.empty)), (30, 12))
        self.contract.check()
        self.contract.prefreeze()

    def test_real_positive_controls_preserve_all_guard_methods(self):
        self.healthy()
        self.contract.check()
        self.contract.prefreeze()

    def test_present_future_paths_rejected_on_both_locations_and_all_future_rows(self):
        self.healthy()
        for owner in self.future_owners:
            with self.subTest(owner=owner):
                target = owner / 'once.json'
                self.file(target, 'fixture-only future consumption')
                try:
                    with self.assertRaisesRegex(ValueError, 'Historical, consumed or future runtime path is present'):
                        self.contract.check()
                finally:
                    target.unlink()

    def test_dirty_future_directories_rejected_on_both_locations_and_all_future_rows(self):
        self.healthy()
        for owner in self.future_owners:
            with self.subTest(owner=owner):
                target = owner / 'home/residue'
                self.file(target, 'fixture-only residue')
                try:
                    with self.assertRaisesRegex(ValueError, 'Ordinary empty 0700 directory'):
                        self.contract.check()
                finally:
                    target.unlink()

    def test_validly_repinned_source_cannot_replace_snapshot(self):
        self.healthy()
        replacement = self.file(self.root / 'source/replacement.py', 'valid new SOURCE')
        self.contract.sources[replacement['path']] = replacement
        # This is physically valid SOURCE, outside custody/closed inventories.
        # Only the captured snapshot rule must reject this otherwise valid union.
        m.check_sources(list(self.contract.sources.values()), self.contract.sources)
        with self.assertRaisesRegex(ValueError, 'Prospective SOURCE snapshot may not be repinned'):
            self.contract.check()

    def test_missing_prepared_records_rejected_on_both_locations(self):
        self.healthy()
        for base in (self.private, self.durable):
            with self.subTest(base=base):
                target = base / 'real-case-9-records/parent-input-01.json'
                saved = target.read_text()
                target.unlink()
                try:
                    with self.assertRaisesRegex(ValueError, 'Exact prepared records and launcher inventories'):
                        self.contract.prefreeze()
                finally:
                    self.file(target, saved)

    def test_extra_prepared_records_rejected_on_both_locations(self):
        self.healthy()
        for base in (self.private, self.durable):
            with self.subTest(base=base):
                target = base / 'real-case-9-records/unexpected.json'
                self.file(target, '{}')
                try:
                    with self.assertRaisesRegex(ValueError, 'Exact prepared records and launcher inventories'):
                        self.contract.prefreeze()
                finally:
                    target.unlink()

    def test_missing_launcher_inventory_rejected_on_both_locations(self):
        self.healthy()
        for base in (self.private, self.durable):
            for name in ('home', 'tmp'):
                with self.subTest(base=base, name=name):
                    launcher = base / 'real-case-9-records/launcher'
                    original, moved = launcher / name, launcher / ('renamed-' + name)
                    # Keep the independent empty-directory check valid at the
                    # moved fixture locator, isolating the exact inventory rule.
                    original.rename(moved)
                    empty_before = self.contract.empty
                    self.contract.empty = [moved if path == original else path for path in empty_before]
                    try:
                        with self.assertRaisesRegex(ValueError, 'Exact prepared records and launcher inventories'):
                            self.contract.prefreeze()
                    finally:
                        moved.rename(original)
                        self.contract.empty = empty_before

    def test_extra_launcher_inventory_rejected_on_both_locations(self):
        self.healthy()
        for base in (self.private, self.durable):
            with self.subTest(base=base):
                target = base / 'real-case-9-records/launcher/unexpected.json'
                self.file(target, '{}')
                try:
                    with self.assertRaisesRegex(ValueError, 'Exact prepared records and launcher inventories'):
                        self.contract.prefreeze()
                finally:
                    target.unlink()

    def test_records_and_launcher_modes_rejected_on_both_locations(self):
        self.healthy()
        for base in (self.private, self.durable):
            for name in ('real-case-9-records', 'real-case-9-records/launcher'):
                with self.subTest(base=base, name=name):
                    target = base / name
                    target.chmod(0o755)
                    try:
                        with self.assertRaisesRegex(ValueError, 'Ordinary private 0700 records/launcher directory'):
                            self.contract.prefreeze()
                    finally:
                        target.chmod(0o700)


if __name__ == '__main__':
    unittest.main(argv=[__file__] + remaining, verbosity=2)
