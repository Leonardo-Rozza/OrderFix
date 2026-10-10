"""FILE-only regression using the explicitly provisioned private source fixture.

Run the unchanged test copy beside recovery_legacy_report_test_context.py with
Python 3.10 -B -S -m unittest. No original test or physical stage is executed.
"""
import ast
import copy
import hashlib
import json
from pathlib import Path
import unittest
from unittest.mock import patch

from recovery_legacy_report_test_context import (
    BASE_PARENT, BINDINGS, PHYSICAL, SOURCE, initialize,
)


class LegacyJUnitReportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.denied, cls.parent = initialize()
        try:
            cls.report = cls.parent.g.read_json(PHYSICAL / "junit-report.json")
            cls.bindings = cls.parent.g.read_json(BINDINGS)
            cls.outer = cls.parent.g.read_json(PHYSICAL / "root-execution.json")
        except BaseException:
            cls.denied.__exit__(None, None, None)
            raise

    @classmethod
    def tearDownClass(cls):
        counts = dict(cls.denied.counts)
        cls.denied.__exit__(None, None, None)
        print("FILE_ONLY_DENIAL_COUNTS " + json.dumps(counts, sort_keys=True))
        if any(counts.values()):
            raise AssertionError("Report regression attempted a denied action: " + repr(counts))

    def reject_report(self, report, error=ValueError):
        original = self.parent.g.read_json

        def read_only_report(path, *args, **kwargs):
            if Path(path) == PHYSICAL / "junit-report.json":
                return copy.deepcopy(report)
            return original(path, *args, **kwargs)

        with patch.object(self.parent.g, "read_json", side_effect=read_only_report):
            with self.assertRaises(error):
                self.parent.junit_check(self.bindings, PHYSICAL)

    def test_actual_junit_report_without_binding_fields_is_admitted(self):
        self.assertNotIn("selectionMarker", self.report)
        self.assertNotIn("orderedCsvSource", self.report)
        try:
            report, passed = self.parent.junit_check(self.bindings, PHYSICAL)
        except KeyError as error:
            self.fail("Actual JUnit report must use its four selector fields, not "
                      "binding-only selectionMarker/orderedCsvSource: " + repr(error))
        self.assertEqual(report, self.report)
        self.assertIs(passed, True)

    def test_binding_selector_still_requires_its_binding_only_fields(self):
        self.assertIs(self.parent.selector_check(self.bindings), True)
        with self.assertRaises(KeyError):
            self.parent.selector_check(self.report)

    def test_missing_report_selector_field_is_rejected(self):
        for key in ("selectedClass", "selectedMethod", "selectedParameterTypes", "selectedMethods"):
            with self.subTest(key=key):
                report = copy.deepcopy(self.report)
                del report[key]
                self.reject_report(report, KeyError)

    def test_foreign_or_malformed_report_selectors_are_rejected(self):
        changes = (("selectedClass", "foreign.Class"), ("selectedClass", True),
                   ("selectedMethod", "foreignMethod"), ("selectedMethod", []),
                   ("selectedParameterTypes", "java.lang.String"),
                   ("selectedParameterTypes", False), ("selectedMethods", []),
                   ("selectedMethods", [self.report["selectedMethods"][0]] * 2),
                   ("selectedMethods", ["foreignMethod"]), ("selectedMethods", True))
        for key, value in changes:
            with self.subTest(key=key, value=value):
                report = copy.deepcopy(self.report)
                report[key] = value
                self.reject_report(report)

    def test_nonobject_report_is_rejected(self):
        self.reject_report([], TypeError)

    def test_missing_extra_duplicate_or_foreign_callbacks_are_rejected(self):
        method = self.report["selectedMethods"][0]
        for key in ("startedMethods", "finishedMethods", "succeededMethods"):
            for value in ([], [method, method], ["foreignMethod"], [True]):
                with self.subTest(key=key, value=value):
                    report = copy.deepcopy(self.report)
                    report["selectedExecution"][key] = value
                    self.reject_report(report)
        report = copy.deepcopy(self.report)
        report["selectedExecution"]["actualParameters"] = [[]]
        self.reject_report(report)

    def test_incomplete_or_violating_callback_is_rejected(self):
        for key, value in (("complete", False), ("complete", 1),
                           ("violations", ["unexpected callback"]),
                           ("selectedClass", "foreign.Class")):
            with self.subTest(key=key):
                report = copy.deepcopy(self.report)
                report["selectedExecution"][key] = value
                self.reject_report(report)

    def test_malformed_runtime_admission_is_rejected(self):
        for key, value in (("selectedMethods", ["foreignMethod"]),
                           ("zeroAgentPolicyAdmitted", False),
                           ("admissionMockitoWarmupPerformed", True),
                           ("selectedOriginalTimeoutSeconds", 121),
                           ("pgActualResourceSha256", "0" * 64)):
            with self.subTest(key=key):
                report = copy.deepcopy(self.report)
                report["runtimeAdmission"][key] = value
                self.reject_report(report)

    def test_incomplete_driver_or_application_shutdown_is_rejected(self):
        for key in ("cleanupComplete", "processWorkersQuiescent", "watchdogJoined"):
            with self.subTest(key=key):
                report = copy.deepcopy(self.report)
                report[key] = False
                self.reject_report(report)
        report = copy.deepcopy(self.report)
        report["applicationShutdown"]["newLiveWorkers"] = [123]
        self.reject_report(report)

    def test_actual_complete_parent_capture_is_admitted(self):
        capture = self.parent.capture_check(PHYSICAL, self.outer, True)
        self.assertIs(capture["passed"], True)
        self.assertEqual(capture["signals"], [])

    def test_incomplete_or_signalled_capture_is_rejected(self):
        original = self.parent.g.read_json
        actual = original(PHYSICAL / "parent-runtime-output/parent-execution.json")
        for key, value in (("targetReaped", False), ("readWorkersJoined", False),
                           ("signals", [{"signal": "TERM"}])):
            with self.subTest(key=key):
                broken = copy.deepcopy(actual)
                broken[key] = value
                with patch.object(self.parent.g, "read_json", return_value=broken):
                    with self.assertRaises(ValueError):
                        self.parent.capture_check(PHYSICAL, self.outer, True)

    def test_one_call_derivative_preserves_all_other_source_and_ast(self):
        baseline = BASE_PARENT.read_bytes()
        actual = (SOURCE / "parent_stages.py").read_bytes()
        old = b"    selector_check(report)\n"
        new = b"    runtime_selection_check(report)\n"
        self.assertEqual(hashlib.sha256(baseline).hexdigest(),
                         "46a74f432f999d39e565fcc40f3025a6282e990fbfee8ae5565c2bdfadfdfa1c")
        self.assertEqual(baseline.count(old), 1)
        self.assertIn(actual, (baseline, baseline.replace(old, new, 1)))
        inverse = actual if actual == baseline else actual.replace(new, old, 1)
        self.assertEqual(inverse, baseline)
        self.assertEqual(ast.dump(ast.parse(inverse)), ast.dump(ast.parse(baseline)))


if __name__ == "__main__":
    unittest.main()
