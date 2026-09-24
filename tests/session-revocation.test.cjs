const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://judge.test/contests/contest/problems',
});
Object.assign(global, {
  window: dom.window,
  document: dom.window.document,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
});
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { MemoryRouter } = require('react-router-dom');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const h = React.createElement;
const cache = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) =>
    id.startsWith('@/')
      ? source(
          ['.ts', '.tsx']
            .map((ext) => id.slice(2) + ext)
            .find((file) =>
              fs.existsSync(path.resolve(__dirname, '../src', file)),
            ),
        )
      : native(id);
  cache.set(filename, loaded);
  loaded._compile(
    ts.transpileModule(
      fs
        .readFileSync(filename, 'utf8')
        .replace('import.meta.env.VITE_API_BASE_URL', 'undefined'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    ).outputText,
    filename,
  );
  return loaded.exports;
}
const storage = source('domains/identityAccess/sessionStorage.ts');
const { useSessionStore } = source('domains/identityAccess/sessionStore.ts');
const Refresh = source('app/providers/SessionRefreshProvider.tsx').default;
const Sync = source('app/providers/SessionSyncProvider.tsx').default;
const Expiry = source('app/providers/SessionExpiryRedirector.tsx').default;
const { apiRequest } = source('shared/api/client.ts');
let root, queryClient, streams, requests;
const originalFetch = global.fetch;
const general = {
  accessToken: 'general-one',
  refreshToken: 'refresh-one',
  account: { email: 'participant@example.test', display_name: 'Participant' },
  participantContests: [],
  operatorContests: [],
  operatorSession: null,
};
const participant = {
  accessToken: 'participant-one',
  contestId: 'contest',
  member: { email: general.account.email },
};
const jsonResponse = (status, data = {}) => ({
  ok: status < 400,
  status,
  json: async () =>
    status < 400
      ? { data }
      : {
          error: {
            code: 'authentication_required',
            message: 'Session required',
          },
        },
});
function streamResponse(url, init) {
  let controller,
    closed = false;
  const body = new ReadableStream({
    start(value) {
      controller = value;
    },
    cancel() {
      closed = true;
    },
  });
  init.signal.addEventListener('abort', () => {
    if (!closed) {
      closed = true;
      controller.close();
    }
  });
  const stream = {
    token: init.headers.authorization,
    send(text) {
      if (!closed) controller.enqueue(new TextEncoder().encode(text));
    },
  };
  streams.push(stream);
  return { ok: true, status: 200, body };
}
beforeEach(() => {
  document.body.innerHTML = '<main></main>';
  window.localStorage.clear();
  window.sessionStorage.clear();
  storage.saveGeneralSession(general);
  storage.saveParticipantSession(participant);
  useSessionStore.getState().syncSessionsFromStorage();
  requests = [];
  streams = [];
  global.fetch = async (url, init) => {
    requests.push({ url, init });
    return streamResponse(url, init);
  };
  root = createRoot(document.querySelector('main'));
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});
async function mount() {
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client: queryClient },
        h(Sync, null, h(Refresh, null, h(MemoryRouter, null, h(Expiry)))),
      ),
    ),
  );
}
afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
});
after(() => {
  global.fetch = originalFetch;
  dom.window.close();
});

test('server revocation logs out the whole account and opens the modal without a user request', async () => {
  await mount();
  assert.equal(streams.length, 1);
  assert.equal(requests[0].url, '/api/auth/session-events');
  assert.equal(streams[0].token, 'Bearer general-one');
  queryClient.setQueryData(['private-problem'], { statement: 'private' });
  await act(async () => {
    streams[0].send('event: ready\ndata: {}\n\nevent: session_');
    streams[0].send('revoked\ndata: {}\n\n');
  });
  assert.equal(storage.loadStoredGeneralSession(), null);
  assert.equal(storage.loadStoredParticipantSession(), null);
  assert.equal(useSessionStore.getState().generalSession, null);
  assert.equal(useSessionStore.getState().participantSession, null);
  assert.equal(queryClient.getQueryData(['private-problem']), undefined);
  assert.equal(document.querySelector('dialog')?.open, true);
  assert.match(
    document.querySelector('dialog').textContent,
    /로그아웃되었습니다/,
  );
  assert.equal(requests.length, 1);
});

test('connection failure preserves login and does not show a logout modal', async () => {
  global.fetch = async () => {
    throw new Error('offline');
  };
  await mount();
  assert.equal(
    storage.loadStoredGeneralSession().accessToken,
    general.accessToken,
  );
  assert.equal(document.querySelector('dialog'), null);
});

test('a revoked login rejected on reconnection cannot refresh and clears both sessions', async () => {
  global.fetch = async (url) => {
    requests.push(url);
    return jsonResponse(401);
  };
  await mount();
  assert.deepEqual(requests, [
    '/api/auth/session-events',
    '/api/auth/general/me',
    '/api/auth/general/refresh',
  ]);
  assert.equal(storage.loadStoredGeneralSession(), null);
  assert.equal(storage.loadStoredParticipantSession(), null);
  assert.equal(document.querySelector('dialog')?.open, true);
});

test('normal token expiry refreshes and reconnects without logging out', async () => {
  const profile = {
    access_token: 'general-two',
    refresh_token: general.refreshToken,
    account: general.account,
    participant_contests: [],
    operator_contests: [],
  };
  global.fetch = async (url, init) => {
    if (url.endsWith('/refresh')) return jsonResponse(200, profile);
    if (init.headers.authorization === 'Bearer general-one')
      return jsonResponse(401);
    return url.endsWith('/session-events')
      ? streamResponse(url, init)
      : jsonResponse(200, profile);
  };
  await mount();
  assert.equal(storage.loadStoredGeneralSession().accessToken, 'general-two');
  assert.equal(
    storage.loadStoredParticipantSession().accessToken,
    participant.accessToken,
  );
  assert.equal(streams.at(-1).token, 'Bearer general-two');
  assert.equal(document.querySelector('dialog'), null);
  assert.equal(
    storage.expireStoredAccountSession('general-one', '/late-response'),
    false,
  );
  assert.equal(storage.loadStoredGeneralSession().accessToken, 'general-two');
});

test('another tab receives the logout modal after shared storage is cleared', async () => {
  await mount();
  storage.saveGeneralSession(null);
  storage.saveParticipantSession(null);
  await act(async () =>
    window.dispatchEvent(
      new window.StorageEvent('storage', {
        key: storage.SESSION_EXPIRED_STORAGE_KEY,
        newValue: JSON.stringify({
          email: general.account.email,
          requestPath: '/auth/session-events',
        }),
      }),
    ),
  );
  assert.equal(document.querySelector('dialog')?.open, true);
  assert.equal(useSessionStore.getState().participantSession, null);
});

test('participant requests keep their token and a rejected automatic reissue signs out the account', async () => {
  await mount();
  global.fetch = async (url, init) => {
    requests.push({ url, token: init.headers.authorization });
    return jsonResponse(url.includes('participant-session') ? 403 : 401);
  };
  await act(async () =>
    assert.rejects(
      apiRequest('/contests/contest/problems', participant.accessToken),
    ),
  );
  assert.equal(requests[1].token, 'Bearer participant-one');
  assert.equal(
    requests[2].url,
    '/api/auth/general/contests/contest/participant-session',
  );
  assert.equal(storage.loadStoredGeneralSession(), null);
  assert.equal(storage.loadStoredParticipantSession(), null);
  assert.equal(document.querySelector('dialog')?.open, true);
});

test('a refresh response already in flight cannot restore a forcibly logged-out account', async () => {
  await mount();
  let completeRefresh;
  global.fetch = async (url) =>
    url.endsWith('/refresh')
      ? new Promise((resolve) => {
          completeRefresh = resolve;
        })
      : jsonResponse(401);
  let pending;
  await act(async () => {
    pending = apiRequest('/auth/general/me', general.accessToken).catch(
      (error) => error,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  assert.ok(completeRefresh);
  await act(async () =>
    streams[0].send('event: session_revoked\ndata: {}\n\n'),
  );
  await act(async () => {
    completeRefresh(
      jsonResponse(200, {
        access_token: 'late-token',
        refresh_token: 'late-refresh',
        account: general.account,
        participant_contests: [],
        operator_contests: [],
      }),
    );
    await pending;
  });
  assert.equal(storage.loadStoredGeneralSession(), null);
  assert.equal(storage.loadStoredParticipantSession(), null);
  assert.equal(document.querySelector('dialog')?.open, true);
});
