"""Real saved ninth-registry regressions; never execute or normalize the original."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import unittest

PROJECT = Path(__file__).resolve().parents[1]
PRIVATE = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw')
DURABLE = PROJECT / 'release-validation.local/rank12-preparation-vcra7ulw'
OWNER = 'rows/row-9/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-ca3647e6e83646a686934b2f5110ba70'
AUDIT = PROJECT / 'release-validation.local/case9-final-parent-xyv2gggg'
CANDIDATE = Path(os.environ.get('CASE9_SAVED_LOCALE_READER_CANDIDATE', str(
    PROJECT / 'scripts/recovery_v41_rank_case9_saved_locale_reader.py')))
spec = importlib.util.spec_from_file_location('case9_saved_locale_candidate', CANDIDATE)
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def read(path):
    chunks, size = [], 0
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(65536), b''):
            size += len(chunk)
            if size > 16777216:
                raise ValueError('Fixture JSON16MiB limit')
            chunks.append(chunk)
    return json.loads(b''.join(chunks))


class SavedLocaleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        before = read(AUDIT / 'locale-before-custody-01.json')
        admitted = before['allowlistDurableAdmittedCounterpart']
        historical = before['allowlistPrivateMissingExpected']
        if (admitted['bytes'], admitted['sha256']) != (historical['bytes'], historical['sha256']):
            raise AssertionError('Durable allowlist differs from original admitted bytes')
        if reader.pin(admitted['path']) != admitted:
            raise AssertionError('Durable admitted allowlist physical identity drift')
        cls.allow = read(DURABLE / OWNER / 'exec-allowlist.json')
        cls.registry = read(PRIVATE / OWNER / 'observed/owner-receipt.json')['recoveryRegistry']
        cls.bindings = read(AUDIT / 'post-bindings-01.json')
        cls.source = reader.pin(CANDIDATE.absolute())

    def test_unchanged_real_ninth_registry_passes(self):
        names = reader.validate_registry(self.registry, self.allow)
        self.assertEqual(names, [next(db['database'] for db in self.registry['databases']
                                     if db['role'] == role) for role in ('setup', 'migrated')])

    def test_phase_locales_remain_exact(self):
        for role, field, locale in (('setup', 'both', 'C'), ('migrated', 'both', 'en_US.utf8'),
                                    ('setup', 'collate', 'C'), ('migrated', 'ctype', 'en_US.utf8')):
            bad = copy.deepcopy(self.registry)
            database = next(db for db in bad['databases'] if db['role'] == role)
            for name in ('collate', 'ctype') if field == 'both' else (field,):
                database[name] = locale
            with self.subTest(role=role, field=field), self.assertRaises(AssertionError):
                reader.validate_registry(bad, self.allow)

    def test_createdb_locale_and_database_argv_match_each_phase(self):
        for ordinal, index, value in ((0, 4, '--lc-collate=C'), (1, 5, '--lc-ctype=en_US.utf8'),
                                       (0, -1, 'profile_' + '0' * 32)):
            bad = copy.deepcopy(self.registry)
            bad['attempts'][ordinal]['argv'][index] = value
            with self.subTest(ordinal=ordinal, index=index), self.assertRaises(AssertionError):
                reader.validate_registry(bad, self.allow)

    def test_database_roles_ordinals_and_identities_remain_strict(self):
        for mutation in ('roles', 'ordinal', 'attempt-order', 'duplicate-name'):
            bad = copy.deepcopy(self.registry)
            if mutation == 'roles':
                bad['databases'][0]['role'], bad['databases'][1]['role'] = 'migrated', 'setup'
            elif mutation == 'ordinal':
                bad['databases'][0]['createdAtOrdinal'] = 2
            elif mutation == 'attempt-order':
                bad['attempts'].reverse()
            else:
                bad['databases'][1]['database'] = bad['databases'][0]['database']
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                reader.validate_registry(bad, self.allow)

    def test_original_two_operation_budget_is_not_relaxed(self):
        for mutation in ('extra-attempt', 'extra-database', 'dump', 'incomplete'):
            bad = copy.deepcopy(self.registry)
            if mutation == 'extra-attempt':
                bad['attempts'].append(copy.deepcopy(bad['attempts'][0]))
            elif mutation == 'extra-database':
                bad['databases'].append(copy.deepcopy(bad['databases'][0]))
            elif mutation == 'dump':
                bad['dumps'] = ['unexpected.dump']
            else:
                bad['completedSteps'] = 1
            with self.subTest(mutation=mutation), self.assertRaises(AssertionError):
                reader.validate_registry(bad, self.allow)

    def bound(self):
        bindings = copy.deepcopy(self.bindings)
        if not any(pin['path'] == self.source['path'] for pin in bindings['preservedPins']):
            bindings['preservedPins'].append(copy.deepcopy(self.source))
        return bindings

    def test_executed_auditor_has_an_explicit_physical_source_binding(self):
        _, protected = reader.validate_bindings(self.bound())
        self.assertEqual(protected[self.source['path']], self.source)

    def test_missing_executed_auditor_source_binding_is_rejected(self):
        bindings = self.bound()
        bindings['preservedPins'] = [pin for pin in bindings['preservedPins']
                                    if pin['path'] != self.source['path']]
        with self.assertRaisesRegex(AssertionError, 'auditor'):
            reader.validate_bindings(bindings)

    def test_mismatched_executed_auditor_source_binding_is_rejected(self):
        bindings = self.bound()
        next(pin for pin in bindings['preservedPins'] if pin['path'] == self.source['path'])['sha256'] = '0' * 64
        with self.assertRaisesRegex(AssertionError, 'auditor'):
            reader.validate_bindings(bindings)


if __name__ == '__main__':
    unittest.main(verbosity=2)
