"""Pure rank-history registry checks; simulated exits do not prove physical EOF or SQL."""
import copy
import unittest

from http_framing import WireError
from recovery_registry import RecoveryRegistry

SOURCE = {
    'path': '/private/tmp/ordenfix-pro-review-chain-fueuys_0/source/src/test/java/'
            'com/leonardorozza/mvgrreparacionesbackend/cuenta/recovery/RecoveryProfileDeletionIT.java',
    'bytes': 59145,
    'sha256': '40371265d3cd628985bf2bf40a29c2b5a755a2fed15ba6c857c69c9da3df750e',
}
METHOD = 'v41RecoveryRejectsRankOnlyHistoryDrift'
SELECTOR = ('com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.RecoveryProfileDeletionIT'
            '#v41RecoveryRejectsRankOnlyHistoryDrift(java.lang.String,boolean,java.lang.String)')
ROWS = ('C,false,REORDER', 'C,true,REORDER', 'en_US.utf8,false,REORDER', 'en_US.utf8,true,REORDER',
        'C,false,V41_NOT_LATEST', 'C,true,V41_NOT_LATEST', 'en_US.utf8,false,V41_NOT_LATEST', 'en_US.utf8,true,V41_NOT_LATEST',
        'C,false,OLDER_TAIL', 'C,true,OLDER_TAIL', 'en_US.utf8,false,OLDER_TAIL', 'en_US.utf8,true,OLDER_TAIL')
KINDS = ('REORDER', 'V41_NOT_LATEST', 'OLDER_TAIL')
PREFIX = ['--host=/var/run/postgresql', '--username=fixture']
NONCE = 'a' * 32


def spec_for(index):
    # Independent original-row expectations; implementation helpers are never consulted.
    phases = ['setup-create', 'migrated-create']
    tokens = [7, 7]
    if index % 2 == 1:
        phases += ['dump', 'restored-create', 'restore']
        tokens += [6, 7, 8]
    return dict(schema=1, scope='v41-recovery-fixed-single-csv-rank-history', selector=SELECTOR,
                selectionMarker='SINGLE_ORIGINAL_V41_RANK_HISTORY_CSV_CASE',
                sourcePin=copy.deepcopy(SOURCE), methodName=METHOD,
                parameterTypes=['java.lang.String', 'boolean', 'java.lang.String'], csvSource=list(ROWS),
                originalRowIndex=index, originalInvocationOrdinal=index + 1, rankKind=KINDS[index // 4],
                maintenanceExec=True, steps=['case-%d-%s' % (index + 1, phase) for phase in phases],
                tokens=tokens, vectors=[])


def name(index, serial):
    return 'profile_' + ('%032x' % (1000 * (index + 1) + serial))


def operations(index):
    locale = 'C' if index % 4 < 2 else 'en_US.utf8'
    setup, migrated, restored = (name(index, n) for n in (1, 2, 3))
    def create(database, selected):
        return ['createdb', *PREFIX, '--template=template0',
                '--lc-collate=' + selected, '--lc-ctype=' + selected, database]
    result = [create(setup, 'en_US.utf8'), create(migrated, locale)]
    if index % 2 == 1:
        path = '/tmp/00000000-0000-0000-0000-%012x.dump' % (index + 1)
        result += [['pg_dump', *PREFIX, '--dbname=' + migrated, '--format=custom', '--file=' + path],
                   create(restored, locale),
                   ['pg_restore', *PREFIX, '--dbname=' + restored, '--exit-on-error',
                    '--single-transaction', '--no-owner', path]]
    return result


class RankRegistryChecks(unittest.TestCase):
    def registry(self, index=0, spec=None):
        try:
            return RecoveryRegistry(spec_for(index) if spec is None else spec, NONCE)
        except WireError as error:
            self.fail('Valid fixed rank12 metadata must be admitted before operations: ' + str(error))

    def advance(self, registry, argv):
        attempt = registry.reserve(argv)
        registry.complete(0)
        registry.release()
        return attempt

    def prefix(self, index, count):
        registry = self.registry(index)
        for argv in operations(index)[:count]:
            self.advance(registry, argv)
        return registry

    def denied(self, registry, argv):
        before = registry.observation()
        with self.assertRaises(WireError):
            registry.reserve(argv)
        self.assertEqual(registry.observation(), before)
        self.assertFalse(registry.lock.locked())

    def assert_plan(self, index):
        registry = self.registry(index)
        expected, commands = spec_for(index), operations(index)
        restored, kind = index % 2 == 1, KINDS[index // 4]
        self.assertEqual(len(commands), 5 if restored else 2)
        self.assertEqual([len(argv) for argv in commands], expected['tokens'])
        for ordinal, argv in enumerate(commands, 1):
            attempt = self.advance(registry, argv)
            self.assertEqual(attempt['ordinal'], ordinal)
            self.assertEqual(attempt['caseOrdinal'], index + 1)
            self.assertEqual(attempt['rankKind'], kind)
            self.assertEqual(attempt['step'], expected['steps'][ordinal - 1])
            self.assertEqual(attempt['argv'], argv)
            current = registry.observation()
            self.assertEqual(current['completedSteps'], ordinal)
            self.assertEqual(current['complete'], ordinal == len(commands))
        observed = registry.observation()
        for key in ('originalRowIndex', 'originalInvocationOrdinal', 'rankKind', 'csvSource',
                    'sourcePin', 'parameterTypes', 'selector', 'scope', 'selectionMarker', 'methodName'):
            self.assertEqual(observed[key], expected[key])
        self.assertFalse(observed['failed'])
        self.assertIsNone(observed['nextOrdinal'])
        self.assertEqual(len(observed['attempts']), len(commands))
        self.assertTrue(all(a['completed'] and a['framingEOF'] and type(a['exitCode']) is int
                            and a['exitCode'] == 0 for a in observed['attempts']))
        databases = observed['databases']
        self.assertEqual(len(databases), 3 if restored else 2)
        self.assertEqual([d['role'] for d in databases], ['setup', 'migrated', 'restored'] if restored else ['setup', 'migrated'])
        self.assertEqual(len({d['database'] for d in databases}), len(databases))
        self.assertTrue(all(d['complete'] and d['caseOrdinal'] == index + 1 and d['rankKind'] == kind for d in databases))
        self.assertFalse(any('baselineDatabase' in d or 'cloneOrdinal' in d for d in databases))
        selected = 'C' if index % 4 < 2 else 'en_US.utf8'
        self.assertEqual([(d['collate'], d['ctype']) for d in databases], [('en_US.utf8', 'en_US.utf8')]
                         + [(selected, selected)] * (2 if restored else 1))
        dumps = observed['dumps']
        self.assertEqual(len(dumps), 1 if restored else 0)
        if dumps:
            self.assertEqual(dumps[0]['sourceDatabase'], name(index, 2))
            self.assertEqual(dumps[0]['targetDatabase'], name(index, 3))
            self.assertEqual(dumps[0]['restoredAtOrdinal'], 5)
            self.assertEqual(dumps[0]['rankKind'], kind)
            self.assertTrue(dumps[0]['complete'])
            self.assertTrue(databases[-1]['restored'])
        self.denied(registry, commands[-1])
        self.denied(registry, ['createdb', *PREFIX, '--template=' + name(index, 2), name(index, 900)])

    def test_case_0(self): self.assert_plan(0)
    def test_case_1(self): self.assert_plan(1)
    def test_case_2(self): self.assert_plan(2)
    def test_case_3(self): self.assert_plan(3)
    def test_case_4(self): self.assert_plan(4)
    def test_case_5(self): self.assert_plan(5)
    def test_case_6(self): self.assert_plan(6)
    def test_case_7(self): self.assert_plan(7)
    def test_case_8(self): self.assert_plan(8)
    def test_case_9(self): self.assert_plan(9)
    def test_case_10(self): self.assert_plan(10)
    def test_case_11(self): self.assert_plan(11)

    def test_malformed_metadata_is_rejected_before_reservation(self):
        mutations = []
        for value in (True, False, '0', -1, 12, 0.0): mutations.append(('originalRowIndex', value))
        for value in (True, False, '1', 2, 1.0): mutations.append(('originalInvocationOrdinal', value))
        mutations += [('schema', True), ('schema', 1.0), ('scope', 'v41-recovery-fixed-single-csv-catalog-drift'),
                      ('selector', SELECTOR + ' '), ('selectionMarker', 'SINGLE_ORIGINAL_V41_CATALOG_DRIFT_CSV_CASE'),
                      ('methodName', 'v41RecoveryRejectsCatalogAclAndHistoryDrift'),
                      ('parameterTypes', ['java.lang.String', 'boolean']),
                      ('parameterTypes', ['java.lang.String', 'java.lang.Boolean', 'java.lang.String']),
                      ('csvSource', list(reversed(ROWS))), ('csvSource', list(ROWS[:4])),
                      ('maintenanceExec', 1), ('vectors', ['extra']), ('sourcePin', dict(SOURCE, sha256='0' * 64)),
                      ('sourcePin', dict(SOURCE, bytes=59145.0)), ('rankKind', 'COLUMN'), ('rankKind', True),
                      ('tokens', [7, 7.0]), ('tokens', [7]), ('tokens', [7, 7, 5]),
                      ('steps', spec_for(0)['steps'] + ['case-1-clone-COLUMN']),
                      ('steps', list(reversed(spec_for(0)['steps'])))]
        for key, value in mutations:
            with self.subTest(key=key, value=value):
                invalid = spec_for(0); invalid[key] = value
                with self.assertRaises(WireError): RecoveryRegistry(invalid, NONCE)
        for index in range(12):
            for key, value in [('rankKind', KINDS[(index // 4 + 1) % 3]),
                               ('originalInvocationOrdinal', (index + 1) % 12 + 1)]:
                with self.subTest(index=index, key=key):
                    invalid = spec_for(index); invalid[key] = value
                    with self.assertRaises(WireError): RecoveryRegistry(invalid, NONCE)
        for value in (None, [], 'spec', dict(spec_for(0), extra=True)):
            with self.assertRaises(WireError): RecoveryRegistry(value, NONCE)

    def test_nonce_must_be_canonical_but_not_database_related(self):
        for nonce in ('', 'a' * 31, 'A' * 32, None, True):
            with self.subTest(nonce=nonce), self.assertRaises(WireError): RecoveryRegistry(spec_for(0), nonce)
        registry = self.registry(); self.advance(registry, operations(0)[0])
        self.assertNotIn(NONCE, registry.observation()['databases'][0]['database'])

    def test_create_flags_order_count_names_and_locale(self):
        correct = operations(0)[0]
        variants = [correct + ['extra'], correct[:-1], tuple(correct), ['dropdb'] + correct[1:],
                    correct[:1] + list(reversed(correct[1:3])) + correct[3:],
                    correct[:3] + ['--template=postgres'] + correct[4:],
                    correct[:4] + ['--lc-collate=C'] + correct[5:]]
        for invalid in ('profile_' + 'A' * 32, 'profile_' + 'a' * 31, 'foreign', True): variants.append(correct[:-1] + [invalid])
        for argv in variants:
            with self.subTest(argv=argv): self.denied(self.registry(), argv)
        for index in range(12):
            registry = self.prefix(index, 1); wrong = operations(index)[1]
            wrong[5] = '--lc-ctype=' + ('en_US.utf8' if index % 4 < 2 else 'C')
            self.denied(registry, wrong); self.denied(registry, operations(index)[0])
            self.denied(registry, operations(index)[1][:-1] + [name(index, 1)])

    def test_no_catalog_clone_capability_before_or_after_completion(self):
        for index in range(12):
            for count in (0, 1, len(operations(index))):
                with self.subTest(index=index, count=count):
                    registry = self.prefix(index, count)
                    self.denied(registry, ['createdb', *PREFIX, '--template=' + name(index, 2), name(index, 900)])
                    invalid = spec_for(index); invalid['steps'].append('case-%d-clone-COLUMN' % (index + 1)); invalid['tokens'].append(5)
                    with self.assertRaises(WireError): RecoveryRegistry(invalid, NONCE)

    def test_dump_source_path_flags_and_completion_guards(self):
        for index in (1, 3, 5, 7, 9, 11):
            registry = self.prefix(index, 2); argv = operations(index)[2]
            for source in (name(index, 1), name((index + 1) % 12, 2), 'foreign'):
                self.denied(registry, argv[:3] + ['--dbname=' + source] + argv[4:])
            for path in ('/tmp/not-a-uuid.dump', '/outside/00000000-0000-0000-0000-000000000002.dump',
                         '/tmp/AAAAAAAA-0000-0000-0000-000000000002.dump',
                         '/tmp/00000000-0000-0000-0000-000000000002.dump/../file'):
                self.denied(registry, argv[:-1] + ['--file=' + path])
            self.denied(registry, argv[:4] + ['--format=plain'] + argv[5:])
            registry.databases[1]['complete'] = False; self.denied(registry, argv); registry.databases[1]['complete'] = True
            registry.dumps.append(dict(file=argv[5][7:], role='foreign', caseOrdinal=99)); self.denied(registry, argv)

    def test_restored_target_and_restore_linkage(self):
        for index in (1, 3, 5, 7, 9, 11):
            registry = self.prefix(index, 3); create = operations(index)[3]
            registry.dumps[0]['complete'] = False; self.denied(registry, create); registry.dumps[0]['complete'] = True
            self.denied(registry, create[:-1] + [name(index, 2)]); self.advance(registry, create)
            restore = operations(index)[4]
            for argv in (restore[:3] + ['--dbname=' + name(index, 2)] + restore[4:],
                         restore[:-1] + ['/tmp/00000000-0000-0000-0000-000000000099.dump'],
                         restore[:4] + list(reversed(restore[4:7])) + restore[7:], restore[:-1], restore + ['--clean']):
                self.denied(registry, argv)
            registry.databases[-1]['complete'] = False; self.denied(registry, restore); registry.databases[-1]['complete'] = True
            registry.dumps[0]['targetDatabase'] = name(index, 2); self.denied(registry, restore)
            registry.dumps[0]['targetDatabase'] = name(index, 3); self.advance(registry, restore); self.denied(registry, restore)

    def test_concurrent_reservation_preserves_active_lock(self):
        registry = self.registry(); registry.reserve(operations(0)[0]); before = registry.observation()
        with self.assertRaises(WireError): registry.reserve(operations(0)[0])
        self.assertTrue(registry.lock.locked()); self.assertEqual(registry.observation(), before)
        registry.complete(0); registry.release(); self.assertFalse(registry.failed)

    def test_complete_requires_active_genuine_integer_and_no_duplicate(self):
        registry = self.registry()
        with self.assertRaises(WireError): registry.complete(0)
        registry.reserve(operations(0)[0])
        for code in (True, False, '0', 0.0, None):
            before = registry.observation()
            with self.subTest(code=code), self.assertRaises(WireError): registry.complete(code)
            self.assertEqual(registry.observation(), before)
        registry.complete(0); before = registry.observation()
        with self.assertRaises(WireError): registry.complete(0)
        self.assertEqual(registry.observation(), before); registry.release()
        with self.assertRaises(WireError): registry.release()

    def test_nonzero_exit_and_incomplete_release_poison_without_retry(self):
        for finish in (False, True):
            registry = self.registry(); registry.reserve(operations(0)[0])
            if finish: registry.complete(9)
            registry.release(); observed = registry.observation()
            self.assertTrue(observed['failed']); self.assertFalse(observed['complete']); self.assertEqual(observed['completedSteps'], 0)
            self.assertFalse(observed['attempts'][0]['completed'])
            self.denied(registry, operations(0)[0]); self.denied(registry, operations(0)[1])

    def test_final_operation_is_required_and_no_extra_ordinal(self):
        for index in range(12):
            commands = operations(index); registry = self.prefix(index, len(commands) - 1)
            self.assertFalse(registry.observation()['complete']); self.assertEqual(registry.observation()['nextOrdinal'], len(commands))
            self.advance(registry, commands[-1]); self.assertTrue(registry.observation()['complete'])
            self.denied(registry, ['createdb', *PREFIX, '--template=' + name(index, 2), name(index, 900)])

    def test_observation_input_and_reserved_attempt_are_deep_copies(self):
        original = spec_for(9); registry = self.registry(9, original)
        original['sourcePin']['sha256'] = 'f' * 64; original['steps'].clear(); original['tokens'].clear(); original['rankKind'] = 'COLUMN'
        self.assertEqual(registry.spec, spec_for(9)); command = operations(9)[0]; attempt = registry.reserve(command)
        command[-1] = 'foreign'; attempt['argv'].clear(); attempt['ordinal'] = 999; attempt['rankKind'] = 'COLUMN'
        observed = registry.observation(); observed['sourcePin'].clear(); observed['databases'][0]['database'] = 'foreign'; observed['attempts'][0]['argv'].clear()
        self.assertEqual(registry.observation()['attempts'][0]['argv'], operations(9)[0]); self.assertEqual(registry.observation()['sourcePin'], SOURCE)
        self.assertEqual(registry.observation()['databases'][0]['database'], name(9, 1)); self.assertEqual(registry.observation()['rankKind'], 'OLDER_TAIL')
        registry.complete(0); registry.release()


if __name__ == '__main__':
    unittest.main(verbosity=2)
