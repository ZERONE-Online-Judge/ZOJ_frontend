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
  team: { team_name: '팀' },
  member: { name: '참가자' },
};
let root, client, currentPath, serverNotices;
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
          activeParticipantSession: session,
          token: session.accessToken,
          isPreview: false,
        }),
      };
    if (id === '@/domains/identityAccess/queryIdentity')
      return { tokenQueryIdentity: () => 'test' };
    if (id === '@/domains/teamParticipation/api')
      return { getParticipantPreview: async () => ({}) };
    if (id === '@/domains/serviceCommunication/api')
      return {
        getContestNotices: async () => serverNotices,
        getContestQuestions: async () => [],
      };
    if (id === '@/domains/submissionScoreboard/api')
      return { listSubmissionsPage: async () => ({ data: [] }) };
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
function notification(id, type, dismissedAt) {
  return {
    id,
    sourceKey: id,
    type,
    title: `${type} 소식`,
    body: `${type} 내용`,
    href: '/contests/contest/board',
    createdAt: '2026-09-23T12:00:00Z',
    dismissedAt,
  };
}
const initial = [
  notification('notice:contest:n1', 'notice'),
  notification('answer:contest:a1', 'answer', '2026-09-23T12:01:00Z'),
  notification('submission:contest:s1:accepted', 'submission'),
];
function saved() {
  return JSON.parse(window.localStorage.getItem(storageKey));
}
function panel() {
  return document.querySelector('.header-panel');
}
function removeButtons() {
  return [...document.querySelectorAll('.header-notification-remove')];
}
beforeEach(() => {
  document.body.innerHTML = '<main></main>';
  window.localStorage.clear();
  window.localStorage.setItem(
    storageKey,
    JSON.stringify({
      notifications: initial,
      sourceSeen: Object.fromEntries(
        initial.map((item) => [item.sourceKey, true]),
      ),
    }),
  );
  serverNotices = [
    {
      contest_notice_id: 'n1',
      title: '기존 공지',
      published_at: '2026-09-23T12:00:00Z',
    },
  ];
  root = createRoot(document.querySelector('main'));
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
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
async function mount() {
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(
          MemoryRouter,
          { initialEntries: ['/contests/contest'] },
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

test('each read or unread notification has a separate X that removes only its entry without navigating', async () => {
  await mount();
  await openPanel();
  assert.equal(removeButtons().length, 3);
  assert.equal(
    document.querySelectorAll('.header-notification-card').length,
    3,
  );
  assert.equal(
    document.querySelectorAll('.header-notification-card.is-dismissed').length,
    1,
  );
  assert.equal(document.querySelector('button button'), null);
  await click(removeButtons()[0]);
  assert.equal(currentPath, '/contests/contest');
  assert(panel(), 'panel stays open');
  assert.equal(removeButtons().length, 2);
  assert.equal(document.querySelector('.header-action-count').textContent, '1');
  assert.deepEqual(
    saved().notifications.map((item) => item.type),
    ['answer', 'submission'],
  );
  assert.equal(saved().sourceSeen['notice:contest:n1'], true);
  await click(removeButtons()[0]);
  assert.deepEqual(
    saved().notifications.map((item) => item.type),
    ['submission'],
  );
});

test('removed notifications remain absent after polling and remounting, while new ones still arrive', async () => {
  await mount();
  await openPanel();
  await click(removeButtons()[0]);
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['contest-notices'] });
  });
  await settle();
  assert.equal(removeButtons().length, 2);
  await act(async () => root.unmount());
  root = createRoot(document.querySelector('main'));
  await mount();
  await openPanel();
  assert.equal(removeButtons().length, 2);
  assert.equal(
    saved().notifications.some((item) => item.id === 'notice:contest:n1'),
    false,
  );
  serverNotices = [
    ...serverNotices,
    {
      contest_notice_id: 'n2',
      title: '새 공지',
      published_at: '2026-09-23T13:00:00Z',
    },
  ];
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['contest-notices'] });
  });
  await settle();
  assert.equal(removeButtons().length, 3);
  assert(panel().textContent.includes('새 공지'));
});

test('removing the last notification shows the empty state and clears the new-notification badge', async () => {
  await mount();
  await openPanel();
  while (removeButtons().length) await click(removeButtons()[0]);
  assert(panel().textContent.includes('아직 도착한 알림이 없어요.'));
  assert.equal(document.querySelector('.header-action-count'), null);
  assert.deepEqual(saved().notifications, []);
  assert.equal(Object.keys(saved().sourceSeen).length, 3);
});

test('opening a notification still marks it read and follows its link', async () => {
  await mount();
  await openPanel();
  await click(document.querySelector('.header-notification-open'));
  assert.equal(currentPath, '/contests/contest/board');
  assert.equal(panel(), null);
  assert.equal(saved().notifications.length, 3);
  assert(saved().notifications[0].dismissedAt);
});

test('closing a toast still keeps its history available for explicit removal', async () => {
  await mount();
  await click(
    document.querySelector('.header-toast button[aria-label="알림 닫기"]'),
  );
  assert.equal(saved().notifications.length, 3);
  await openPanel();
  assert.equal(removeButtons().length, 3);
});
