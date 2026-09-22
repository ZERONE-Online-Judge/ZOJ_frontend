const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://judge.test/',
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { create } = require('zustand');
const h = React.createElement;
let hidden = false;
Object.defineProperty(document, 'hidden', {
  configurable: true,
  get: () => hidden,
});
let intervals, nextInterval, requests, applied;
window.setInterval = (callback, delay) => {
  const id = ++nextInterval;
  intervals.set(id, { callback, delay });
  return id;
};
window.clearInterval = (id) => intervals.delete(id);
const useSessionStore = create((set) => ({
  generalSession: null,
  setGeneralSession: (session) => {
    applied.push(session);
    set({ generalSession: session });
  },
}));
function staffSession(
  token = 'token',
  email = 'staff@test',
  scopes = ['contest.*'],
) {
  return {
    accessToken: token,
    account: { email, display_name: email },
    participantContests: [],
    operatorContests: [{ contest: { contest_id: 'contest' }, scopes }],
    operatorSession: {
      accessToken: `staff-${token}`,
      staff: {
        email,
        display_name: email,
        is_service_master: false,
        contest_scopes: { contest: scopes },
      },
    },
  };
}
const mocks = {
  '@/domains/identityAccess/sessionStore': { useSessionStore },
  '@/domains/identityAccess/api': {
    getGeneralMe: (token, previous) =>
      new Promise((resolve, reject) => {
        const request = {
          token,
          previous,
          settled: false,
          resolve: (session) => {
            request.settled = true;
            resolve(session);
          },
          reject: (error) => {
            request.settled = true;
            reject(error);
          },
        };
        requests.push(request);
      }),
  },
};
const cache = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (mocks[id]) return mocks[id];
    if (!id.startsWith('@/')) return native(id);
    return source(
      ['.ts', '.tsx']
        .map((ext) => id.slice(2) + ext)
        .find((file) => fs.existsSync(path.resolve(__dirname, '../src', file))),
    );
  };
  cache.set(filename, loaded);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const { useRefreshGeneralSession } = source(
  'domains/identityAccess/useRefreshGeneralSession.ts',
);
const { hasContestPermission } = source(
  'domains/identityAccess/permissions.ts',
);
let root, container, mounted;
beforeEach(() => {
  hidden = false;
  intervals = new Map();
  nextInterval = 0;
  requests = [];
  applied = [];
  useSessionStore.setState({ generalSession: staffSession() });
  document.body.innerHTML = '';
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  mounted = true;
});
afterEach(async () => {
  if (mounted) await act(async () => root.unmount());
  await act(async () => {
    for (const request of requests)
      if (!request.settled) request.resolve(request.previous);
  });
  assert.equal(intervals.size, 0);
});
after(() => dom.window.close());
function Probe() {
  const loading = useRefreshGeneralSession();
  const session = useSessionStore((state) => state.generalSession);
  return h(
    'output',
    {
      'data-loading': String(loading),
      'data-can-manage': String(
        hasContestPermission(session, 'contest', 'contest.staff.manage'),
      ),
    },
    session?.account.email ?? 'logged out',
  );
}
async function render(count = 1) {
  await act(async () =>
    root.render(
      h(
        React.Fragment,
        null,
        ...Array.from({ length: count }, (_, key) => h(Probe, { key })),
      ),
    ),
  );
}
async function focus() {
  await act(async () => window.dispatchEvent(new dom.window.Event('focus')));
}
async function visibility(value) {
  hidden = value;
  await act(async () =>
    document.dispatchEvent(new dom.window.Event('visibilitychange')),
  );
}
async function tick() {
  await act(async () => {
    for (const { callback } of [...intervals.values()]) callback();
  });
}
async function resolve(request, session = request.previous) {
  await act(async () => request.resolve(session));
}
function loadingValues() {
  return [...container.querySelectorAll('output')].map(
    (output) => output.dataset.loading,
  );
}

test('shared hook consumers dedupe requests and apply narrower roles on focus without background loading or a refresh loop', async () => {
  await render(2);
  assert.equal(requests.length, 1);
  assert.deepEqual(loadingValues(), ['true', 'true']);
  await resolve(requests[0]);
  assert.deepEqual(loadingValues(), ['false', 'false']);
  assert.equal(requests.length, 1);
  await focus();
  await visibility(false);
  await focus();
  assert.equal(requests.length, 2);
  assert.deepEqual(loadingValues(), ['false', 'false']);
  await resolve(
    requests[1],
    staffSession('token', 'staff@test', [
      'contest.view',
      'contest.scoreboard.view',
    ]),
  );
  assert.deepEqual(
    [...container.querySelectorAll('output')].map(
      (output) => output.dataset.canManage,
    ),
    ['false', 'false'],
  );
  assert.equal(requests.length, 2);
  assert.equal(useSessionStore.getState().generalSession.accessToken, 'token');
});

test('visible staff refresh every minute and a revoked role removes controls and stops staff polling', async () => {
  await render();
  await resolve(requests[0]);
  assert.deepEqual(
    [...intervals.values()].map(({ delay }) => delay),
    [60_000],
  );
  await tick();
  assert.equal(requests.length, 2);
  const revoked = {
    ...staffSession(),
    operatorSession: null,
    operatorContests: [],
  };
  await resolve(requests[1], revoked);
  assert.equal(container.querySelector('output').dataset.canManage, 'false');
  assert.deepEqual(loadingValues(), ['false']);
  await tick();
  assert.equal(requests.length, 2);
  await focus();
  assert.equal(
    requests.length,
    3,
    'focus can discover newly granted staff roles',
  );
});

test('hidden tabs skip timer and focus refresh, then refresh once when visible again', async () => {
  await render();
  await resolve(requests[0]);
  await visibility(true);
  await tick();
  await focus();
  assert.equal(requests.length, 1);
  await visibility(false);
  await tick();
  await focus();
  assert.equal(requests.length, 2);
  await resolve(requests[1]);
  await tick();
  assert.equal(requests.length, 3);
});

test('token or account changes and logout discard old pending responses instead of restoring prior privileges', async () => {
  await render();
  const oldRequest = requests[0];
  const next = staffSession('next-token', 'next@test', [
    'contest.view',
    'contest.problem.review',
  ]);
  await act(async () => useSessionStore.setState({ generalSession: next }));
  assert.equal(requests.length, 2);
  assert.equal(requests[1].token, 'next-token');
  await resolve(oldRequest);
  assert.equal(useSessionStore.getState().generalSession, next);
  assert.equal(applied.length, 0);
  assert.deepEqual(loadingValues(), ['true']);
  await resolve(requests[1], next);
  assert.deepEqual(loadingValues(), ['false']);
  const sameTokenDifferentAccount = staffSession('next-token', 'third@test', [
    'contest.view',
  ]);
  await act(async () =>
    useSessionStore.setState({ generalSession: sameTokenDifferentAccount }),
  );
  assert.equal(requests.length, 3);
  await resolve(requests[2], next);
  assert.equal(
    useSessionStore.getState().generalSession,
    sameTokenDifferentAccount,
  );
  await focus();
  const beforeLogout = applied.length;
  await act(async () => useSessionStore.setState({ generalSession: null }));
  await resolve(requests[3]);
  assert.equal(useSessionStore.getState().generalSession, null);
  assert.equal(applied.length, beforeLogout);
  assert.equal(intervals.size, 0);
  assert.deepEqual(loadingValues(), ['false']);
});

test('unmount removes event and interval listeners and ignores a late response', async () => {
  await render();
  await act(async () => root.unmount());
  mounted = false;
  assert.equal(intervals.size, 0);
  await focus();
  await visibility(false);
  assert.equal(requests.length, 1);
  await resolve(requests[0]);
  assert.deepEqual(applied, []);
});

test('initial errors clear the loading flag and later focus retries with the latest stored session', async () => {
  await render();
  await act(async () => requests[0].reject(new Error('temporary offline')));
  assert.deepEqual(loadingValues(), ['false']);
  const updated = staffSession('token', 'staff@test', [
    'contest.view',
    'contest.scoreboard.view',
  ]);
  await act(async () => useSessionStore.setState({ generalSession: updated }));
  assert.equal(
    requests.length,
    1,
    'same token session edits do not restart the effect',
  );
  await focus();
  assert.equal(requests[1].previous, updated);
  assert.deepEqual(loadingValues(), ['false']);
  await resolve(requests[1], updated);
  assert.equal(applied.at(-1), updated);
});
