"""Saved FALSE-ledger regressions; no original execution or Docker access."""
import copy
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import unittest

P = Path(__file__).resolve().parents[1]
ROOT = Path('/private/tmp/ordenfix-pro-rank12-preparation-vcra7ulw')
DONOR_NONCE = 'ac62225ee09a4e9397d2040efde9d875'
DONOR = ROOT / ('rows/row-7/ordenfix-pro-recovery-v41-rank12-python-owner-nosite-' + DONOR_NONCE)
CANDIDATE = Path(os.environ.get('CASE9_SAVED_READER_CANDIDATE', str(P / 'scripts/recovery_v41_rank_case9_saved_reader.py')))
spec = importlib.util.spec_from_file_location('case9_http_budget_candidate', CANDIDATE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
m.OWNER, m.NONCE = DONOR, DONOR_NONCE


def read(path):
    return json.loads(path.read_bytes())


class HttpBudgetTests(unittest.TestCase):
    def setUp(self):
        self.owner = read(DONOR / 'observed/owner-receipt.json')
        self.events = [read(path) for path in sorted((DONOR / 'observed').glob('[0-9]*.json'))]
        self.request = read(DONOR / 'request.json')
        self.allow = read(DONOR / 'exec-allowlist.json')
        self.sources = {item['path']: item for item in read(ROOT / 'real-case-9-records/execution-recipe-01.json')['fixedPins']}

    def validate(self, events):
        return m.validate_http(self.owner, events, self.request, self.allow, self.sources)

    def test_unmodified_saved_false_ledger_passes(self):
        self.assertEqual(len(self.validate(self.events)['execIds']), 2)

    def test_extra_operations_are_not_hidden_by_two_lifecycle_groups(self):
        for operation in ('exec-create', 'restart', 'exec-inspect'):
            events = copy.deepcopy(self.events)
            suffix = {'exec-create': '/exec', 'restart': '/stop?t=5', 'exec-inspect': '/json'}[operation]
            index = next(i for i, event in enumerate(events) if event['kind'] == 'http'
                         and event['path'].endswith(suffix) and (operation != 'exec-inspect' or '/exec/' in event['path']))
            extra = copy.deepcopy(events[index])
            if operation == 'exec-create':
                extra['response'] = {'Id': 'f' * 64}
                raw = (json.dumps(extra['response'], separators=(',', ':')) + '\n').encode()
                extra.update(responseBytes=len(raw), responseSha256=hashlib.sha256(raw).hexdigest())
            elif operation == 'restart':
                extra['path'] = extra['path'].replace('/stop?t=5', '/restart?t=5')
            extra['monotonic'] = (events[index]['monotonic'] + events[index + 1]['monotonic']) / 2
            events.insert(index + 1, extra)
            with self.subTest(operation=operation), self.assertRaisesRegex(AssertionError, 'HTTP budget'):
                self.validate(events)

    def test_http_exec_evidence_must_match_its_lifecycle(self):
        for mismatch in ('body', 'id', 'time', 'inspect-response', 'stream-method'):
            events = copy.deepcopy(self.events)
            create = next(event for event in events if event['kind'] == 'http' and event['path'].endswith('/exec'))
            inspect = next(event for event in events if event['kind'] == 'http' and '/exec/' in event['path'])
            if mismatch == 'body':
                create['requestBody']['Cmd'] = ['true']
            elif mismatch == 'id':
                create['response']['Id'] = 'f' * 64
            elif mismatch == 'time':
                create['monotonic'] = self.events[0]['monotonic']
            elif mismatch == 'inspect-response':
                inspect['response']['ExitCode'] = 1
            else:
                next(event for event in events if event['kind'] == 'exec-stream')['method'] = 'GET'
            with self.subTest(mismatch=mismatch), self.assertRaisesRegex(AssertionError, 'HTTP budget'):
                self.validate(events)


if __name__ == '__main__':
    unittest.main(verbosity=2)
