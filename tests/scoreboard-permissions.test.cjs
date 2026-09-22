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
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const h = React.createElement;
let session, contest, reads, changes, release;
const division = { division_id: 'division', name: '일반부' };
const row = {
  rank: 1,
  team_id: 'team',
  team_name: '확인할 팀',
  solved: 1,
  penalty: 15,
  submission_count: 1,
  problem_scores: [
    {
      problem_id: 'problem',
      problem_code: 'A',
      attempts: 1,
      wrong_attempts: 0,
      solved: true,
      penalty: 15,
      best_status: 'accepted',
    },
  ],
};
const mocks = {
  '@/utils/Icons': { SvgIcon: () => null },
  '@/domains/identityAccess/queryIdentity': {
    tokenQueryIdentity: (token) => 'identity:' + token,
  },
  '@/domains/identityAccess/sessionStore': {
    useSessionStore: (selector) => selector({ generalSession: session }),
  },
  '@/domains/contestAdministration/api': {
    getOperatorContestDashboard: async () => {
      reads.dashboard += 1;
      return { contest, divisions: [division] };
    },
    updateContestSettings: async (contestId, token, body) => {
      changes.push({ kind: 'settings', contestId, token, body });
      contest = { ...contest, ...body };
      return contest;
    },
  },
  '@/domains/problemManagement/api': {
    getOperatorProblems: async () => {
      reads.problems += 1;
      return [
        {
          problem_id: 'problem',
          division_id: 'division',
          problem_code: 'A',
          title: '두 수의 합',
        },
      ];
    },
  },
  '@/domains/serviceCommunication/api': {
    listOperatorContestNotices: async () => [],
    listOperatorContestQuestions: async () => [],
  },
  '@/domains/submissionScoreboard/api': {
    getOperatorDivisionScoreboard: async () => {
      reads.scoreboard += 1;
      return {
        rows: [row],
        frozen_public_view: true,
        problem_stats: [
          {
            problem_id: 'problem',
            problem_code: 'A',
            total_submissions: 1,
            accepted_submissions: 1,
            accepted_team_count: 1,
            total_team_count: 1,
            acceptance_rate: 100,
          },
        ],
      };
    },
    getScoreboardRelease: async () => {
      reads.release += 1;
      return release;
    },
    updateScoreboardRelease: async (contestId, divisionId, token, body) => {
      changes.push({ kind: 'release', contestId, divisionId, token, body });
      release = {
        ...release,
        mode: 'partial',
        ranks: [{ rank: 1, team_count: 1, revealed: body.action === 'rank' }],
        revealed_count: body.action === 'rank' ? 1 : 0,
      };
      return release;
    },
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
const Page = source('pages/operator/OperatorScoreboardPage.tsx').default;
let root, container, client;
beforeEach(() => {
  session = {
    account: { email: 'staff@test' },
    operatorContests: [],
    operatorSession: {
      accessToken: 'token',
      staff: {
        email: 'staff@test',
        is_service_master: false,
        contest_scopes: { contest: ['contest.scoreboard.view'] },
      },
    },
  };
  contest = {
    contest_id: 'contest',
    title: '권한 대회',
    status: 'running',
    start_at: '2020-01-01T00:00:00Z',
    end_at: '2099-01-01T00:00:00Z',
    freeze_at: '2020-01-01T01:00:00Z',
    scoreboard_freeze_mode: 'auto',
  };
  reads = { dashboard: 0, problems: 0, scoreboard: 0, release: 0 };
  changes = [];
  release = {
    mode: 'not_started',
    ranks: [],
    revealed_count: 0,
    total_count: 1,
  };
  document.body.innerHTML = '';
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
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
async function render() {
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(
          MemoryRouter,
          { initialEntries: ['/operator/contests/contest/scoreboard'] },
          h(
            Routes,
            null,
            h(Route, {
              path: '/operator/contests/:contestId/scoreboard',
              element: h(Page),
            }),
          ),
        ),
      ),
    ),
  );
  await flush();
}
async function flush() {
  await act(
    async () => new Promise((resolve) => global.setTimeout(resolve, 20)),
  );
}
function button(text) {
  return [...container.querySelectorAll('button')].find(
    (item) => item.textContent.trim() === text,
  );
}
async function click(element) {
  assert.ok(element);
  await act(async () => element.click());
  await flush();
}
function manage() {
  session.operatorSession.staff.contest_scopes.contest.push(
    'contest.scoreboard.manage',
  );
}

test('scoreboard viewers see results and presentation without problem or management requests', async () => {
  await render();
  assert.match(container.textContent, /확인할 팀/);
  assert.match(container.textContent, /문제별 제출 통계/);
  assert.match(container.textContent, /표시 모드: 오토/);
  assert.ok(button('프레젠테이션 팝업'));
  for (const label of ['오토', '라이브', '프리즈', '개별 순위 공개 시작'])
    assert.equal(button(label), undefined);
  assert.ok(reads.dashboard > 0 && reads.scoreboard > 0);
  assert.equal(reads.problems, 0);
  assert.equal(reads.release, 0);
  assert.deepEqual(changes, []);
});

test('scoreboard viewers cannot begin or advance rank release after the contest ends', async () => {
  contest.status = 'ended';
  await render();
  assert.match(container.textContent, /확인할 팀/);
  assert.equal(button('개별 순위 공개 시작'), undefined);
  assert.equal(button('이 유형 전체 공개'), undefined);
  assert.equal(reads.release, 0);
  assert.deepEqual(changes, []);
});

test('scoreboard managers can change freeze mode without contest settings or problem permission', async () => {
  manage();
  await render();
  await click(button('프리즈'));
  assert.deepEqual(changes, [
    {
      kind: 'settings',
      contestId: 'contest',
      token: 'token',
      body: { scoreboard_freeze_mode: 'frozen' },
    },
  ]);
  assert.equal(reads.problems, 0);
});

test('scoreboard managers can start and advance rank release', async () => {
  manage();
  contest.status = 'ended';
  await render();
  await flush();
  await click(button('개별 순위 공개 시작'));
  await click(button('1위 공개'));
  assert.deepEqual(
    changes.map((change) => change.body),
    [{ action: 'start' }, { action: 'rank', rank: 1 }],
  );
  assert.equal(reads.problems, 0);
});

test('staff without scoreboard view cannot load scoreboard data', async () => {
  session.operatorSession.staff.contest_scopes.contest = [
    'contest.participant.view',
  ];
  await render();
  assert.equal(reads.dashboard, 0);
  assert.equal(reads.scoreboard, 0);
  assert.equal(button('프레젠테이션 팝업'), undefined);
});
