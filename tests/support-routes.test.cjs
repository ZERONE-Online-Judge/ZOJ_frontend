const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<html><body></body></html>', {
  url: 'https://zoj.test/support',
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const h = React.createElement;
const { createRoot } = require('react-dom/client');
const { MemoryRouter, useLocation } = require('react-router-dom');
const cache = new Map();
let submitted = 0;

function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id.endsWith('.css')) return {};
    if (id === '@/components/common/PublicHero')
      return {
        __esModule: true,
        default: ({ children }) => h('header', null, children),
      };
    if (id === '@/components/common/PublicExperience')
      return {
        ExperienceArrow: () => null,
        ExperienceReveal: ({ children }) => h('div', null, children),
      };
    if (id === '@/shared/hooks/usePublicMotion')
      return { __esModule: true, default: () => ({ paused: true }) };
    if (id === '@/shared/unsaved/useUnsavedForm')
      return {
        __esModule: true,
        default: () => ({ confirm: (action) => action(), formProps: {} }),
      };
    if (id === '@tanstack/react-query')
      return {
        useMutation: () => ({
          mutate: () => submitted++,
          isPending: false,
          isError: false,
          reset() {},
        }),
      };
    if (id === '@/domains/serviceCommunication/api') return {};
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

const Page = source('pages/public/SupportGuidePage.tsx').default;
function Fixture() {
  const location = useLocation();
  return h(
    React.Fragment,
    null,
    h('output', { id: 'location' }, location.pathname + location.search),
    h(Page),
  );
}
let host, root;
beforeEach(() => {
  submitted = 0;
  document.body.innerHTML = '<main></main>';
  host = document.querySelector('main');
  root = createRoot(host);
});
afterEach(async () => {
  assert.equal(
    submitted,
    0,
    'browsing support must never submit a contact inquiry',
  );
  await act(async () => root.unmount());
});
after(() => dom.window.close());
async function render(url) {
  await act(async () =>
    root.render(h(MemoryRouter, { initialEntries: [url] }, h(Fixture))),
  );
}

for (const [url, tab] of [
  ['/support', 'guide'],
  ['/support/rules', 'rules'],
  ['/support/help', 'help'],
  ['/support/privacy', 'privacy'],
  ['/support/contact', 'contact'],
  ['/support?tab=privacy', 'privacy'],
  ['/support?tab=invalid', 'guide'],
  ['/support/rules?tab=privacy', 'rules'],
]) {
  test(`${url} opens the expected support content`, async () => {
    await render(url);
    assert.equal(
      host.querySelector('[role="tabpanel"]').id,
      `support-panel-${tab}`,
    );
    assert.equal(
      host.querySelector('[aria-selected="true"]').id,
      `support-tab-${tab}`,
    );
  });
}

test('support tabs expose real crawlable URLs and navigate without query-only views', async () => {
  await render('/support');
  const tabs = [...host.querySelectorAll('[role="tab"]')];
  assert.deepEqual(
    tabs.map((element) => element.getAttribute('href')),
    [
      '/support',
      '/support/rules',
      '/support/help',
    '/support/contact',
    '/support/privacy',
    ],
  );
  await act(async () => tabs[2].click());
  assert.equal(host.querySelector('#location').textContent, '/support/help');
  assert.equal(
    host.querySelector('[role="tabpanel"]').id,
    'support-panel-help',
  );
});

test('keyboard navigation follows the support links and preserves active-tab focus', async () => {
  await render('/support');
  const firstTab = host.querySelector('#support-tab-guide');
  firstTab.focus();
  await act(async () =>
    firstTab.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  assert.equal(host.querySelector('#location').textContent, '/support/rules');
  assert.equal(document.activeElement.id, 'support-tab-rules');
  assert.equal(document.activeElement.getAttribute('tabindex'), '0');
});
