"""Frozen regression assertions over saved observations, never original replays."""
import ast
import copy
from pathlib import Path
import unittest
from unittest import mock

import recovery_v41_saved_verifier as adapter


class SavedVerifierTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.v = adapter.load_verifier()
        cls.reports = [cls.v.guards.read_json(adapter.FAMILY / 'physical' /
                       ('row-%d' % (index + 1)) / 'junit-report.json') for index in range(4)]

    def accepted(self, function, *args):
        try:
            return function(*args)
        except self.v.guards.GuardError as error:
            self.fail('Legitimate saved evidence rejected: ' + str(error))

    def owner_fixture(self, index=0):
        binding = self.v.evidence.rows[index]
        root = Path(binding['python']['root'])
        owner = self.v.guards.read_json(root / 'observed/owner-receipt.json')
        events = self.v.parent.events_check(binding)
        outer = self.v.guards.read_json(adapter.FAMILY / 'physical' /
                                     ('row-%d' % (index + 1)) / 'root-execution.json')
        return binding, owner, events, outer

    def owner_result(self, binding, owner, events, outer):
        original = self.v.guards.read_json
        owner_path = Path(binding['python']['root']) / 'observed/owner-receipt.json'

        def reader(path, *args, **kwargs):
            return copy.deepcopy(owner) if Path(path) == owner_path else original(path, *args, **kwargs)

        with mock.patch.object(self.v.guards, 'read_json', reader):
            return self.v.parent.owner_check(binding, events, outer)

    def test_all_four_actual_callback_reports_are_accepted(self):
        for index, report in enumerate(self.reports):
            with self.subTest(row=index):
                self.assertIs(self.accepted(self.v.results.functional_result, report), True)

    def test_all_four_actual_early_owner_closures_are_accepted(self):
        for index in range(4):
            with self.subTest(row=index):
                binding, owner, events, outer = self.owner_fixture(index)
                self.assertLess(owner['lifecycle']['firstStopMonotonic'],
                                owner['lifecycle']['launchDeadlineMonotonic'])
                self.accepted(self.owner_result, binding, owner, events, outer)

    def test_wrong_lineage_class_method_signature_ordinal_and_display_reject(self):
        for field, value in [('selectedClass', 'WrongClass'), ('selectedMethod', 'wrongMethod'),
                             ('selectedParameterTypes', 'java.lang.String,int'),
                             ('originalInvocationOrdinal', 2)]:
            report = copy.deepcopy(self.reports[0])
            report['selectedExecution'][field] = value
            with self.subTest(field=field), self.assertRaises(self.v.guards.GuardError):
                self.v.results.functional_result(report)
        for field, value in [('uniqueId', 'wrong'), ('templateUniqueId', 'wrong'),
                             ('invocationIndex', True), ('observedDisplayName', 'wrong')]:
            report = copy.deepcopy(self.reports[0])
            report['selectedExecution']['startedInvocations'][0][field] = value
            with self.subTest(callback=field), self.assertRaises(self.v.guards.GuardError):
                self.v.results.functional_result(report)

    def test_wrong_method_source_signature_rejects(self):
        report = copy.deepcopy(self.reports[0])
        report['selectedExecution']['startedInvocations'][0]['methodSource'][
            'methodParameterTypes'] = 'java.lang.String, int'
        with self.assertRaises(self.v.guards.GuardError):
            self.v.results.functional_result(report)

    def test_duplicate_missing_and_inconsistent_callbacks_reject(self):
        for mode in ('duplicate', 'missing', 'inconsistent'):
            report = copy.deepcopy(self.reports[0])
            execution = report['selectedExecution']
            if mode == 'duplicate':
                execution['startedInvocations'] *= 2
            elif mode == 'missing':
                execution['finishedInvocations'] = []
            else:
                execution['finishedInvocations'][0]['sourceEvidence'] = 'DIRECT_METHOD_SOURCE'
                execution['startedInvocations'][0]['sourceEvidence'] = 'EXACT_ADMITTED_TEMPLATE_ANCESTOR'
            with self.subTest(mode=mode), self.assertRaises(self.v.guards.GuardError):
                self.v.results.functional_result(report)

    def test_genuine_failed_callback_remains_functional_false(self):
        report = copy.deepcopy(self.reports[0])
        execution = report['selectedExecution']
        unique = execution['startedInvocations'][0]['uniqueId']
        execution.update(complete=False, succeededInvocations=[],
                         violations=['Non-successful selected invocation: ' + unique + ':FAILED'])
        report.update(testsSucceeded=0, testsFailed=1, testFailures=[unique + '\nAssertionError'])
        self.assertIs(self.accepted(self.v.results.functional_result, report), False)

    def test_deadline_overrun_extended_cleanup_inverted_and_nonfinite_reject(self):
        for mode in ('overrun', 'extended', 'inverted', 'nonfinite', 'unknown'):
            binding, owner, events, outer = self.owner_fixture()
            if mode == 'overrun':
                outer['finishedMonotonic'] = owner['strictCleanupDeadline'] + 1
            elif mode == 'extended':
                owner['strictCleanupDeadline'] = owner['lifecycle']['firstStopMonotonic'] + 31
            elif mode == 'inverted':
                owner['startedMonotonic'] = owner['lifecycle']['firstStopMonotonic'] + 1
            elif mode == 'nonfinite':
                owner['lifecycle']['launchDeadlineMonotonic'] = float('nan')
            else:
                owner['lifecycle']['unknownResources'] = True
            with self.subTest(mode=mode), self.assertRaises(self.v.guards.GuardError):
                self.owner_result(binding, owner, events, outer)

    def test_bootstrap_launch60_owner240_limits_are_unchanged(self):
        for mode in ('launch', 'owner', 'nonce'):
            binding, owner, events, outer = self.owner_fixture()
            bootstrap = next(item for item in events if item['kind'] == 'bootstrap-requested')
            if mode == 'launch':
                bootstrap['monotonic'] = bootstrap['launchDeadline'] - 61
            elif mode == 'owner':
                bootstrap['ownerDeadline'] += 1
            else:
                bootstrap['nonce'] = 'wrong-nonce'
            with self.subTest(mode=mode), self.assertRaises(self.v.guards.GuardError):
                self.owner_result(binding, owner, events, outer)

    def test_missing_bootstrap_cannot_gain_full_offline_lifecycle_credit(self):
        original = self.v.parent.events_check

        def without_bootstrap(binding):
            return [event for event in original(binding) if event['kind'] != 'bootstrap-requested']

        with mock.patch.object(self.v.parent, 'events_check', without_bootstrap):
            result = adapter.verify_saved(self.v)
        self.assertFalse(result['allFourPassed'])
        self.assertTrue(all(not row['lifecycleVerified'] for row in result['rows']))

    def test_exec45_overrun_and_changed_registry_reject(self):
        for mode in ('exec', 'registry'):
            binding, owner, events, outer = self.owner_fixture()
            cleanup = next(item for item in events if item['kind'] == 'owner-cleanup')
            if mode == 'exec':
                reservation = next(item for item in events if item['kind'] == 'exec-create-requested')
                reservation['deadline'] = reservation['monotonic'] + 46
            else:
                owner['recoveryRegistry']['completedSteps'] -= 1
            with self.subTest(mode=mode), self.assertRaises(self.v.guards.GuardError):
                self.v.parent.exec_check(binding, events, owner, cleanup)

    def test_actual_resource_limit_mutation_rejects(self):
        binding, owner, events, outer = self.owner_fixture()
        cleanup = next(item for item in events if item['kind'] == 'owner-cleanup')
        ready = next(item for item in events if item['kind'] == 'ready')
        ready['observation']['container']['HostConfig']['Memory'] += 1
        with self.assertRaises(self.v.guards.GuardError):
            self.v.parent.resources_check(binding, events, cleanup)

    def test_unadmitted_path_and_changed_pin_reject_before_lookup(self):
        with self.assertRaises(ValueError):
            self.v.evidence.read('/unadmitted/private/credentials')
        pin = copy.deepcopy(self.v.evidence.rows[0]['python']['manifest'])
        pin['sha256'] = '0' * 64
        with self.assertRaises(self.v.guards.GuardError):
            self.v.guards.check_pin(pin)

    def test_adapter_has_no_execution_or_mutation_capability(self):
        self.assertEqual(set(adapter.READERS), set(name for name in adapter.READERS
                                                  if hasattr(self.v.parent, name)))
        for name in ('proof_stage', 'release_stage', '_stage_bundle', 'source_gate'):
            self.assertFalse(hasattr(self.v.parent, name))
        for name in ('write_new', 'write_json_new'):
            self.assertFalse(hasattr(self.v.guards, name))
        tree = ast.parse(Path(adapter.__file__).read_bytes())
        modules = {alias.name for node in ast.walk(tree) if isinstance(node, ast.Import)
                   for alias in node.names}
        self.assertTrue(modules.isdisjoint({'subprocess', 'socket', 'threading'}))

    def test_all_six_inherited_readers_verify_four_saved_rows(self):
        result = adapter.verify_saved(self.v)
        self.assertTrue(result['allFourPassed'], result['rows'])
        self.assertEqual([row['actualMaintenanceExecCount'] for row in result['rows']], [23, 26, 23, 26])
        self.assertEqual([row['databaseCount'] for row in result['rows']], [23, 24, 23, 24])
        self.assertEqual([row['dumpCount'] for row in result['rows']], [0, 1, 0, 1])
        self.assertEqual([row['restoreCount'] for row in result['rows']], [0, 1, 0, 1])
        self.assertTrue(all(len(row['readersCompleted']) == 6 for row in result['rows']))
        self.assertEqual(result['originalsExecuted'], 0)
        self.assertEqual(result['consumedProofStagesExecuted'], 0)
        self.assertFalse(result['nativeApproval'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
