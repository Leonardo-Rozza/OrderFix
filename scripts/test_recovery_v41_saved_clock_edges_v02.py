"""Separate frozen clock-edge regressions; consumed evidence is never edited."""
import unittest

import recovery_v41_saved_verifier as adapter
import test_recovery_v41_saved_verifier as regression


class SavedClockEdgeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.v = adapter.load_verifier()

    owner_fixture = regression.SavedVerifierTests.owner_fixture
    owner_result = regression.SavedVerifierTests.owner_result
    accepted = regression.SavedVerifierTests.accepted

    @staticmethod
    def shift_stop_closure(owner, events, outer, delta):
        """Shift only stop/closure clocks in memory, leaving launch/owner budgets."""
        owner['strictCleanupDeadline'] += delta
        owner['finishedMonotonic'] += delta
        for key in ('firstStopMonotonic', 'cleanupDeadlineMonotonic', 'finishedMonotonic'):
            owner['lifecycle'][key] += delta
        cleanup = next(event for event in events if event['kind'] == 'owner-cleanup')
        for key in ('firstStop', 'strictCleanupDeadline', 'finishedMonotonic', 'monotonic'):
            cleanup[key] += delta
        outer['finishedMonotonic'] += delta

    def test_normal_early_stop_is_not_a_launch_failure(self):
        binding, owner, events, outer = self.owner_fixture()
        self.assertLess(owner['lifecycle']['firstStopMonotonic'],
                        owner['lifecycle']['launchDeadlineMonotonic'])
        self.accepted(self.owner_result, binding, owner, events, outer)

    def test_valid_stop_after_launch60_is_still_within_owner240(self):
        binding, owner, events, outer = self.owner_fixture()
        bootstrap = next(event for event in events if event['kind'] == 'bootstrap-requested')
        delta = bootstrap['launchDeadline'] + 1 - owner['lifecycle']['firstStopMonotonic']
        self.shift_stop_closure(owner, events, outer, delta)
        self.assertGreater(owner['lifecycle']['firstStopMonotonic'], bootstrap['launchDeadline'])
        self.assertLess(owner['lifecycle']['firstStopMonotonic'], bootstrap['ownerDeadline'])
        self.accepted(self.owner_result, binding, owner, events, outer)

    def test_stop_after_owner240_rejects_even_with_timely_cleanup(self):
        binding, owner, events, outer = self.owner_fixture()
        bootstrap = next(event for event in events if event['kind'] == 'bootstrap-requested')
        delta = bootstrap['ownerDeadline'] + 1 - owner['lifecycle']['firstStopMonotonic']
        self.shift_stop_closure(owner, events, outer, delta)
        self.assertLess(outer['finishedMonotonic'], owner['strictCleanupDeadline'])
        with self.assertRaises(self.v.guards.GuardError):
            self.owner_result(binding, owner, events, outer)


if __name__ == '__main__':
    unittest.main(verbosity=2)
