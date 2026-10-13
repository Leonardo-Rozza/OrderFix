"""Explicit JSON-stdio owner entry. Import is inert; no ambient configuration."""
import base64
import json
import os
from pathlib import Path
import queue
import select
import signal
import stat
import sys
import threading
import time
from direct_capability import check_pin, sha, write_once
from fixture_guard import require
from http_framing import WireError
from owner_controller import FixtureOwner
from recovery_registry import validate_spec

ROOT = Path(__file__).resolve().parent
MARKER = '--execute-parent-approved-recovery-v41-rank12-owned-stdio'
PROTOCOL = 'ordenfix-owned-pg/1'
REQUEST_CAP = 16384
RESPONSE_CAP = 2 * 1024 * 1024
ENV = {'HOME': str(ROOT / 'home'), 'TMPDIR': str(ROOT / 'tmp'), 'PATH': '/usr/bin:/bin',
       'LANG': 'C', 'LC_ALL': 'C', 'PYTHONDONTWRITEBYTECODE': '1',
       '__CF_USER_TEXT_ENCODING': '0x1F5:0x0:0x8'}


def json_object(raw):
    def distinct(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, 'Duplicate JSON protocol key.')
            result[key] = value
        return result
    return json.loads(raw, object_pairs_hook=distinct,
                      parse_constant=lambda value: (_ for _ in ()).throw(WireError('Nonfinite JSON.')))


class Protocol:
    def __init__(self, owner): self.owner, self.seq = owner, 0

    def dispatch(self, envelope):
        require(isinstance(envelope, dict) and set(envelope) == {'protocol', 'seq', 'nonce', 'op', 'payload'},
                'Exact request envelope keys are required.')
        require(envelope['protocol'] == PROTOCOL and type(envelope['seq']) is int
                and envelope['seq'] == self.seq + 1 and envelope['nonce'] == self.owner.request['nonce'],
                'Protocol/nonce/strict next sequence differs.')
        op, payload = envelope['op'], envelope['payload']
        require(isinstance(payload, dict), 'Operation payload must be an object.')
        allowed = {'bootstrap': set(), 'start': {'request'}, 'inspect': {'request', 'handle'},
                   'exec': {'request', 'handle', 'argv'}, 'stop': {'request', 'handle'}, 'close': set()}
        require(op in allowed and set(payload) == allowed[op], 'Unknown operation or payload keys.')
        require(op == 'bootstrap' if self.seq == 0 else op != 'bootstrap', 'Bootstrap must be first and single-use.')
        require(self.owner.cleanup_result is None or op in ('stop', 'close'), 'Stopped fixture only accepts stop/close.')
        self.seq = envelope['seq']
        if op == 'bootstrap': value = self.owner.bootstrap()
        elif op == 'start': value = self.owner.start(payload['request'])
        elif op == 'inspect': value = self.owner.inspect(payload['request'], payload['handle'])
        elif op == 'exec': value = self.owner.exec(payload['request'], payload['handle'], payload['argv'])
        elif op == 'stop': value = self.owner.stop_result(payload['request'], payload['handle'])
        else: value = self.owner.stop_result()
        return self.response(envelope, value=value)

    def response(self, envelope, value=None, failure=None):
        return dict(protocol=PROTOCOL, seq=envelope.get('seq', self.seq), nonce=self.owner.request['nonce'],
                    op=envelope.get('op', 'invalid'), status='ok' if failure is None else 'error',
                    value=value if failure is None else None,
                    error=None if failure is None else {'kind': type(failure).__name__, 'message': str(failure)[:2048]},
                    lifecycle=self.owner.lifecycle())


class InputWorker:
    """Raw owner pipe only: no BufferedReader lock/close while a reader is live."""
    def __init__(self, fd, owner):
        self.fd, self.owner = fd, owner
        self.queue, self.done = queue.Queue(maxsize=8), threading.Event()
        self.error, self.eof = None, False
        self.thread = threading.Thread(target=self.run, name='owned-stdin', daemon=True)

    def start(self):
        require(stat.S_ISFIFO(os.fstat(self.fd).st_mode), 'Owner stdin must be its explicit launcher pipe.')
        os.set_blocking(self.fd, False)
        self.thread.start()

    def run(self):
        pending = bytearray()
        try:
            while not self.done.is_set():
                if not select.select([self.fd], [], [], 0.1)[0]: continue
                try: block = os.read(self.fd, 4096)
                except BlockingIOError: continue
                if not block:
                    require(not pending, 'EOF inside an incomplete JSON request.')
                    self.eof = True; self.owner.request_stop(); return
                pending.extend(block)
                while b'\n' in pending:
                    index = pending.index(b'\n')
                    require(index + 1 <= REQUEST_CAP, 'Protocol request exceeded 16 KiB.')
                    raw = bytes(pending[:index]); del pending[:index + 1]
                    require(raw, 'Empty protocol line.')
                    self.queue.put_nowait(json_object(raw.decode('utf-8')))
                require(len(pending) < REQUEST_CAP, 'Protocol request exceeded 16 KiB before newline.')
        except BaseException as failure:
            self.error = repr(failure); self.owner.request_stop()

    def join(self, deadline):
        self.done.set()
        self.thread.join(max(0, deadline - time.monotonic()))
        return not self.thread.is_alive()


def send_response(fd, value, owner):
    encoded = json.dumps(value, separators=(',', ':'), allow_nan=False).encode() + b'\n'
    require(len(encoded) <= RESPONSE_CAP, 'Response exceeded its 2 MiB cap.')
    deadline = min(time.monotonic() + 10, owner.stop.deadline or owner.owner_deadline or time.monotonic() + 10)
    offset = 0
    while offset < len(encoded):
        remaining = deadline - time.monotonic()
        require(remaining > 0, 'Bounded protocol output deadline exceeded.')
        require(select.select([], [fd], [], remaining)[1], 'Protocol output was not writable before its deadline.')
        try: count = os.write(fd, encoded[offset:])
        except BlockingIOError: continue
        require(count > 0, 'Protocol output closed before completion.')
        offset += count


def verify_preparation(argv):
    require(len(argv) == 7 and argv[0] == MARKER and argv[1] == '--config' and argv[3] == '--config-sha'
            and argv[5] == '--runtime-pins-sha', 'Exact parent-pinned command required.')
    require(argv[2] == str(ROOT / 'request.json'), 'Only this fresh owned root config is permitted.')
    pins_raw = (ROOT / 'runtime-pins.json').read_bytes()
    require(sha(pins_raw) == argv[6], 'Runtime pin manifest differs.')
    pins = json_object(pins_raw)
    for pin in pins['files'] + pins['dependencies']: check_pin(pin)
    require(dict(os.environ) == ENV, 'Exact synthetic environment required; no extra keys.')
    require(not list((ROOT / 'observed').iterdir()), 'Observation directory must be owned, empty and unused.')
    for path in (ROOT, ROOT / 'observed', ROOT / 'home', ROOT / 'tmp'):
        metadata = path.lstat()
        require(stat.S_ISDIR(metadata.st_mode) and metadata.st_uid == os.getuid(), 'Owned nonsymlink directory required.')
    raw = (ROOT / 'request.json').read_bytes()
    require(sha(raw) == argv[4], 'Exact frozen fresh request differs.')
    request = json_object(raw)
    require(request['root'] == str(ROOT) and re_nonce(request['nonce']) and request['networkCreate']['Internal'] is False,
            'Exact fresh standard-mode request is required.')
    require(request['purpose'] == 'recovery-v41-rank12-single'
            and request['labels']['com.ordenfix.fixture-purpose'] == 'recovery-v41-rank12-single',
            'Only this fixed single-row V41 recovery capability purpose is permitted.')
    vectors = validate_spec(json_object((ROOT / 'exec-allowlist.json').read_bytes()))
    check_pin(vectors['sourcePin'])
    return request, vectors


def re_nonce(value):
    import re
    return isinstance(value, str) and re.fullmatch('[a-f0-9]{32}', value) is not None


def main(argv=None):
    request, vectors = verify_preparation(sys.argv[1:] if argv is None else argv)
    write_once(ROOT / 'observed' / 'once.json', {'nonce': request['nonce'], 'marker': MARKER})
    owner = reader = None; saved = {}; failure = None; receipt = None
    started = time.monotonic()
    try:
        owner = FixtureOwner(request, ROOT / 'observed', vectors, authorized=True)
        protocol = Protocol(owner)
        require(stat.S_ISFIFO(os.fstat(1).st_mode), 'Owner stdout must be its explicit launcher control pipe.')
        os.set_blocking(1, False)
        reader = InputWorker(0, owner); reader.start()
        for signum in (signal.SIGTERM, signal.SIGINT):
            saved[signum] = signal.signal(signum, lambda *_: owner.request_stop())
        initial_deadline = started + 10
        while True:
            if reader.error: break
            cancelling = reader.eof or (owner.stop.deadline is not None and owner.cleanup_result is None)
            if cancelling and reader.queue.empty(): break
            effective_deadline = owner.stop.deadline or owner.owner_deadline or initial_deadline
            if time.monotonic() >= effective_deadline:
                failure = 'Fixed owner lifetime/initial bootstrap deadline expired.'; owner.request_stop(); break
            try: envelope = reader.queue.get(timeout=0.1)
            except queue.Empty: continue
            if time.monotonic() >= effective_deadline:
                failure = 'Absolute initial/owner/cleanup deadline expired after dequeue.'
                owner.request_stop(); break
            if cancelling and envelope.get('op') not in ('stop', 'close'): break
            try:
                response = protocol.dispatch(envelope)
                send_response(1, response, owner)
            except BaseException as problem:
                failure = repr(problem); owner.request_stop()
                try:
                    owner.stop_result()
                    send_response(1, protocol.response(envelope, failure=problem), owner)
                except BaseException as secondary: failure += ' response/cleanup=' + repr(secondary)
                break
            if envelope['op'] == 'close': break
        if reader.error: failure = (failure or '') + ' stdin=' + reader.error
        if reader.eof and protocol.seq == 0: failure = (failure or '') + ' EOF before bootstrap'
    except BaseException as problem: failure = repr(problem)
    finally:
        joined = False; cleanup = None
        if owner is not None:
            owner.stop.request()
            # Stop the pipe worker before cleanup; it never closes a live buffered stream.
            if reader is not None:
                try: joined = reader.join(min(owner.stop.deadline, time.monotonic() + 1))
                except BaseException as problem: failure = (failure or '') + ' stdinJoin=' + repr(problem)
            try: cleanup = owner.stop_result()
            except BaseException as problem:
                cleanup = {'complete': False, 'unknownResources': True, 'failure': repr(problem)}
        for signum, previous in saved.items():
            try: signal.signal(signum, previous)
            except BaseException as problem: failure = (failure or '') + ' signalRestore=' + repr(problem)
        finished = time.monotonic()
        deadline = owner.stop.deadline if owner else None
        passed = failure is None and cleanup is not None and cleanup['complete'] and joined \
            and isinstance(deadline, (int, float)) and finished <= deadline
        receipt = dict(passed=passed, failure=failure, cleanup=cleanup, inputWorkerJoined=joined,
                       inputWorkerEOF=reader.eof if reader else None, startedMonotonic=started,
                       finishedMonotonic=finished, strictCleanupDeadline=deadline,
                       lifecycle=owner.lifecycle() if owner else None,
                       recoveryRegistry=owner.registry.observation() if owner else None, physicalJUnitAccredited=False)
        try: write_once(ROOT / 'observed' / 'owner-receipt.json', receipt)
        except BaseException as problem:
            passed = False
            sys.stderr.write('Owned receipt failure: ' + repr(problem) + '\n')
    return 0 if passed else 1


if __name__ == '__main__': sys.exit(main())
