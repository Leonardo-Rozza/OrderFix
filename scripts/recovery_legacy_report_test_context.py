"""Explicit private source fixture; imports and assertions remain FILE-only."""
import builtins
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import stat
import subprocess
import sys
import threading

ROOT = Path("/private/tmp/ordenfix-pro-recovery-legacy-report-fix")
SOURCE = ROOT / "source"
BASE_PARENT = Path("/private/tmp/ordenfix-pro-recovery-legacy-prep-yld3ygo3/parent/parent_stages.py")
BINDINGS = Path("/private/tmp/ordenfix-pro-recovery-legacy-prep-yld3ygo3/checks/legacy-final-compiled-bindings-01.json")
PHYSICAL = Path("/private/tmp/ordenfix-pro-recovery-legacy-physical-mhzgop54")
SOURCE_PINS = {'preflight_guards': (12253, 'a79e12e7647c6dfc2fa813eb5916be29d5c79e1c2685d41462f295b9d708fad1'), 'preflight_results': (1192, '0a476baef8f2fe582a73c846a5b991e960c78581709819062c2107f59bca4243'), 'history_preflight_guards': (12250, '96a069b66e7519dcd64abf3ccdcdc2e27e6060415369a5b56afb8205d9c8da8e'), 'history_preflight_results': (1240, '42ed605557f02bc03afb3895722d3a44caea9f8bc7477602a3baf05849fc755b'), 'history_v40_parent': (110926, 'fe257fa63a10c06dcbd13747a0429c5e358e9fc1bf8319aa5d028500da1d82eb'), 'current_history_guard': (11112, 'ee3285e151656f6a031be91ec4eae0251b41ab0392b24064f8d9ac22266ef451'), 'legacy_history_adapter': (4795, '1117bdfef8043464c3a673ec02e3ce9f68a698028d2ca5720ff6cf584e7a564d'), 'legacy_t1_history': (17516, '3e5456004bf5ea0ff491789a1177f03dc719ff8ce688b4a540083c09cfe29f7e'), 'parent_stages': (102673, '46a74f432f999d39e565fcc40f3025a6282e990fbfee8ae5565c2bdfadfdfa1c')}
CORRECTED_PARENT_PIN = (102682, "23aeb8800751da31d2a3cf92465784d7eb5b8547a77cc43b9990dad46aa8d092")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def owned_regular(path):
    for ancestor in (path, *path.parents):
        require(not stat.S_ISLNK(ancestor.lstat().st_mode), "Fixture symlink rejected")
    info = path.lstat()
    require(stat.S_ISREG(info.st_mode) and info.st_uid == 501, "Owned regular fixture required")
    return path.read_bytes()


def check_source(name):
    path = SOURCE / (name + ".py")
    raw = owned_regular(path)
    actual = len(raw), hashlib.sha256(raw).hexdigest()
    expected = SOURCE_PINS[name]
    if name == "parent_stages" and actual == CORRECTED_PARENT_PIN:
        old = b"    selector_check(report)\n"
        new = b"    runtime_selection_check(report)\n"
        require(raw.count(new) == 1, "Only the fixed report call may change")
        inverse = raw.replace(new, old, 1)
        require((len(inverse), hashlib.sha256(inverse).hexdigest()) == expected,
                "Complete parent inverse must match frozen baseline")
    else:
        require(actual == expected, "Exact baseline source pin required: " + name)
    return path


class RootMutationDenied:
    """Deny mutation and runtime actions during isolated report regression imports."""
    def __init__(self):
        self.counts = dict(helperWrites=0, subprocesses=0, sockets=0, threads=0, stageCLI=0)
        self.saved = []

    def replace(self, owner, name, replacement):
        if hasattr(owner, name):
            self.saved.append((owner, name, getattr(owner, name)))
            setattr(owner, name, replacement)

    def denied(self, category):
        def stop(*args, **kwargs):
            self.counts[category] += 1
            raise ValueError('Direct FILE reader attempted denied ' + category)
        return stop

    def __enter__(self):
        original_open = builtins.open
        original_io_open = io.open
        original_os_open = os.open
        def read_only_open(original):
            def checked(*args, **kwargs):
                mode = kwargs.get('mode', args[1] if len(args) > 1 else 'r')
                if not isinstance(mode, str) or any(flag in mode for flag in 'wax+'):
                    return self.denied('helperWrites')(*args, **kwargs)
                return original(*args, **kwargs)
            return checked
        def read_only_os_open(path, flags, *args, **kwargs):
            if flags & (os.O_WRONLY | os.O_RDWR | os.O_APPEND | os.O_CREAT | os.O_TRUNC):
                return self.denied('helperWrites')(path, flags, *args, **kwargs)
            return original_os_open(path, flags, *args, **kwargs)
        self.replace(builtins, 'open', read_only_open(original_open))
        self.replace(io, 'open', read_only_open(original_io_open))
        self.replace(os, 'open', read_only_os_open)
        for name in ('write', 'pwrite', 'mkdir', 'makedirs', 'unlink', 'remove', 'rmdir', 'removedirs',
                     'rename', 'renames', 'replace', 'chmod', 'fchmod', 'chown', 'lchown', 'fchown',
                     'truncate', 'ftruncate', 'link', 'symlink', 'utime', 'mknod', 'mkfifo', 'fsync', 'fdatasync'):
            self.replace(os, name, self.denied('helperWrites'))
        for name in ('Popen', 'run', 'call', 'check_call', 'check_output', 'getoutput', 'getstatusoutput'):
            self.replace(subprocess, name, self.denied('subprocesses'))
        for name in dir(os):
            if name in ('fork', 'forkpty', 'system', 'popen', 'posix_spawn', 'posix_spawnp') or name.startswith(('exec', 'spawn')):
                self.replace(os, name, self.denied('subprocesses'))
        self.replace(socket, 'socket', self.denied('sockets'))
        self.replace(socket, 'create_connection', self.denied('sockets'))
        self.replace(threading.Thread, 'start', self.denied('threads'))
        return self

    def helper_denials(self, guards, source):
        for name in ('write_new', 'write_json_new'):
            self.replace(guards, name, self.denied('helperWrites'))
        for name in ('main', 'compile_stage', 'metadata_stage', 'release_stage', 'proof_stage', 'fresh_root', 'freeze_directory'):
            self.replace(source, name, self.denied('stageCLI'))

    def __exit__(self, kind, value, traceback):
        for owner, name, original in reversed(self.saved):
            setattr(owner, name, original)
        self.saved.clear()
        return False


def initialize():
    require(sys.dont_write_bytecode and sys.flags.no_site == 1, "Exact Python -B -S required")
    require(Path(__file__).parent == ROOT / "tests", "Only the fixed fresh test context is allowed")
    for directory in (ROOT, SOURCE, ROOT / "tests"):
        info = directory.lstat()
        require(stat.S_ISDIR(info.st_mode) and info.st_uid == 501
                and stat.S_IMODE(info.st_mode) == 0o700, "Private fixture directories required")
    require(hashlib.sha256(owned_regular(BASE_PARENT)).hexdigest() == SOURCE_PINS["parent_stages"][1],
            "Frozen baseline source must remain unchanged")
    for path, expected in ((BINDINGS, (78509, "237b1d6954b4bb99a09c10432bee7ace84640f1f8afcac4f2afb83bfda64b3bb")),
                           (PHYSICAL / "junit-report.json", (4321, "389fd4b3b8ee373948c9c8348e0cb9e9fd2e0c403d9e2f6dbbb5e665e15a5365"))):
        raw = owned_regular(path)
        require((len(raw), hashlib.sha256(raw).hexdigest()) == expected, "Exact immutable evidence pin required")
    paths = [(name, check_source(name)) for name in SOURCE_PINS]
    require(all(name not in sys.modules for name in SOURCE_PINS), "No previously loaded helper family")
    denied = RootMutationDenied()
    denied.__enter__()
    try:
        loaded = {}
        for name, path in paths:
            spec = importlib.util.spec_from_file_location(name, path)
            require(spec is not None and spec.loader is not None, "Explicit source-only module required")
            module = importlib.util.module_from_spec(spec)
            sys.modules[name] = module
            spec.loader.exec_module(module)
            require(module.__name__ == name and Path(module.__file__) == path,
                    "Exact source import identity; never __main__")
            loaded[name] = module
        denied.helper_denials(loaded["preflight_guards"], loaded["parent_stages"])
        denied.helper_denials(loaded["history_preflight_guards"], loaded["history_v40_parent"])
        require(not any(denied.counts.values()), "Source imports attempted a denied action")
        return denied, loaded["parent_stages"]
    except BaseException:
        denied.__exit__(None, None, None)
        raise
