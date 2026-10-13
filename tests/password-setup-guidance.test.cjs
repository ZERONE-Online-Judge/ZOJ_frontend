const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<body></body>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act, createElement: h } = React;
const { createRoot } = require('react-dom/client');
let session, requests, status, cleared, navigated;
const sessionFor = (email) => ({
  account: { email },
  accessToken: 'fixture-' + email,
});
const mocks = {
  'react-router-dom': { useNavigate: () => (path) => navigated.push(path) },
  '@tanstack/react-query': {
    useQueryClient: () => ({ clear: () => cleared++ }),
  },
  '@/domains/identityAccess/sessionStore': {
    useSessionStore: (select) =>
      select({
        generalSession: session,
        clearSessions: () => {
          session = null;
        },
      }),
  },
  '@/domains/identityAccess/accountPasswords': {
    getAccountPassword: async (token) => {
      requests.push(token);
      return status(token);
    },
  },
  './AccountPasswordDialog': {
    __esModule: true,
    default: ({ email, token, onClose, onDone }) =>
      h(
        'div',
        { role: 'dialog', 'data-email': email, 'data-token': token },
        h('button', { onClick: onClose }, '설정 닫기'),
        h('button', { onClick: onDone }, '설정 완료'),
      ),
  },
};
const filename = path.resolve(
  __dirname,
  '../src/components/auth/PasswordSetupGuidance.tsx',
);
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
const native = loaded.require.bind(loaded);
loaded.require = (id) => mocks[id] || (id.endsWith('.css') ? {} : native(id));
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText,
  filename,
);
const Guidance = loaded.exports.default;
async function mount(initial = 'author@example.com') {
  session = initial ? sessionFor(initial) : null;
  requests = [];
  cleared = 0;
  navigated = [];
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = () => act(async () => root.render(h(Guidance)));
  await render();
  return {
    host,
    render,
    close: async () => {
      await act(async () => root.unmount());
      host.remove();
    },
  };
}
const button = (view, name) =>
  [...view.host.querySelectorAll('button')].find(
    (item) =>
      item.textContent === name || item.getAttribute('aria-label') === name,
  );
test('Only a confirmed missing password shows a non-modal notice; the action opens current account settings', async () => {
  status = async () => ({ has_password: false });
  const view = await mount();
  assert.ok(view.host.querySelector('[role="status"]'));
  assert.equal(view.host.querySelector('[role="dialog"]'), null);
  await act(async () => button(view, '비밀번호 설정').click());
  const dialog = view.host.querySelector('[role="dialog"]');
  assert.equal(dialog.dataset.email, 'author@example.com');
  assert.equal(dialog.dataset.token, 'fixture-author@example.com');
  assert.equal(view.host.querySelector('[role="status"]'), null);
  await act(async () => button(view, '설정 완료').click());
  assert.equal(cleared, 1);
  assert.equal(session, null);
  assert.deepEqual(navigated, ['/login?password=changed']);
  await view.close();
});
test('Registered passwords, unavailable status, and anonymous visitors never get setup prompts', async () => {
  for (const handler of [
    async () => ({ has_password: true }),
    async () => {
      throw new Error('offline');
    },
  ]) {
    status = handler;
    const view = await mount();
    assert.equal(view.host.querySelector('[role="status"]'), null);
    await view.close();
  }
  const view = await mount(null);
  assert.equal(requests.length, 0);
  await view.close();
});
test('Dismissal lasts across page rerenders and resets for another login', async () => {
  status = async () => ({ has_password: false });
  const view = await mount();
  await act(async () => button(view, '비밀번호 설정 안내 닫기').click());
  await view.render();
  assert.equal(view.host.querySelector('[role="status"]'), null);
  session = null;
  await view.render();
  session = sessionFor('author@example.com');
  await view.render();
  assert.ok(view.host.querySelector('[role="status"]'));
  await view.close();
});
test('A delayed previous-account response cannot show a prompt for the new account', async () => {
  let resolvePrevious;
  status = (token) =>
    token.includes('old@example.com')
      ? new Promise((resolve) => {
          resolvePrevious = resolve;
        })
      : Promise.resolve({ has_password: true });
  const view = await mount('old@example.com');
  session = sessionFor('new@example.com');
  await view.render();
  await act(async () => resolvePrevious({ has_password: false }));
  assert.equal(view.host.querySelector('[role="status"]'), null);
  await view.close();
});
after(() => dom.window.close());
