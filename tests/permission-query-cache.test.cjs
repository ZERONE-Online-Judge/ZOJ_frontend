const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');
let generalSession, participantSession;
const storage = {
  loadStoredGeneralSession: () => generalSession,
  loadStoredParticipantSession: () => participantSession,
};
const cache = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) =>
    id === '@/domains/identityAccess/sessionStorage'
      ? storage
      : id.startsWith('@/')
        ? source(id.slice(2) + '.ts')
        : native(id);
  cache.set(filename, loaded);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const { tokenQueryIdentity } = source(
  'domains/identityAccess/queryIdentity.ts',
);
const authorScopes = [
  'contest.view',
  'contest.problem.review',
  'contest.problem.manage',
  'contest.problem.resource.view',
];
const reviewerScopes = ['contest.view', 'contest.problem.review'];
function setScopes(scopes) {
  generalSession.operatorSession.staff.contest_scopes = {
    contest: [...scopes],
  };
  generalSession.operatorContests = [
    { contest: { contest_id: 'contest' }, scopes: [...scopes] },
  ];
}
beforeEach(() => {
  generalSession = {
    accessToken: 'general-secret-token',
    account: { email: 'same@example.test' },
    operatorSession: {
      accessToken: 'operator-secret-token',
      staff: {
        email: 'same@example.test',
        is_service_master: false,
        contest_scopes: {},
      },
    },
    operatorContests: [],
  };
  participantSession = null;
  setScopes(authorScopes);
});

test('same account narrowed from author to reviewer cannot reuse privileged problem and asset cache', () => {
  const client = new QueryClient();
  for (const token of ['general-secret-token', 'operator-secret-token']) {
    setScopes(authorScopes);
    const before = tokenQueryIdentity(token);
    const problemKey = ['operator', 'problems', 'contest', before];
    const assetKey = [
      'operator',
      'problem-assets',
      'contest',
      'problem',
      before,
    ];
    client.setQueryData(problemKey, [{ editorial: 'private solution' }]);
    client.setQueryData(assetKey, [{ storage_key: 'private-checker' }]);
    setScopes(reviewerScopes);
    const after = tokenQueryIdentity(token);
    assert.notEqual(after, before);
    assert.equal(
      client.getQueryData(['operator', 'problems', 'contest', after]),
      undefined,
    );
    assert.equal(
      client.getQueryData([
        'operator',
        'problem-assets',
        'contest',
        'problem',
        after,
      ]),
      undefined,
    );
  }
  client.clear();
});

test('permission identity is stable across token rotation, scope ordering, duplicates, and contest ordering', () => {
  generalSession.operatorSession.staff.contest_scopes.extra = [
    'contest.scoreboard.view',
    'contest.view',
  ];
  generalSession.operatorContests.push({
    contest: { contest_id: 'extra' },
    scopes: ['contest.view', 'contest.scoreboard.view'],
  });
  const generalBefore = tokenQueryIdentity(generalSession.accessToken);
  const operatorBefore = tokenQueryIdentity(
    generalSession.operatorSession.accessToken,
  );
  generalSession.accessToken = 'rotated-general-secret';
  generalSession.operatorSession.accessToken = 'rotated-operator-secret';
  generalSession.operatorContests.reverse();
  generalSession.operatorSession.staff.contest_scopes = {
    extra: ['contest.view', 'contest.scoreboard.view'],
    contest: [...authorScopes].reverse().concat('contest.view'),
  };
  assert.equal(tokenQueryIdentity(generalSession.accessToken), generalBefore);
  assert.equal(
    tokenQueryIdentity(generalSession.operatorSession.accessToken),
    operatorBefore,
  );
  assert.equal(generalBefore.includes('general-secret-token'), false);
  assert.equal(operatorBefore.includes('operator-secret-token'), false);
});

test('removing an assignment or changing service-master authority changes both identities', () => {
  const tokens = ['general-secret-token', 'operator-secret-token'];
  const initial = tokens.map(tokenQueryIdentity);
  generalSession.operatorSession.staff.is_service_master = true;
  const master = tokens.map(tokenQueryIdentity);
  for (let i = 0; i < tokens.length; i++)
    assert.notEqual(master[i], initial[i]);
  generalSession.operatorSession.staff.is_service_master = false;
  generalSession.operatorContests = [];
  generalSession.operatorSession.staff.contest_scopes = {};
  const removed = tokens.map(tokenQueryIdentity);
  for (let i = 0; i < tokens.length; i++)
    assert.notEqual(removed[i], initial[i]);
});

test('general fallback and staff scopes form the same permission union used by the UI', () => {
  generalSession.operatorSession = null;
  const fallback = tokenQueryIdentity(generalSession.accessToken);
  generalSession.operatorContests[0].scopes = [...reviewerScopes];
  assert.notEqual(tokenQueryIdentity(generalSession.accessToken), fallback);
  generalSession.operatorSession = {
    accessToken: 'operator-secret-token',
    staff: {
      email: 'same@example.test',
      is_service_master: false,
      contest_scopes: { contest: authorScopes },
    },
  };
  assert.equal(tokenQueryIdentity(generalSession.accessToken), fallback);
  generalSession.operatorContests[0].scopes.push('contest.scoreboard.view');
  assert.notEqual(tokenQueryIdentity(generalSession.accessToken), fallback);
});

test('participant and anonymous identities retain existing behavior', () => {
  participantSession = {
    accessToken: 'participant-secret',
    contestId: 'contest',
    member: { email: 'participant@example.test' },
    division: { division_id: 'division' },
  };
  assert.equal(
    tokenQueryIdentity('participant-secret'),
    'participant:contest:participant@example.test:division',
  );
  assert.equal(tokenQueryIdentity(null), 'anonymous');
  assert.equal(tokenQueryIdentity(), 'anonymous');
});
