"""Fixed single-original-CSV V41 rank-history capability; no catalog clone authority."""
import copy
import re
import threading
import uuid
from fixture_guard import require

SOURCE_PIN = {
    'path': '/private/tmp/ordenfix-pro-review-chain-fueuys_0/source/src/test/java/'
            'com/leonardorozza/mvgrreparacionesbackend/cuenta/recovery/RecoveryProfileDeletionIT.java',
    'bytes': 59145,
    'sha256': '40371265d3cd628985bf2bf40a29c2b5a755a2fed15ba6c857c69c9da3df750e',
}
METHOD = 'v41RecoveryRejectsRankOnlyHistoryDrift'
SELECTOR = ('com.leonardorozza.mvgrreparacionesbackend.cuenta.recovery.RecoveryProfileDeletionIT'
            '#v41RecoveryRejectsRankOnlyHistoryDrift(java.lang.String,boolean,java.lang.String)')
SELECTION_MARKER = 'SINGLE_ORIGINAL_V41_RANK_HISTORY_CSV_CASE'
PARAMETER_TYPES = ('java.lang.String', 'boolean', 'java.lang.String')
CSV_ROWS = ('C,false,REORDER', 'C,true,REORDER', 'en_US.utf8,false,REORDER', 'en_US.utf8,true,REORDER',
            'C,false,V41_NOT_LATEST', 'C,true,V41_NOT_LATEST', 'en_US.utf8,false,V41_NOT_LATEST', 'en_US.utf8,true,V41_NOT_LATEST',
            'C,false,OLDER_TAIL', 'C,true,OLDER_TAIL', 'en_US.utf8,false,OLDER_TAIL', 'en_US.utf8,true,OLDER_TAIL')
LOCALES = ('C', 'C', 'en_US.utf8', 'en_US.utf8') * 3
RANK_KINDS = ('REORDER', 'V41_NOT_LATEST', 'OLDER_TAIL')
PREFIX = ('--host=/var/run/postgresql', '--username=fixture')
SCOPE = 'v41-recovery-fixed-single-csv-rank-history'


def _fixed_plan(index):
    phases = ('setup-create', 'migrated-create')
    tokens = (7, 7)
    if index % 2 == 1:
        phases += ('dump', 'restored-create', 'restore')
        tokens += (6, 7, 8)
    return tuple((index, phase) for phase in phases), tokens


def validate_spec(spec):
    require(isinstance(spec, dict) and type(spec.get('originalRowIndex')) is int
            and 0 <= spec['originalRowIndex'] < 12,
            'Exactly one genuine original V41 rank row index in 0..11 is required.')
    index = spec['originalRowIndex']
    plan, tokens = _fixed_plan(index)
    steps = tuple('case-%d-%s' % (case + 1, phase) for case, phase in plan)
    expected = dict(schema=1, scope=SCOPE, selector=SELECTOR, selectionMarker=SELECTION_MARKER,
                    sourcePin=SOURCE_PIN, methodName=METHOD, parameterTypes=list(PARAMETER_TYPES),
                    csvSource=list(CSV_ROWS), originalRowIndex=index,
                    originalInvocationOrdinal=index + 1, rankKind=RANK_KINDS[index // 4], maintenanceExec=True,
                    steps=list(steps), tokens=list(tokens), vectors=[])
    require(spec == expected and type(spec.get('schema')) is int
            and type(spec.get('originalInvocationOrdinal')) is int
            and isinstance(spec.get('sourcePin'), dict)
            and type(spec['sourcePin'].get('bytes')) is int
            and spec.get('maintenanceExec') is True
            and all(type(value) is str for value in spec.get('parameterTypes', []))
            and all(type(value) is str for value in spec.get('csvSource', []))
            and all(type(value) is str for value in spec.get('steps', []))
            and all(type(token) is int for token in spec.get('tokens', [])),
            'Exact original V41 declaration/CSV12/single ordinal/rank kind/fixed no-clone plan metadata required.')
    return copy.deepcopy(spec)


class RecoveryRegistry:
    def __init__(self, spec, nonce):
        self.spec = validate_spec(spec)
        self.case = self.spec['originalRowIndex']
        self.rank_kind = self.spec['rankKind']
        self.plan, self.tokens = _fixed_plan(self.case)
        self.steps = tuple(self.spec['steps'])
        require(isinstance(nonce, str) and re.fullmatch('[0-9a-f]{32}', nonce), 'Fresh run nonce required.')
        self.nonce = nonce
        self.lock = threading.Lock()
        self.ordinal = 0
        self.failed = False
        self.attempts, self.databases, self.dumps = [], [], []

    def observation(self):
        return copy.deepcopy(dict(nonce=self.nonce, selector=SELECTOR, selectionMarker=SELECTION_MARKER,
            sourcePin=SOURCE_PIN, scope=SCOPE, methodName=METHOD, parameterTypes=list(PARAMETER_TYPES),
            csvSource=list(CSV_ROWS), originalRowIndex=self.case,
            originalInvocationOrdinal=self.case + 1, rankKind=self.rank_kind, maintenanceExec=True,
            completedSteps=self.ordinal, nextOrdinal=self.ordinal + 1 if self.ordinal < len(self.plan) else None,
            complete=self.ordinal == len(self.plan) and not self.failed, failed=self.failed,
            attempts=self.attempts, databases=self.databases, dumps=self.dumps))

    def _database(self, name):
        require(isinstance(name, str) and re.fullmatch('profile_[0-9a-f]{32}', name),
                'Exact source-generated lowercase profile UUID32 name required.')
        require(name not in [item['database'] for item in self.databases],
                'A database name already reserved in this run cannot be reissued.')
        return name

    def _dump_file(self, path):
        require(isinstance(path, str) and re.fullmatch('/tmp/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-'
                '[0-9a-f]{4}-[0-9a-f]{12}\\.dump', path), 'Canonical lowercase container-local UUID dump required.')
        require(str(uuid.UUID(path[5:-5])) == path[5:-5], 'Noncanonical dump UUID rejected.')
        require(path not in [item['file'] for item in self.dumps], 'Dump path cannot be reissued in this run.')
        return path

    def _case_database(self, case, role):
        selected = [item for item in self.databases if item['caseOrdinal'] == case + 1 and item['role'] == role]
        require(len(selected) == 1 and selected[0]['rankKind'] == self.rank_kind,
                'Only the current fixed case and rank-kind database role is permitted.')
        return selected[0]

    def _case_dump(self, case, role):
        selected = [item for item in self.dumps if item['caseOrdinal'] == case + 1 and item['role'] == role]
        require(len(selected) == 1 and selected[0]['rankKind'] == self.rank_kind,
                'Only the exact current fixed case and rank-kind metadata dump is permitted.')
        return selected[0]

    def reserve(self, argv):
        require(self.lock.acquire(blocking=False), 'Concurrent exec attempt rejected before API.')
        try:
            require(not self.failed and self.ordinal < len(self.plan) and len(self.attempts) == self.ordinal,
                    'Failed/attempted/completed registry cannot retry, replay or add an ordinal.')
            require(isinstance(argv, list) and all(type(value) is str for value in argv)
                    and len(argv) == self.tokens[self.ordinal], 'Exact source token count and string argv required.')
            require(tuple(argv[1:3]) == PREFIX, 'Exact source host/fixture user required.')
            case, phase = self.plan[self.ordinal]
            collate = ctype = LOCALES[case]
            ordinal = self.ordinal + 1
            if phase in ('setup-create', 'migrated-create', 'restored-create'):
                locales = ('en_US.utf8', 'en_US.utf8') if phase == 'setup-create' else (collate, ctype)
                require(argv[:6] == ['createdb', *PREFIX, '--template=template0',
                                    '--lc-collate=' + locales[0], '--lc-ctype=' + locales[1]],
                        'Only the exact source template0/phase/CSV locale create is permitted.')
                current_dump = None
                if phase == 'restored-create':
                    current_dump = self._case_dump(case, 'metadata')
                    require(current_dump['complete'] and current_dump['targetDatabase'] is None,
                            'Fresh restored target requires the completed exact current case dump.')
                name = self._database(argv[6])
                self.databases.append(dict(database=name, createdAtOrdinal=ordinal, complete=False, restored=False,
                    caseOrdinal=case + 1, rankKind=self.rank_kind, role=phase.removesuffix('-create'),
                    collate=locales[0], ctype=locales[1]))
                if current_dump is not None:
                    current_dump['targetDatabase'] = name
            elif phase == 'dump':
                role = 'migrated'
                database = self._case_database(case, role)
                require(database['complete'],
                        'Metadata dump requires the completed migrated current-case DB.')
                require(argv[:5] == ['pg_dump', *PREFIX, '--dbname=' + database['database'], '--format=custom']
                        and argv[5].startswith('--file='), 'Dump source must be exact current-run phase-owned database.')
                path = self._dump_file(argv[5][7:])
                self.dumps.append(dict(file=path, sourceDatabase=database['database'], targetDatabase=None,
                    dumpedAtOrdinal=ordinal, complete=False, restoredAtOrdinal=None, caseOrdinal=case + 1,
                    rankKind=self.rank_kind, role='metadata'))
            elif phase == 'restore':
                role = 'metadata'
                current_dump = self._case_dump(case, role)
                database = self._case_database(case, 'restored')
                require(current_dump['complete'] and database['complete']
                        and not database['restored'] and current_dump['targetDatabase'] == database['database']
                        and (database['collate'], database['ctype']) == (collate, ctype),
                        'Restore requires its completed current-case metadata dump and exact fresh CSV-locale target.')
                require(argv == ['pg_restore', *PREFIX, '--dbname=' + database['database'],
                                  '--exit-on-error', '--single-transaction', '--no-owner', current_dump['file']],
                        'Restore source/target/file linkage or exact source flags differ.')
            else:
                require(False, 'Unknown phase cannot reserve any operation.')
            attempt = dict(ordinal=ordinal, step=self.steps[self.ordinal], argv=list(argv), completed=False,
                           exitCode=None, framingEOF=False, caseOrdinal=case + 1, rankKind=self.rank_kind, phase=phase)
            self.attempts.append(attempt)
            return copy.deepcopy(attempt)
        except BaseException:
            self.lock.release()
            raise

    def complete(self, exit_code):
        # The unchanged owner reaches this seam only after full raw EOF, stopped
        # exec/container identity and argv, and genuine integer exit checks.
        require(self.lock.locked() and len(self.attempts) == self.ordinal + 1,
                'Only the active reserved exec can complete.')
        require(type(exit_code) is int, 'Genuine integer exec exit required.')
        attempt = self.attempts[-1]
        require(attempt['exitCode'] is None, 'A reserved exec can record its completion only once.')
        attempt.update(exitCode=exit_code, framingEOF=True)
        if exit_code != 0:
            self.failed = True
            return
        attempt['completed'] = True
        case, phase = self.plan[self.ordinal]
        if phase in ('setup-create', 'migrated-create', 'restored-create'):
            self.databases[-1]['complete'] = True
        elif phase == 'dump':
            self.dumps[-1]['complete'] = True
        elif phase == 'restore':
            role = 'metadata'
            self._case_database(case, 'restored')['restored'] = True
            self._case_dump(case, role)['restoredAtOrdinal'] = self.ordinal + 1
        else:
            require(False, 'Unknown phase cannot complete any operation.')
        self.ordinal += 1

    def release(self):
        require(self.lock.locked(), 'Only an active reservation can be released.')
        if len(self.attempts) != self.ordinal:
            self.failed = True
        self.lock.release()
