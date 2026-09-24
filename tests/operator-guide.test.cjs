const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://guide.test/',
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const h = React.createElement;
let session;
const mocks = {
  '@/domains/identityAccess/sessionStore': {
    useSessionStore: (selector) => selector({ generalSession: session }),
  },
  '@/domains/contestAdministration/api': {
    getOperatorContestDashboard: async () => ({
      contest: { title: 'Example' },
      divisions: [],
      participant_count: 0,
    }),
  },
  '@/domains/problemManagement/api': { getOperatorProblems: async () => [] },
  '@/domains/serviceCommunication/api': {
    listOperatorContestNotices: async () => [],
    listOperatorContestQuestions: async () => [],
  },
};
const modules = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (id.endsWith('.css')) return {};
    if (mocks[id]) return mocks[id];
    if (id.startsWith('@/') || id.startsWith('./')) {
      const base = id.startsWith('@/')
        ? path.resolve(__dirname, '../src', id.slice(2))
        : path.resolve(path.dirname(filename), id);
      const file = ['.ts', '.tsx']
        .map((ext) => base + ext)
        .find((file) => fs.existsSync(file));
      if (file)
        return source(path.relative(path.resolve(__dirname, '../src'), file));
    }
    return native(id);
  };
  modules.set(filename, loaded);
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
const { operatorGuideCategories, searchOperatorGuide } = source(
  'data/operatorGuideContent.ts',
);
const { guideAccessOutcome } = source(
  'components/operator/guide/guideDemoLogic.ts',
);
const Page = source('pages/operator/OperatorGuidePage.tsx').default;
let host, root, client;
beforeEach(() => {
  window.matchMedia = () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  });
  session = {
    account: { email: 'reviewer@test', display_name: 'Reviewer' },
    operatorContests: [],
    operatorSession: {
      accessToken: 'fixture',
      defaultRedirect: '/operator',
      staff: {
        email: 'reviewer@test',
        display_name: 'Reviewer',
        is_service_master: false,
        contest_scopes: { contest: ['contest.view', 'contest.problem.review'] },
      },
    },
  };
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
});
after(() => dom.window.close());
async function render(query = '') {
  await act(async () => {
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(
          MemoryRouter,
          { initialEntries: ['/operator/contests/contest/guide' + query] },
          h(
            Routes,
            null,
            h(Route, {
              path: '/operator/contests/:contestId/guide',
              element: h(Page),
            }),
          ),
        ),
      ),
    );
  });
}
function button(text) {
  return [...host.querySelectorAll('button')].find(
    (el) => el.textContent.trim() === text,
  );
}
async function click(element) {
  assert.ok(element);
  await act(async () => element.click());
}

test('guide covers every shipped operator tab and links have unique article identities', () => {
  const expected = [
    '',
    'settings',
    'operators',
    'notices',
    'board',
    'participants',
    'problems',
    'problem-review',
    'submissions',
    'scoreboard',
    'audit-logs',
  ];
  for (const route of expected)
    assert.ok(
      operatorGuideCategories.some((c) => c.route === route),
      route,
    );
  const ids = operatorGuideCategories.flatMap((c) =>
    c.articles.map((a) => a.id),
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length >= 40);
  for (const c of operatorGuideCategories)
    for (const a of c.articles) {
      assert.ok(a.steps.length >= 3);
      assert.ok(a.effect);
    }
});
test('search finds detailed instructions and requires every keyword', () => {
  assert.ok(
    searchOperatorGuide('강제 로그아웃').some(
      (r) => r.article.id === 'force-logout',
    ),
  );
  assert.ok(
    searchOperatorGuide('countdown:freeze').some(
      (r) => r.article.id === 'notice-options',
    ),
  );
  assert.ok(
    searchOperatorGuide('파일 .out').some(
      (r) => r.article.id === 'testcase-files',
    ),
  );
  assert.equal(searchOperatorGuide('없는검색어1000xyz').length, 0);
  assert.equal(searchOperatorGuide('    ').length, 0);
  assert.ok(
    searchOperatorGuide('삭제').some(
      (r) =>
        r.article.id === 'divisions' &&
        r.article.note.includes('삭제 버튼은 없습니다'),
    ),
  );
});
test('visibility illustration never grants a visitor access through a private contest or resource', () => {
  for (const contestPublic of [true, false])
    for (const resource of ['private', 'participants', 'public']) {
      assert.equal(
        guideAccessOutcome(contestPublic, resource, 'operator'),
        true,
      );
      assert.equal(
        guideAccessOutcome(contestPublic, resource, 'participant'),
        resource !== 'private',
      );
      assert.equal(
        guideAccessOutcome(contestPublic, resource, 'guest'),
        contestPublic && resource === 'public',
      );
    }
});
test('review-only operators can read the guide without receiving settings controls', async () => {
  await render('?section=settings');
  assert.match(host.textContent, /설정 하나가 누구에게 무엇을 바꿀까요/);
  const nav = host.querySelector('[aria-label="설정과 운영 가이드"]');
  assert.equal(nav.querySelector('a[href$="/settings"]'), null);
  assert.ok(nav.querySelector('a[href$="/guide"]'));
  assert.match(host.textContent, /해당 관리 화면을 열려면 담당 권한이 필요/);
  assert.equal(host.querySelector('.og-category-header a'), null);
});
test('unauthenticated visitors cannot open the operator guide', async () => {
  session = null;
  await render();
  assert.equal(host.querySelector('.operator-guide'), null);
  assert.ok(host.querySelector('a[href="/login"]'));
});
test('deep links open the requested detailed article and reduced motion starts paused', async () => {
  await render('?section=participants&article=force-logout');
  const article = host.querySelector('#guide-force-logout');
  assert.equal(
    article.querySelector('h3 button').getAttribute('aria-expanded'),
    'true',
  );
  assert.equal(article.querySelector('[id^="guide-body"]').hidden, false);
  assert.match(article.textContent, /다른 대회의 세션도 영향을/);
  assert.equal(host.querySelector('.operator-guide').dataset.motion, 'off');
  assert.ok(button('애니메이션 멈춤'));
});
test('search result navigation opens its exact category and article', async () => {
  await render('?q=countdown%3Afreeze');
  const result = host.querySelector('.og-search-result');
  assert.ok(result);
  await click(result);
  assert.ok(host.querySelector('#guide-notice-options'));
  assert.equal(
    host
      .querySelector('#guide-notice-options h3 button')
      .getAttribute('aria-expanded'),
    'true',
  );
  assert.equal(host.querySelector('#operator-guide-search').value, '');
});
test('visibility interactions close dependent practice settings and remove invalid public choices', async () => {
  await render('?section=settings');
  const selects = [...host.querySelectorAll('.og-visibility-controls select')];
  await act(async () => {
    selects[1].value = 'public';
    selects[1].dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  assert.equal(host.querySelectorAll('.og-audience.is-allowed').length, 3);
  await act(async () => {
    selects[0].value = 'private';
    selects[0].dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  assert.equal(selects[1].value, 'participants');
  assert.equal(selects[1].querySelector('option[value="public"]'), null);
  await act(async () => {
    selects[1].value = 'private';
    selects[1].dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  assert.equal(host.querySelector('.og-check-option input').disabled, true);
  assert.equal(host.querySelectorAll('.og-audience.is-allowed').length, 1);
});
test('manual release demonstration reveals the third place first and keeps the winner hidden', async () => {
  await render('?section=scoreboard');
  await click(button('순위별 공개'));
  await click(host.querySelector('[aria-label="3단계: 3위 공개"]'));
  const board = host.querySelectorAll('.og-rank-board')[1];
  const revealed = [
    ...board.querySelectorAll('.og-rank-row:not(.is-concealed)'),
  ];
  assert.equal(revealed.length, 1);
  assert.equal(revealed[0].querySelector('.og-rank-place').textContent, '3');
  assert.match(revealed[0].textContent, /코발트/);
  await click(host.querySelector('[aria-label="5단계: 1위 공개"]'));
  assert.equal(board.querySelectorAll('.is-concealed').length, 0);
});
test('session demonstration reaches logout on all three devices by manual steps', async () => {
  await render('?section=participants');
  await click(
    host.querySelector('[aria-label="4단계: 연결된 화면에 종료 안내"]'),
  );
  assert.equal(host.querySelectorAll('.og-device.is-disconnected').length, 3);
  assert.equal(host.querySelectorAll('.og-mini-modal').length, 3);
});
