const { test, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
let general, participant, calls, expire;
const originalFetch = global.fetch;
const storage = {
  loadStoredGeneralSession: () => general,
  loadStoredParticipantSession: () => participant,
  saveGeneralSession: (next) => {
    general = next;
  },
  saveParticipantSession: (next) => {
    participant = next;
  },
  emitSessionSync: () => {},
  mapGeneralSession: (next) => next,
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
  const code = fs
    .readFileSync(filename, 'utf8')
    .replace('import.meta.env.VITE_API_BASE_URL', 'undefined');
  loaded._compile(
    ts.transpileModule(code, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const { apiRequest, apiPageRequest } = source('shared/api/client.ts');
beforeEach(() => {
  general = {
    accessToken: 'general-current',
    refreshToken: 'general-refresh',
    account: { email: 'preview@example.test' },
    operatorSession: {
      accessToken: 'general-current',
      refreshToken: 'general-refresh',
      staff: {},
    },
  };
  participant = {
    accessToken: 'general-expired',
    contestId: 'contest',
    isPreview: true,
    member: { email: 'preview@example.test' },
  };
  calls = [];
  expire = false;
  global.fetch = async (url, init) => {
    calls.push({ url, token: init.headers.authorization, method: init.method });
    if (url === '/api/auth/general/refresh') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            ...general,
            accessToken: 'general-refreshed',
            operatorSession: {
              ...general.operatorSession,
              accessToken: 'general-refreshed',
            },
          },
        }),
      };
    }
    if (expire && init.headers.authorization === 'Bearer general-current')
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'authentication_required' } }),
      };
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: [], page: { limit: 20, total_count: 0 } }),
    };
  };
});
after(() => {
  global.fetch = originalFetch;
});

test('preview requests always prefer the latest general token over an older stored preview token', async () => {
  await apiRequest('/contests/contest/problems', 'general-current');
  await apiPageRequest('/contests/contest/submissions', 'general-expired');
  await apiRequest('/contests/contest/boards');
  assert.deepEqual(
    calls.map((call) => call.token),
    Array(3).fill('Bearer general-current'),
  );
});

test('preview expiry uses general refresh only and persists the refreshed token into the preview session', async () => {
  expire = true;
  participant.accessToken = general.accessToken;
  await apiRequest('/contests/contest/problems', 'general-current');
  assert.deepEqual(
    calls.map((call) => call.url),
    [
      '/api/contests/contest/problems',
      '/api/auth/general/refresh',
      '/api/contests/contest/problems',
    ],
  );
  assert.equal(calls.at(-1).token, 'Bearer general-refreshed');
  assert.equal(general.accessToken, 'general-refreshed');
  assert.equal(participant.accessToken, 'general-refreshed');
  assert.equal(participant.isPreview, true);
});

test('preview session creation refreshes a general token before any staff or real participant session attempt', async () => {
  expire = true;
  participant = null;
  await apiRequest(
    '/auth/general/contests/contest/participant-preview-session',
    'general-current',
    { method: 'POST', body: '{}' },
  );
  assert.deepEqual(
    calls.map((call) => call.url),
    [
      '/api/auth/general/contests/contest/participant-preview-session',
      '/api/auth/general/refresh',
      '/api/auth/general/contests/contest/participant-preview-session',
    ],
  );
});

test('ordinary participant sessions keep their participant token', async () => {
  participant.isPreview = false;
  participant.accessToken = 'real-participant';
  await apiRequest('/contests/contest/problems', 'general-current');
  assert.equal(calls[0].token, 'Bearer real-participant');
});
