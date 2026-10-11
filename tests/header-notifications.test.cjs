const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://zoj.kr/',
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
const React = require('react');
const { act, createElement: h } = React;
const { createRoot } = require('react-dom/client');
const { MemoryRouter, useLocation } = require('react-router-dom');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const storageKey = 'zoj.headerNotifications.v1';
const session = {
  accessToken: 'test-token',
  contestId: 'contest',
  team: { team_name: '팀' },
  member: { name: '참가자' },
};
let root,
  client,
  currentPath,
  serverItems,
  updateCalls,
  getCalls,
  failUpdate,
  failFetch,
  generalSession,
  currentSession,
  serverPageSize;
const cache = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id.endsWith('.css')) return {};
    if (id === '@/domains/contestRuntime/useContestParticipantSession')
      return {
        useContestParticipantSession: () => ({
          activeParticipantSession: currentSession,
          participantSession: currentSession,
          generalSession,
          token: generalSession?.accessToken ?? currentSession?.accessToken,
          isPreview: false,
        }),
      };
    if (id === '@/domains/identityAccess/queryIdentity')
      return { tokenQueryIdentity: (token) => token ?? 'anonymous' };
    if (id === '@/domains/serviceCommunication/notifications')
      return {
        getNotifications: async (token, _contestId, offset = 0) => {
          getCalls.push(token);
          if (failFetch) throw new Error('offline');
          const items = serverItems.filter(
            (item) => !item.owner || item.owner === token,
          );
          return {
            items: items.slice(offset, offset + serverPageSize),
            unread_count: items.filter((item) => !item.read_at).length,
            total_count: items.length,
            next_offset:
              items.length > offset + serverPageSize
                ? offset + serverPageSize
                : null,
          };
        },
        updateNotification: async (token, id, action, contestId) => {
          updateCalls.push({ token, id, action, contestId });
          if (failUpdate) throw new Error('offline');
          if (action === 'delete')
            serverItems = serverItems.filter(
              (item) => item.notification_id !== id,
            );
          else
            serverItems = serverItems.map((item) =>
              item.notification_id !== id
                ? item
                : {
                    ...item,
                    ...(action === 'dismiss'
                      ? { dismissed_at: '2026-10-11T15:00:00Z' }
                      : {
                          read_at:
                            action === 'read' ? '2026-10-11T15:00:00Z' : null,
                        }),
                  },
            );
          return { notification_id: id };
        },
        readAllNotifications: async (token) => {
          updateCalls.push({ token, action: 'read-all' });
          if (failUpdate) throw new Error('offline');
          serverItems = serverItems.map((item) => ({
            ...item,
            read_at: '2026-10-11T15:00:00Z',
          }));
          return { updated_count: serverItems.length };
        },
      };
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
const Notifications = source(
  'components/layout/HeaderNotifications.tsx',
).default;
function Observer() {
  currentPath = useLocation().pathname;
  return null;
}
function notification(id, type = 'notice', values = {}) {
  return {
    notification_id: id,
    notification_type: type,
    contest_id: 'contest',
    contest_title: '대회',
    title: `${type} 소식`,
    body: `${type} 내용`,
    href: '/contests/contest/board',
    created_at: '2026-10-11T12:00:00Z',
    read_at: null,
    dismissed_at: null,
    reason: null,
    ...values,
  };
}
function panel() {
  return document.querySelector('.header-panel');
}
function removeButtons() {
  return [...document.querySelectorAll('.header-notification-remove')];
}
function badge() {
  return document.querySelector('.header-action-count')?.textContent;
}
beforeEach(() => {
  serverItems = [
    notification('n1'),
    notification('a1', 'answer', { read_at: '2026-10-11T13:00:00Z' }),
    notification('s1', 'submission'),
  ];
  updateCalls = [];
  getCalls = [];
  failUpdate = false;
  failFetch = false;
  generalSession = null;
  currentSession = session;
  serverPageSize = 50;
  document.body.innerHTML = '<main></main>';
  window.localStorage.clear();
  root = createRoot(document.querySelector('main'));
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
});
after(() => dom.window.close());
async function settle() {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
}
async function mount(path = '/contests/contest') {
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(
          MemoryRouter,
          { initialEntries: [path] },
          h(Observer),
          h(Notifications),
        ),
      ),
    ),
  );
  await settle();
}
async function click(element) {
  assert(element, 'button exists');
  await act(async () => element.click());
}
async function openPanel() {
  await click(document.querySelector('button[aria-label="알림"]'));
}

test('all notification kinds arrive on first login without browser storage or a polling baseline', async () => {
  serverItems.push(notification('r1', 'rejudging', { reason: '테스트 수정' }));
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({ notifications: [{ body: 'previous private account' }] }),
  );
  await mount();
  await openPanel();
  assert.equal(panel().querySelectorAll('.header-notification-card').length, 4);
  assert.equal(badge(), '3');
  assert.equal(window.localStorage.getItem(storageKey), null);
  assert(!document.body.textContent.includes('previous private account'));
  assert.equal(getCalls.length, 1); // No notice/question/submission source polling.
});

test('deleting read or unread notifications removes only that item and persists on remount', async () => {
  await mount();
  await openPanel();
  await click(removeButtons()[0]);
  await settle();
  assert.equal(panel().querySelectorAll('.header-notification-card').length, 2);
  assert.equal(badge(), '1');
  assert.equal(currentPath, '/contests/contest');
  assert.equal(updateCalls[0].action, 'delete');
  await act(async () => root.unmount());
  root = createRoot(document.querySelector('main'));
  await mount();
  await openPanel();
  assert.equal(panel().querySelectorAll('.header-notification-card').length, 2);
});

test('closing a toast preserves unread count and its server history', async () => {
  await mount();
  await click(document.querySelector('button[aria-label="알림 닫기"]'));
  await settle();
  assert.equal(updateCalls[0].action, 'dismiss');
  assert.equal(badge(), '2');
  assert.equal(document.querySelectorAll('.header-toast').length, 1);
  await openPanel();
  assert.equal(panel().querySelectorAll('.header-notification-card').length, 3);
  assert(panel().textContent.includes('읽지 않은 알림 2개'));
});

test('opening an unread notification saves read state and follows the submission link', async () => {
  serverItems = [
    notification('s1', 'submission', {
      href: '/contests/contest/problems/problem?submissionId=s1',
    }),
  ];
  await mount();
  await openPanel();
  await click(document.querySelector('.header-notification-open'));
  await settle();
  assert.equal(updateCalls[0].action, 'read');
  assert.equal(currentPath, '/contests/contest/problems/problem');
  assert.equal(badge(), undefined);
});

test('read state can be toggled without navigating or restoring dismissed toasts', async () => {
  serverItems = [
    notification('n1', 'notice', { dismissed_at: '2026-10-11T13:00:00Z' }),
  ];
  await mount();
  await openPanel();
  await click(document.querySelector('.header-notification-read'));
  await settle();
  assert.equal(badge(), undefined);
  assert(
    document
      .querySelector('.header-notification-card')
      .classList.contains('is-read'),
  );
  await click(document.querySelector('.header-notification-read'));
  await settle();
  assert.equal(badge(), '1');
  assert.equal(currentPath, '/contests/contest');
  await click(
    document.querySelector('.header-panel button[aria-label="알림 닫기"]'),
  );
  assert.equal(document.querySelectorAll('.header-toast').length, 0);
});

test('read-all includes notifications on unloaded server pages', async () => {
  serverPageSize = 1;
  await mount();
  await openPanel();
  assert.equal(badge(), '2');
  await click(document.querySelector('.header-notification-read-all'));
  await settle();
  assert.equal(updateCalls[0].action, 'read-all');
  assert(serverItems.every((item) => item.read_at));
  assert.equal(badge(), undefined);
});

test('pagination shows earlier notifications once and uses the total unread count', async () => {
  serverPageSize = 1;
  await mount();
  await openPanel();
  assert.equal(badge(), '2');
  const more = () =>
    [...document.querySelectorAll('button')].find(
      (button) => button.textContent === '이전 알림 더 보기',
    );
  await click(more());
  await settle();
  await click(more());
  await settle();
  assert.equal(panel().querySelectorAll('.header-notification-card').length, 3);
  assert.equal(more(), undefined);
});

test('failed mutations keep the unread item visible and report the failure', async () => {
  failUpdate = true;
  await mount();
  await openPanel();
  await click(removeButtons()[0]);
  await settle();
  assert.equal(removeButtons().length, 3);
  assert.equal(badge(), '2');
  assert(
    document
      .querySelector('[role="alert"]')
      .textContent.includes('저장하지 못했습니다'),
  );
});

test('failed inbox fetching shows a retry control instead of falsely reporting an empty inbox', async () => {
  failFetch = true;
  await mount();
  await openPanel();
  assert(
    document
      .querySelector('[role="alert"]')
      .textContent.includes('불러오지 못했습니다'),
  );
  assert(!panel().textContent.includes('아직 도착한'));
  failFetch = false;
  await click(
    [...panel().querySelectorAll('button')].find(
      (button) => button.textContent === '다시 시도',
    ),
  );
  await settle();
  assert.equal(removeButtons().length, 3);
});

test('personal notifications work outside contests and disappear immediately on logout', async () => {
  generalSession = { accessToken: 'general', email: 'author@example.com' };
  currentSession = null;
  await mount('/');
  await openPanel();
  assert.equal(removeButtons().length, 3);
  generalSession = null;
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(MemoryRouter, null, h(Notifications)),
      ),
    ),
  );
  assert(!document.body.textContent.includes('submission 내용'));
  assert.equal(badge(), undefined);
});

test('changing accounts does not show the previous account cached notification bodies', async () => {
  serverItems = [
    notification('n1', 'notice', {
      owner: 'first',
      body: 'first private body',
    }),
    notification('n2', 'answer', {
      owner: 'second',
      body: 'second private body',
    }),
  ];
  generalSession = { accessToken: 'first' };
  currentSession = null;
  await mount('/');
  await openPanel();
  assert(document.body.textContent.includes('first private body'));
  generalSession = { accessToken: 'second' };
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(MemoryRouter, null, h(Notifications)),
      ),
    ),
  );
  assert(!document.body.textContent.includes('first private body'));
  await settle();
  assert(document.body.textContent.includes('second private body'));
});

test('rejudging reasons remain plain text and repeated verdict changes are separate events', async () => {
  serverItems = [
    notification('r1', 'rejudging', { reason: '<img src=x onerror=alert(1)>' }),
    notification('r2', 'rejudging'),
  ];
  await mount();
  await openPanel();
  assert.equal(removeButtons().length, 2);
  assert(panel().textContent.includes('<img src=x onerror=alert(1)>'));
  assert.equal(panel().querySelector('img'), null);
});

test('preview sessions cannot poll a participant inbox', async () => {
  currentSession = { ...session, isPreview: true };
  await mount();
  await openPanel();
  assert.equal(getCalls.length, 0);
  assert.equal(badge(), undefined);
  assert(panel().textContent.includes('로그인하면'));
});
