"""Isolated current SOURCE reconstruction tests; no runtime or old suite runs."""
import argparse
import ast
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import resource
import signal
import tempfile
import unittest
from unittest.mock import patch

P = Path(__file__).resolve().parents[1]
CALLER = P / 'scripts/recovery_v41_rank_case8_outer_capture.py'
SPEC = importlib.util.spec_from_file_location('case8_reconstruction_candidate', CALLER)
CANDIDATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(CANDIDATE)
UNCHANGED_FUNCTION_HASHES = {'strict_json': '866cf6d5f51c22ca739e082f223ae51a4862cf9f6bb56330ea2f080c298371b4', 'source_pin': '6ebfac463a7076b63e9ba04a633999ce2fdb2e03360f286268ad1019528c4c94', 'checked_json': 'f9cd000418211b79e57ed01fb0389ed51dc29246dfe1bdd97434bf1c7053f9f7', 'clean_environment': '873ab81cc518f113783d0cf6ee65307eb086cd4d5cde0c1cc9d9b678ceb4f9b4', 'validate_recipe': '2b1033f04eec035c8cf579dd522b5e6183a2e7b62c532a806a4f5309fa4ddb66', 'validate_request': '1536b2ec0db50c65e6740dfb9c19858ea29e1fd0aa75502fa3c575a3453d5060', 'write_new': 'dc6b33b812ca7e41ab362a45ad56b8a1f3cdcf53c1f367e429516f28d82754ed', 'execute_once': '5b25acced76348f8a18a9339abe41e06e7d386d9900deef1787b5fcc599cd1e2', 'main': 'c0cf688eaf418f0496e3d20eb2e3dfc5a8ef320b342ad301193cc8e7abd9abd7'}


class SourceRecoveryTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='case8-recovery-fixture-', dir='/private/tmp')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.control_root = self.root / 'recovery'
        self.control_root.mkdir()
        self.manifest_path = self.control_root / 'complete-dependency-recovery-manifest-01.json'
        self.final_path = self.control_root / 'final-dependency-recovery-readback-01.json'
        self.contract = CANDIDATE.Contract(self.root, self.root / 'project')
        self.contract.anchors = {}
        self.contract.extra_paths = {Path(__file__).resolve()}
        self.contract.import_paths = set()
        self.contract.expected_recovery_data = []
        self.mappings, self.fixed, declared = [], [], []
        for ordinal in range(9):
            raw = ('Immutable payload ' + str(ordinal)).encode()
            old, donor = self.root / ('old-' + str(ordinal)), self.root / ('donor-' + str(ordinal))
            new = self.control_root / 'payloads' / ('source-' + str(ordinal))
            new.parent.mkdir(exist_ok=True)
            for path in (old, donor, new):
                path.write_bytes(raw)
                path.chmod(0o600)
            old_pin, donor_pin, new_pin = map(CANDIDATE.source_pin, (old, donor, new))
            old.unlink()
            self.fixed.extend((old_pin, donor_pin))
            declared.append(dict(missingExpectedPin=old_pin, existingDeclaredContentCopy=donor_pin))
            self.mappings.append(dict(oldExpectedPin=old_pin, donorPin=donor_pin, newSourcePin=new_pin,
                relativeCurrentPayloadPath=str(new.relative_to(self.control_root)),
                role='CURRENT_SOURCE_PAYLOAD_PREPARATION_NOT_ADMISSION_AUTHORITY',
                bytesIdentical=True, contentRewritten=False, historicalIdentityRestored=False,
                oldPathRestored=False, substitutionPerformed=False, timestampsCopied=False))
        failure = self.root / 'failed-admission-01.json'
        self.write(failure, dict(newMissingCount=9, newMissingExpectedPins=[v['oldExpectedPin'] for v in self.mappings],
                                 declaredVerifiedContentCopies=declared))
        before = self.control_root / 'before-recovery-01.json'
        self.write(before, dict(failedAdmissionProofs=[CANDIDATE.source_pin(failure)]))
        self.manifest = dict(schema='case8-dependency-recovery-manifest/v1', payloadCount=9,
            mappings=copy.deepcopy(self.mappings), historicalIdentityRestored=False,
            oldLocatorsRecreated=False, expectedInventoryRebased=False,
            currentAdmissionAttempted=False, currentAdmissionPassed=False,
            runtimeAuthority=False, productionAuthority=False, original8Executed=False,
            files=[CANDIDATE.source_pin(before)] + [v['newSourcePin'] for v in self.mappings])
        self.manifest['expectedClosedFiles'] = sorted([v['path'] for v in self.manifest['files']]
            + [str(self.manifest_path), str(self.final_path)])
        self.refresh()
        self.contract.recipe = dict(fixedPins=copy.deepcopy(self.fixed), extraSourcePins=[])
        self.contract.expected_historical_count = len(self.fixed)

    def write(self, path, value):
        path.write_text(json.dumps(value, sort_keys=True, allow_nan=False))
        path.chmod(0o600)

    def refresh(self):
        self.write(self.manifest_path, self.manifest)
        self.contract.source_recovery_manifest_pin = CANDIDATE.source_pin(self.manifest_path)
        self.write(self.final_path, dict(manifest=self.contract.source_recovery_manifest_pin,
            dependencyReconstructionPassed=True, historicalIdentityRestored=False, payloadCount=9))
        self.contract.source_recovery_final_pin = CANDIDATE.source_pin(self.final_path)

    def projected(self):
        # Isolate the NEW projection, not the unrelated four-map fixture setup.
        with patch.object(self.contract, 'current_admission', return_value=[]):
            return self.contract.expected_sources()

    def test_001_exact_nine_are_projected_and_old_pins_remain_provenance(self):
        actual = self.projected()
        for mapping in self.mappings:
            self.assertNotIn(mapping['oldExpectedPin']['path'], actual)
            for key in ('donorPin', 'newSourcePin'):
                self.assertEqual(actual[mapping[key]['path']], mapping[key])
        self.assertEqual(len(actual), 19)
        self.assertEqual(actual[str(Path(__file__).resolve())], CANDIDATE.source_pin(__file__))
        self.assertEqual(self.contract.recipe['fixedPins'], self.fixed)
        self.assertTrue(all(not os.path.lexists(v['oldExpectedPin']['path']) for v in self.mappings))

    def test_projection_is_applied_exactly_once(self):
        first = self.projected()
        self.contract.recipe['fixedPins'] = list(first.values())
        self.contract.expected_historical_count = len(first)
        with self.assertRaises(ValueError):
            self.projected()

    def test_frozen_capture_once_cli_parser_and_caps_are_unchanged(self):
        tree = ast.parse(CALLER.read_text())
        for name, expected in UNCHANGED_FUNCTION_HASHES.items():
            node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == name)
            self.assertEqual(hashlib.sha256(ast.get_source_segment(CALLER.read_text(), node).encode()).hexdigest(), expected, name)

    def test_current_admission_checks_reconstruction_before_old_control(self):
        payload = Path(self.mappings[0]['newSourcePin']['path'])
        payload.write_bytes(b'Changed after capture')
        # The same current_admission is called before and after unchanged execute_once.
        with self.assertRaisesRegex(ValueError, 'Reconstructed SOURCE'):
            self.contract.current_admission()

    def reject_mapping(self, change):
        change(self.manifest['mappings'])
        self.refresh()
        with self.assertRaises(ValueError):
            self.projected()


def mapping_mutation(kind):
    def test(self):
        def change(items):
            if kind == 'missing':
                items.pop()
            elif kind == 'extra':
                items.append(copy.deepcopy(items[0]))
            elif kind == 'duplicate':
                items[1] = copy.deepcopy(items[0])
            elif kind == 'old_pin':
                items[0]['oldExpectedPin']['stat8']['st_ino'] += 1
            elif kind == 'donor_pin':
                items[0]['donorPin']['stat8']['st_ino'] += 1
            elif kind == 'new_pin':
                items[0]['newSourcePin']['stat8']['st_ino'] += 1
            elif kind == 'content':
                items[0]['newSourcePin']['sha256'] = '0' * 64
            elif kind == 'role':
                items[0]['role'] = 'RUNTIME_AUTHORITY'
            elif kind == 'escape':
                items[0]['relativeCurrentPayloadPath'] = '../escape'
            else:
                items[0][kind] = True
        self.reject_mapping(change)
    return test


for kind in ('missing', 'extra', 'duplicate', 'old_pin', 'donor_pin', 'new_pin', 'content', 'role', 'escape',
             'contentRewritten', 'historicalIdentityRestored', 'oldPathRestored', 'substitutionPerformed', 'timestampsCopied'):
    setattr(SourceRecoveryTests, 'test_reject_mapping_' + kind, mapping_mutation(kind))


def physical_mutation(kind):
    def test(self):
        mapping = self.mappings[0]
        new = Path(mapping['newSourcePin']['path'])
        donor = Path(mapping['donorPin']['path'])
        if kind == 'old_restored':
            Path(mapping['oldExpectedPin']['path']).write_bytes(donor.read_bytes())
        elif kind == 'hardlink':
            os.link(new, self.root / 'hardlink')
        elif kind == 'symlink':
            new.unlink()
            new.symlink_to(donor)
        elif kind == 'stat':
            new.chmod(0o400)
        elif kind == 'donor':
            donor.write_bytes(b'Changed donor')
        elif kind == 'extra_file':
            (self.control_root / 'undeclared').write_text('Unexpected')
        elif kind == 'manifest':
            self.manifest_path.write_text('{}')
        elif kind == 'missing_manifest':
            self.manifest_path.unlink()
        else:
            self.final_path.write_text('{}')
        with self.assertRaises((ValueError, FileNotFoundError)):
            self.projected()
    return test


for kind in ('old_restored', 'hardlink', 'symlink', 'stat', 'donor', 'extra_file', 'manifest', 'missing_manifest', 'final'):
    setattr(SourceRecoveryTests, 'test_reject_physical_' + kind, physical_mutation(kind))


if __name__ == '__main__':
    signal.alarm(120)
    resource.setrlimit(resource.RLIMIT_FSIZE, (8388608, 8388608))
    parser = argparse.ArgumentParser()
    parser.add_argument('--test')
    args = parser.parse_args()
    unittest.main(argv=[__file__] + ([args.test] if args.test else []), verbosity=2)
