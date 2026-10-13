"""Independent completion-once regressions; no transport or original suite execution."""
import unittest

from http_framing import WireError
from recovery_registry import RecoveryRegistry


def row_zero_spec():
    """Declare the accepted original row independently of registry helpers/tests."""
    return {
        'schema': 1,
        'scope': 'v41-recovery-fixed-single-csv-rank-history',
        'selector': (
            'com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.RecoveryProfileDeletionIT'
            '#v41RecoveryRejectsRankOnlyHistoryDrift(java.lang.String,boolean,java.lang.String)'
        ),
        'selectionMarker': 'SINGLE_ORIGINAL_V41_RANK_HISTORY_CSV_CASE',
        'sourcePin': {
            'path': (
                '/private/tmp/ordenfix-pro-review-chain-fueuys_0/source/src/test/java/'
                'com/leonardorozza/mvgrreparacionesbackend/cuenta/recovery/'
                'RecoveryProfileDeletionIT.java'
            ),
            'bytes': 59145,
            'sha256': '40371265d3cd628985bf2bf40a29c2b5a755a2fed15ba6c857c69c9da3df750e',
        },
        'methodName': 'v41RecoveryRejectsRankOnlyHistoryDrift',
        'parameterTypes': ['java.lang.String', 'boolean', 'java.lang.String'],
        'csvSource': [
            'C,false,REORDER', 'C,true,REORDER',
            'en_US.utf8,false,REORDER', 'en_US.utf8,true,REORDER',
            'C,false,V41_NOT_LATEST', 'C,true,V41_NOT_LATEST',
            'en_US.utf8,false,V41_NOT_LATEST', 'en_US.utf8,true,V41_NOT_LATEST',
            'C,false,OLDER_TAIL', 'C,true,OLDER_TAIL',
            'en_US.utf8,false,OLDER_TAIL', 'en_US.utf8,true,OLDER_TAIL',
        ],
        'originalRowIndex': 0,
        'originalInvocationOrdinal': 1,
        'rankKind': 'REORDER',
        'maintenanceExec': True,
        'steps': ['case-1-setup-create', 'case-1-migrated-create'],
        'tokens': [7, 7],
        'vectors': [],
    }


class FailedCompletionChecks(unittest.TestCase):
    def assert_completion_is_single_shot(self, first_exit, second_exit):
        registry = RecoveryRegistry(row_zero_spec(), 'a' * 32)
        registry.reserve([
            'createdb', '--host=/var/run/postgresql', '--username=fixture',
            '--template=template0', '--lc-collate=en_US.utf8',
            '--lc-ctype=en_US.utf8', 'profile_' + '1' * 32,
        ])
        try:
            registry.complete(first_exit)
            before = registry.observation()
            self.assertEqual(before['attempts'][0]['exitCode'], first_exit)
            self.assertTrue(before['attempts'][0]['framingEOF'])
            self.assertEqual(before['attempts'][0]['completed'], first_exit == 0)
            self.assertEqual(before['databases'][0]['complete'], first_exit == 0)
            self.assertEqual(registry.failed, first_exit != 0)
            self.assertEqual(registry.ordinal, int(first_exit == 0))
            self.assertTrue(registry.lock.locked())

            with self.assertRaises(WireError):
                registry.complete(second_exit)

            self.assertEqual(registry.observation(), before)
            self.assertEqual(registry.failed, first_exit != 0)
            self.assertEqual(registry.ordinal, int(first_exit == 0))
            self.assertTrue(registry.lock.locked())
        finally:
            registry.release()
        self.assertFalse(registry.lock.locked())

    def test_failed_completion_cannot_be_rewritten_as_success(self):
        self.assert_completion_is_single_shot(9, 0)

    def test_failed_completion_cannot_be_rewritten_as_another_failure(self):
        self.assert_completion_is_single_shot(9, 7)

    def test_successful_completion_remains_single_shot(self):
        self.assert_completion_is_single_shot(0, 0)
