const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://guide.test/',
  pretendToBeVisual: true,
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
const { act } = React;
const { createRoot } = require('react-dom/client');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const h = React.createElement;
let session;
const mocks = {
  '@/utils/Icons': { SvgIcon: () => null },
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
        r.article.id === 'divisions' && r.article.note.includes('유형 삭제'),
    ),
  );
});
test('review-only operators can read the guide without receiving settings controls', async () => {
  await render('?section=settings');
  assert.match(host.textContent, /대회 설정과 참가자 공개 범위/);
  assert.equal(host.querySelector('a[href$="/settings"]'), null);
  assert.ok(host.querySelector('a[href$="/guide"]'));
  assert.match(host.textContent, /해당 관리 화면을 열려면 담당 권한이 필요/);
  assert.equal(host.querySelector('.og-category-header a'), null);
});
test('unauthenticated visitors cannot open the operator guide', async () => {
  session = null;
  await render();
  assert.equal(host.querySelector('.operator-guide'), null);
  assert.ok(host.querySelector('a[href="/login"]'));
});
test('deep links open the requested article without unrelated autoplay controls', async () => {
  await render('?section=participants&article=force-logout');
  const article = host.querySelector('#guide-force-logout');
  assert.equal(
    article.querySelector('h3 button').getAttribute('aria-expanded'),
    'true',
  );
  assert.equal(article.querySelector('[id^="guide-body"]').hidden, false);
  assert.match(article.textContent, /다른 대회의 세션도 영향을/);
  assert.equal(host.querySelector('.og-player'), null);
  assert.equal(host.querySelector('.og-overview-art'), null);
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
test('practice settings keep selection separate from saved values and support confirmed reset', async () => {
  await render('?section=settings');
  const input = host.querySelector(
    'input[name="visibility_after_end"][value="public"]',
  );
  await click(input);
  assert.match(
    host.querySelector('.og-practice-feedback').textContent,
    /적용된 종료 후 공개 범위: 비공개/,
  );
  assert.match(
    host.querySelector('[aria-label="설정 저장"]').textContent,
    /1개 항목 변경됨/,
  );
  await click(button('변경사항 저장'));
  assert.match(
    host.querySelector('.og-practice-feedback').textContent,
    /적용된 종료 후 공개 범위: 공개/,
  );
  await click(
    host.querySelector('input[name="visibility_after_end"][value="private"]'),
  );
  await click(button('되돌리기'));
  assert.match(document.querySelector('dialog').textContent, /설정 변경 취소/);
  await click(
    [...document.querySelectorAll('dialog button')].find(
      (el) => el.textContent === '되돌리기',
    ),
  );
  assert.equal(input.checked, true);
  assert.equal(button('변경사항 저장').disabled, true);
});
test('practice roles use the production selector and persist only into the example list', async () => {
  await render('?section=operators');
  await click(host.querySelector('[aria-label="운영자 추가 펼치기"]'));
  const editor = host.querySelector('.og-practice-surface');
  await click(editor.querySelector('input[value="problem_author"]'));
  await click(editor.querySelector('button[type="submit"]'));
  assert.equal(
    editor
      .querySelector('[aria-label="운영자 추가 펼치기"]')
      .getAttribute('aria-expanded'),
    'false',
  );
  assert.match(
    editor.querySelector('[aria-label="부여된 권한"]').textContent,
    /검수진.*출제진/,
  );
  await click(button('이름·이메일·권한 수정'));
  assert.equal(
    editor.querySelector('input[value="problem_author"]').checked,
    true,
  );
  await click(editor.querySelector('input[value="participant_preview"]'));
  assert.equal(
    editor.querySelector('input[value="problem_author"]').checked,
    false,
  );
  assert.equal(
    editor.querySelector('input[value="problem_reviewer"]').checked,
    false,
  );
});
test('manual release uses the actual controls, table and confirmation before undo', async () => {
  await render('?section=scoreboard');
  await click(button('개별 순위 공개 시작'));
  assert.equal(host.querySelectorAll('[data-scoreboard-row]').length, 3);
  assert.equal(
    (
      host
        .querySelector('.og-practice-result')
        .textContent.match(/아직 공개되지 않은 순위/g) || []
    ).length,
    3,
  );
  await click(button('3위 공개'));
  const board = host.querySelector('.og-practice-result');
  assert.match(board.textContent, /코발트/);
  assert.doesNotMatch(board.textContent, /라임/);
  await click(button('되돌리기 (Undo)'));
  assert.match(board.textContent, /코발트/);
  await click(
    [...document.querySelectorAll('dialog button')].find(
      (el) => el.textContent === '되돌리기',
    ),
  );
  assert.doesNotMatch(board.textContent, /코발트/);
});
test('session logout shows the real participant notice and clears only the example sessions', async () => {
  await render('?section=participants');
  await click(button('계정 로그아웃'));
  assert.match(
    host.querySelector('.og-practice-surface').textContent,
    /세션 없음/,
  );
  assert.match(
    document.querySelector('dialog').textContent,
    /로그아웃되었습니다/,
  );
  await click(
    [...document.querySelectorAll('dialog button')].find(
      (el) => el.textContent === '다시 로그인',
    ),
  );
  assert.equal(document.querySelector('dialog'), null);
  assert.ok(session.operatorSession);
  await click(button('처음부터 다시하기'));
  assert.match(
    host.querySelector('.og-practice-surface').textContent,
    /세션 2개/,
  );
});
test('notice registration shows the saved countdown using the production editor', async () => {
  await render('?section=notices');
  await click(button('종료 카운트다운'));
  assert.match(
    host.querySelector('.og-practice-surface textarea').value,
    /countdown:end/,
  );
  assert.equal(host.querySelector('.og-practice-result'), null);
  await click(button('공지 등록'));
  assert.match(
    host.querySelector('.og-practice-result').textContent,
    /종료 시각 안내/,
  );
  assert.doesNotMatch(
    host.querySelector('.og-practice-result').textContent,
    /countdown:end/,
  );
});
test('private question practice keeps the actual answer form private', async () => {
  await render('?section=board');
  await click(button('비공개 전환'));
  await click(button('답변 작성'));
  const scope = host.querySelector('[aria-label="답변 공개 범위"]');
  assert.equal(scope.disabled, true);
  assert.equal(scope.value, 'questioner');
  await click(button('답변 등록'));
  assert.match(
    host.querySelector('.operator-board-composer').textContent,
    /답변 내용을 입력/,
  );
});
test('log practice opens the actual diff dialog', async () => {
  await render('?section=logs');
  await click(button('상세 기록 보기'));
  assert.match(
    document.querySelector('dialog').textContent,
    /실제 변경된 항목.*변경 전.*변경 후/,
  );
});

test('real execution examples show recorded source, input and measurements without executing code', async () => {
  await render('?section=judge-servers');
  assert.match(
    host.querySelector('.og-runtime-facts').textContent,
    /7대.*14개.*v0.2.18/,
  );
  assert.match(host.querySelector('.og-benchmark-metrics').textContent, /33ms/);
  assert.match(host.querySelector('.og-load-selector').textContent, /총 3건/);
  assert.match(host.querySelector('.og-benchmark-code').textContent, /i % 97/);
  const choice = host.querySelector('.og-benchmark-select select');
  await act(async () => {
    choice.value = 'array-python';
    choice.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  assert.match(
    host.querySelector('.og-benchmark-code').textContent,
    /list\(range\(n\)\)/,
  );
  assert.match(
    host.querySelector('.og-benchmark-metrics').textContent,
    /116ms/,
  );
  assert.match(
    host.querySelector('.og-benchmark-metrics').textContent,
    new RegExp(
      (
        source('data/judgeBenchmark.ts').judgeBenchmark.cases.find(
          (item) => item.id === 'array-python',
        ).loadScenarios[0].memoryKb.max / 1024
      ).toFixed(2) + 'MiB',
    ),
  );
  assert.equal(
    host.querySelectorAll('.og-benchmark-records tbody tr').length,
    3,
  );
  assert.ok(
    host.querySelector(
      'a[download][href="/guides/judge-benchmark-2026-09-26.json"]',
    ),
  );
});

test('judge steps display actual persisted-result UI without timed advancement', async () => {
  await render('?section=judge-servers');
  await click(button('채점 큐부터 결과까지'));
  assert.equal(host.querySelector('.og-player'), null);
  await click(button('3. 한 에이전트에 배정'));
  assert.match(
    host.querySelector('.og-flow-detail').textContent,
    /작업 전용 토큰/,
  );
  assert.match(
    host.querySelector('[aria-label="검수 채점 결과"]').textContent,
    /채점 준비 중/,
  );
  await click(button('7. 결과 저장과 슬롯 반환'));
  assert.match(
    host.querySelector('[aria-label="검수 채점 결과"]').textContent,
    /맞았습니다.*34 ms/,
  );
  assert.match(
    host.querySelector('.og-flow-detail').textContent,
    /결과를 저장/,
  );
});

test('downloadable benchmark preserves every displayed measurement and source', () => {
  const { judgeBenchmark } = source('data/judgeBenchmark.ts');
  const download = JSON.parse(
    fs.readFileSync(
      path.resolve(
        __dirname,
        '../public/guides/judge-benchmark-2026-09-26.json',
      ),
      'utf8',
    ),
  );
  assert.deepEqual(judgeBenchmark, download);
  assert.equal(judgeBenchmark.cases.length, 8);
  for (const example of judgeBenchmark.cases) {
    assert.equal(example.runs.length, 3);
    assert.ok(example.runs.every((run) => run.status === 'accepted'));
  }
  assert.ok(
    searchOperatorGuide('경과 시간').some(
      (result) => result.article.id === 'judge-time-metrics',
    ),
  );
});

test('load selection compares measured execution, queue wait and batch completion without starting work', async () => {
  await render('?section=judge-servers');
  const choice = host.querySelector('.og-benchmark-select select');
  await act(async () => {
    choice.value = 'loop-python';
    choice.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await click(button('동시 100건'));
  assert.equal(button('동시 100건').getAttribute('aria-pressed'), 'true');
  assert.match(host.querySelector('.og-load-selector').textContent, /총 300건/);
  const metrics = host.querySelector('.og-benchmark-metrics').textContent;
  assert.match(metrics, /1,018ms/);
  assert.match(metrics, /큐 대기 시간 중앙값6\.95초/);
  assert.match(metrics, /100건 모두 완료.*15\.80초/);
  assert.match(metrics, /300 \/ 300건/);
  assert.equal(host.querySelectorAll('.og-load-comparison tbody tr').length, 3);
  assert.equal(
    host.querySelector('.og-load-selected').dataset.batchSize,
    '100',
  );
  await click(button('동시 10건'));
  assert.match(host.querySelector('.og-load-selector').textContent, /총 30건/);
  assert.match(
    host.querySelector('.og-benchmark-metrics').textContent,
    /969ms/,
  );
  assert.match(
    host.querySelector('.og-benchmark-records').textContent,
    /HTTP 요청 처리 시간/,
  );
  assert.ok(
    host.querySelector(
      'a[download][href="/guides/judge-load-benchmark-2026-09-26.json"]',
    ),
  );
});

test('common environment is described for every node and load summaries match all raw records', () => {
  const { judgeBenchmark } = source('data/judgeBenchmark.ts');
  const { judgeServerGuide } = source('data/judgeServerGuide.ts');
  const environment = judgeServerGuide.articles.find(
    (a) => a.id === 'server-speed',
  );
  const text = JSON.stringify(environment);
  assert.doesNotMatch(text, /03번|07번/);
  assert.match(text, /7대 모두 같은 구성/);
  assert.match(text, /전체 채점 에이전트 공통/);
  const raw = JSON.parse(
    fs.readFileSync(
      path.resolve(
        __dirname,
        '../public/guides/judge-load-benchmark-2026-09-26.json',
      ),
      'utf8',
    ),
  );
  assert.equal(raw.batches.length, 72);
  assert.equal(
    raw.batches.reduce((sum, b) => sum + b.samples.length, 0),
    2664,
  );
  const median = (values) => {
    const v = [...values].sort((a, b) => a - b);
    return (
      Math.round(
        ((v[Math.floor((v.length - 1) / 2)] + v[Math.floor(v.length / 2)]) /
          2) *
          1000,
      ) / 1000
    );
  };
  for (const example of judgeBenchmark.cases) {
    for (const scenario of example.loadScenarios) {
      const batches = raw.batches.filter(
        (b) => b.case_id === example.id && b.batch_size === scenario.batchSize,
      );
      const samples = batches.flatMap((b) => b.samples);
      assert.equal(batches.length, 3);
      assert.equal(samples.length, scenario.sampleCount);
      assert.equal(samples.length, scenario.batchSize * 3);
      assert.equal(
        scenario.statuses.accepted,
        samples.filter((s) => s.status === 'accepted').length,
      );
      assert.ok(batches.every((b) => b.other_jobs_observed === 0));
      for (const [field, stats] of [
        ['runtime_ms', scenario.runtimeMs],
        ['queue_wait_ms', scenario.queueWaitMs],
        ['completion_ms', scenario.completionMs],
        ['memory_kb', scenario.memoryKb],
      ]) {
        const values = samples.map((s) => s[field]).sort((a, b) => a - b);
        assert.equal(stats.min, values[0]);
        assert.equal(stats.max, values.at(-1));
        assert.ok(
          Math.abs(stats.median - median(values)) <= 0.00101,
          `${example.id} ${scenario.batchSize}: median rounding`,
        );
        assert.equal(stats.p95, values[Math.ceil(values.length * 0.95) - 1]);
      }
      assert.equal(
        scenario.batchCompletionMs.median,
        median(
          batches.map((b) =>
            Math.max(...b.samples.map((s) => s.completion_ms)),
          ),
        ),
      );
      assert.ok(
        samples.every(
          (s) => s.completion_ms >= s.queue_wait_ms && !s.reassigned,
        ),
      );
    }
  }
});
