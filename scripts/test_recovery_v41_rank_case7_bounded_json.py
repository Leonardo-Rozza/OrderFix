"""Isolated bounded-JSON regressions; no original case or capture is invoked."""
import argparse
from contextlib import ExitStack, contextmanager
import hashlib
import importlib.util
import os
from pathlib import Path
import resource
import signal
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

CANDIDATE = None
LIMIT = 16777216
CHUNK = 65536


class VirtualStream:
    """Generate a JSON object plus padding without a large disk fixture."""

    def __init__(self, size):
        self.size, self.position = size, 0
        self.requests, self.closed = [], False

    def fileno(self):
        return 77

    def read(self, amount):
        self.requests.append(amount)
        count = min(amount, self.size - self.position)
        start = self.position
        self.position += count
        return (b'{}'[start:start + count] + b' ' * max(0, count - max(0, 2 - start)))

    def __enter__(self):
        return self

    def __exit__(self, *unused):
        self.closed = True


class BoundedJsonTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='case7-json-fixture-', dir='/private/tmp')
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.path = self.root / 'input.json'
        self.path.write_bytes(b'{}')

    def digest(self, raw):
        return hashlib.sha256(raw).hexdigest()

    def identity(self, **changes):
        value = self.path.lstat()
        fields = {key: getattr(value, key) for key in CANDIDATE.STAT_FIELDS + ('st_size',)}
        fields.update(changes)
        return SimpleNamespace(**fields)

    @contextmanager
    def virtual(self, actual_size, announced_size=None, fstats=None, lstats=None):
        stream = VirtualStream(actual_size)
        before = self.identity(st_size=actual_size if announced_size is None else announced_size)
        with ExitStack() as stack:
            stack.enter_context(patch.object(CANDIDATE.Path, 'lstat',
                side_effect=lstats, return_value=before))
            opened = stack.enter_context(patch.object(CANDIDATE.os, 'open', return_value=77))
            stack.enter_context(patch.object(CANDIDATE.os, 'fdopen', return_value=stream))
            stack.enter_context(patch.object(CANDIDATE.os, 'fstat',
                side_effect=fstats, return_value=before))
            yield stream, opened

    def assert_closed(self, descriptors):
        for descriptor in descriptors:
            with self.assertRaises(OSError):
                os.fstat(descriptor)

    @contextmanager
    def recorded_descriptors(self):
        descriptors = []
        original = os.open
        def opened(*args, **kwargs):
            descriptor = original(*args, **kwargs)
            descriptors.append(descriptor)
            return descriptor
        with patch.object(CANDIDATE.os, 'open', side_effect=opened):
            yield descriptors
        self.assert_closed(descriptors)

    def test_known_oversized_input_is_rejected_without_read(self):
        digest = self.digest(b'{}' + b' ' * (LIMIT - 1))
        with self.virtual(LIMIT + 1) as (stream, unused):
            with patch.object(CANDIDATE, 'strict_json') as parse:
                with self.assertRaisesRegex(ValueError, 'Bounded JSON input'):
                    CANDIDATE.checked_json(self.path, digest)
                parse.assert_not_called()
            self.assertEqual(stream.requests, [], 'Known oversize must consume zero bytes')
            self.assertEqual(stream.position, 0)

    def test_concurrent_growth_consumes_only_limit_plus_sentinel(self):
        with self.virtual(LIMIT + CHUNK, announced_size=2) as (stream, unused):
            with patch.object(CANDIDATE, 'strict_json') as parse:
                with self.assertRaisesRegex(ValueError, 'Bounded JSON input'):
                    CANDIDATE.checked_json(self.path, '0' * 64)
                parse.assert_not_called()
            self.assertEqual(stream.position, LIMIT + 1)
            self.assertTrue(all(0 < amount <= CHUNK for amount in stream.requests))
            self.assertTrue(stream.closed)

    def test_exact_limit_is_accepted_with_bounded_requests(self):
        expected = b'{}' + b' ' * (LIMIT - 2)
        with self.virtual(LIMIT) as (stream, opened):
            result, pin = CANDIDATE.checked_json(self.path, self.digest(expected))
            self.assertEqual(result, {})
            self.assertEqual(pin['bytes'], LIMIT)
            self.assertEqual(pin['sha256'], self.digest(expected))
            self.assertEqual(stream.position, LIMIT)
            self.assertTrue(all(0 < amount <= CHUNK for amount in stream.requests))
            opened.assert_called_once_with(self.path, os.O_RDONLY | os.O_NOFOLLOW)
            self.assertTrue(stream.closed)

    def test_small_input_pin_parity_and_exact_parsed_bytes_one_descriptor(self):
        raw = b'{"answer":42}'
        self.path.write_bytes(raw)
        expected_pin = CANDIDATE.source_pin(self.path)
        original_parse = CANDIDATE.strict_json
        parsed = []
        def parse(data):
            parsed.append(data)
            self.assertEqual(len(descriptors), 1)
            os.fstat(descriptors[0])  # Parsing must occur while that descriptor is open.
            return original_parse(data)
        with self.recorded_descriptors() as descriptors:
            with patch.object(CANDIDATE, 'source_pin', side_effect=AssertionError('second pin read')):
                with patch.object(CANDIDATE.Path, 'read_bytes', side_effect=AssertionError('unbounded read')):
                    with patch.object(CANDIDATE, 'strict_json', side_effect=parse):
                        result, pin = CANDIDATE.checked_json(self.path, self.digest(raw))
        self.assertEqual(result, {'answer': 42})
        self.assertEqual(pin, expected_pin)
        self.assertEqual(parsed, [raw])
        self.assertEqual(len(descriptors), 1)

    def test_wrong_digest_rejects_before_parse_and_closes(self):
        with self.recorded_descriptors():
            with patch.object(CANDIDATE, 'strict_json') as parse:
                with self.assertRaisesRegex(ValueError, 'Pinned JSON SHA mismatch'):
                    CANDIDATE.checked_json(self.path, '0' * 64)
                parse.assert_not_called()

    def test_strict_json_failures_close_descriptor(self):
        for raw, reason in ((b'{"a":1,"a":2}', 'Duplicate JSON key'),
                            (b'NaN', 'Nonfinite JSON'), (b'Infinity', 'Nonfinite JSON'),
                            (b'1e9999', 'Nonfinite JSON exponent'), (b'{', 'Expecting')):
            with self.subTest(raw=raw):
                self.path.write_bytes(raw)
                with self.recorded_descriptors():
                    with self.assertRaisesRegex(ValueError, reason):
                        CANDIDATE.checked_json(self.path, self.digest(raw))

    def test_nonabsolute_symlink_hardlink_and_directory_rejected(self):
        symlink, hardlink = self.root / 'symlink', self.root / 'hardlink'
        symlink.symlink_to(self.path)
        for target in (Path('relative.json'), symlink, self.root):
            with self.subTest(target=target), patch.object(CANDIDATE.os, 'open') as opened:
                with self.assertRaisesRegex(ValueError, 'Absolute SOURCE|Ordinary single-link SOURCE'):
                    CANDIDATE.checked_json(target, self.digest(b'{}'))
                opened.assert_not_called()
        os.link(self.path, hardlink)
        with patch.object(CANDIDATE.os, 'open') as opened:
            with self.assertRaisesRegex(ValueError, 'Ordinary single-link SOURCE'):
                CANDIDATE.checked_json(self.path, self.digest(b'{}'))
            opened.assert_not_called()

    def test_open_identity_drift_is_rejected_without_read(self):
        before = self.identity()
        for field in CANDIDATE.STAT_FIELDS + ('st_size',):
            with self.subTest(field=field):
                changed = self.identity(**{field: getattr(before, field) + 1})
                with self.virtual(2, fstats=[changed]) as (stream, unused):
                    with self.assertRaisesRegex(ValueError, 'SOURCE changed at open'):
                        CANDIDATE.checked_json(self.path, self.digest(b'{}'))
                    self.assertEqual(stream.requests, [])
                    self.assertTrue(stream.closed)

    def test_read_identity_drift_rejects_before_parse(self):
        before, changed = self.identity(), self.identity(st_mtime_ns=0)
        with self.virtual(2, fstats=[before, changed]) as (stream, unused):
            with patch.object(CANDIDATE, 'strict_json') as parse:
                with self.assertRaisesRegex(ValueError, 'SOURCE changed during read'):
                    CANDIDATE.checked_json(self.path, self.digest(b'{}'))
                parse.assert_not_called()
            self.assertTrue(stream.closed)

    def test_path_replacement_after_read_is_rejected(self):
        before, replaced = self.identity(), self.identity(st_ino=0)
        with self.virtual(2, lstats=[before, replaced]) as (stream, unused):
            with self.assertRaisesRegex(ValueError, 'SOURCE changed during read'):
                CANDIDATE.checked_json(self.path, self.digest(b'{}'))
            self.assertTrue(stream.closed)

    def test_read_count_must_match_identity_size(self):
        with self.virtual(2, announced_size=3) as (stream, unused):
            with self.assertRaisesRegex(ValueError, 'SOURCE changed during read'):
                CANDIDATE.checked_json(self.path, self.digest(b'{}'))
            self.assertTrue(stream.closed)

    def test_postparse_descriptor_drift_is_rejected(self):
        before, changed = self.identity(), self.identity(st_ctime_ns=0)
        with self.virtual(2, fstats=[before, before, changed]) as (stream, unused):
            with self.assertRaisesRegex(ValueError, 'JSON identity changed during parsing'):
                CANDIDATE.checked_json(self.path, self.digest(b'{}'))
            self.assertTrue(stream.closed)

    def test_real_path_replacement_during_parse_is_rejected(self):
        original_parse = CANDIDATE.strict_json
        def parse(data):
            replacement = self.root / 'replacement.json'
            replacement.write_bytes(b'{}')
            replacement.replace(self.path)
            return original_parse(data)
        with self.recorded_descriptors():
            with patch.object(CANDIDATE, 'strict_json', side_effect=parse):
                with self.assertRaisesRegex(ValueError, 'JSON identity changed during parsing'):
                    CANDIDATE.checked_json(self.path, self.digest(b'{}'))

    def test_read_and_parse_exceptions_close_stream(self):
        for phase in ('read', 'strict_json'):
            with self.subTest(phase=phase), self.virtual(2) as (stream, unused):
                target = stream if phase == 'read' else CANDIDATE
                with patch.object(target, phase, side_effect=OSError('fixture failure')):
                    with self.assertRaisesRegex(OSError, 'fixture failure'):
                        CANDIDATE.checked_json(self.path, self.digest(b'{}'))
                self.assertTrue(stream.closed)

    def test_fdopen_failure_closes_raw_descriptor(self):
        with self.recorded_descriptors():
            with patch.object(CANDIDATE.os, 'fdopen', side_effect=OSError('fdopen failure')):
                with self.assertRaisesRegex(OSError, 'fdopen failure'):
                    CANDIDATE.checked_json(self.path, self.digest(b'{}'))


if __name__ == '__main__':
    signal.alarm(120)
    resource.setrlimit(resource.RLIMIT_FSIZE, (8388608, 8388608))
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate', required=True)
    parser.add_argument('--test', help='Select one frozen behavioral regression for RED')
    args = parser.parse_args()
    specification = importlib.util.spec_from_file_location('case7_json_candidate', args.candidate)
    CANDIDATE = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(CANDIDATE)
    unittest.main(argv=[__file__] + ([args.test] if args.test else []), verbosity=2)
