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
let session, operators, reads, creates, updates, removals;
const mocks = {
  '@/shared/unsaved/useUnsavedForm': {
    default: () => ({ formProps: {}, confirm: (callback) => callback() }),
  },
  '@/utils/Icons': { SvgIcon: () => null },
  '@/domains/identityAccess/queryIdentity': {
    tokenQueryIdentity: (token) => token,
  },
  '@/domains/identityAccess/sessionStore': {
    useSessionStore: (selector) => selector({ generalSession: session }),
  },
  '@/domains/contestAdministration/api': {
    getOperatorContestDashboard: async () => ({
      contest: {
        contest_id: 'contest',
        title: '권한 테스트',
        organization_name: 'ZOJ',
        overview: '',
        status: 'draft',
        start_at: '2026-10-01T01:00:00Z',
        end_at: '2026-10-01T06:00:00Z',
        freeze_at: '2026-10-01T05:00:00Z',
      },
      divisions: [],
    }),
    listContestOperators: async () => {
      reads++;
      return operators;
    },
    createContestOperator: async (contestId, token, body) => {
      creates.push({ contestId, token, body });
      return body;
    },
    updateContestOperator: async (contestId, email, token, body) => {
      updates.push({ contestId, email, token, body });
      return body;
    },
    removeContestOperator: async (contestId, email, token) => {
      removals.push({ contestId, email, token });
      return {};
    },
  },
  '@/domains/serviceCommunication/api': {
    listOperatorContestNotices: async () => [],
    listOperatorContestQuestions: async () => [],
  },
  '@/domains/problemManagement/api': { getOperatorProblems: async () => [] },
};
for (const mock of Object.values(mocks))
  if ('default' in mock) mock.__esModule = true;
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
const OperatorsPage = source(
  'pages/operator/OperatorOperatorsPage.tsx',
).default;
const SettingsPage = source('pages/operator/OperatorSettingsPage.tsx').default;
let root, container, client;
function setActor(scopes) {
  session = {
    account: { email: 'actor@example.test', display_name: '운영자' },
    operatorContests: [],
    operatorSession: {
      accessToken: 'staff-token',
      defaultRedirect: '/operator',
      staff: {
        email: 'actor@example.test',
        display_name: '운영자',
        is_service_master: false,
        contest_scopes: { contest: scopes },
      },
    },
  };
}
function staff(email, roles, protectedMaster = false) {
  return {
    email,
    display_name: email.split('@')[0],
    is_service_master: false,
    contest_roles: { contest: roles },
    contest_scopes: {
      contest: roles.includes('master')
        ? ['contest.*']
        : ['contest.problem.review'],
    },
    protected_master_contests: protectedMaster ? ['contest'] : [],
  };
}
beforeEach(() => {
  setActor(['contest.*']);
  operators = [
    staff('assigned@example.test', ['master'], true),
    staff('master@example.test', ['master']),
    staff('reviewer@example.test', ['problem_reviewer']),
  ];
  reads = 0;
  creates = [];
  updates = [];
  removals = [];
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
  container.remove();
});
after(() => dom.window.close());
async function flush() {
  await act(
    async () => new Promise((resolve) => global.setTimeout(resolve, 10)),
  );
}
async function render(page = OperatorsPage, suffix = 'operators') {
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(
          MemoryRouter,
          { initialEntries: [`/operator/contests/contest/${suffix}`] },
          h(
            Routes,
            null,
            h(Route, {
              path: `/operator/contests/:contestId/${suffix}`,
              element: h(page),
            }),
          ),
        ),
      ),
    ),
  );
  await flush();
}
function button(text, scope = container) {
  return [...scope.querySelectorAll('button')].find(
    (item) => item.textContent.trim() === text,
  );
}
function inputByLabel(text) {
  return [...container.querySelectorAll('label')]
    .find((item) => item.textContent.trim().startsWith(text))
    ?.querySelector('input');
}
function role(text) {
  return [...container.querySelectorAll('fieldset label')]
    .find((item) => item.textContent.includes(text))
    ?.querySelector('input');
}
async function click(element) {
  assert.ok(element);
  await act(async () => element.click());
  await flush();
}
async function input(element, value) {
  assert.ok(element);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(element),
      'value',
    ).set.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  await flush();
}
function operatorCard(email) {
  return [...container.querySelectorAll('div')].find(
    (item) =>
      item.className.includes('flex-col') && item.textContent.includes(email),
  );
}

test('new operator requires name and roles, allows multiple roles, and treats master exclusively', async () => {
  await render();
  const submit = () => button('운영자 추가');
  assert.equal(submit().disabled, true);
  await input(inputByLabel('이메일 (필수)'), 'new@example.test');
  await input(inputByLabel('이름 (필수)'), '  검수 운영자  ');
  assert.equal(submit().disabled, true);
  await click(role('검수진'));
  await click(role('참가자 관리'));
  assert.equal(submit().disabled, false);
  await click(role('대회 마스터'));
  assert.equal(role('검수진').checked, false);
  assert.equal(role('참가자 관리').checked, false);
  await click(role('검수진'));
  assert.equal(role('대회 마스터').checked, false);
  await click(role('참가자 관리'));
  await click(submit());
  assert.deepEqual(creates, [
    {
      contestId: 'contest',
      token: 'staff-token',
      body: {
        email: 'new@example.test',
        display_name: '검수 운영자',
        roles: ['problem_reviewer', 'participants_manager'],
      },
    },
  ]);
  assert.equal(inputByLabel('이름 (필수)').value, '');
});

test('notice, board, and audit roles can be selected independently and saved together', async () => {
  await render();
  await input(inputByLabel('이메일 (필수)'), 'operations@example.test');
  await input(inputByLabel('이름 (필수)'), '운영 담당자');
  await click(role('게시판 관리'));
  assert.equal(role('공지 작성').checked, false);
  assert.equal(role('운영로그 보기').checked, false);
  await click(role('공지 작성'));
  await click(role('운영로그 보기'));
  await click(role('게시판 관리'));
  assert.equal(role('공지 작성').checked, true);
  assert.equal(role('운영로그 보기').checked, true);
  await click(button('운영자 추가'));
  assert.deepEqual(creates[0].body.roles, ['notices_manager', 'audit_viewer']);
});

test('operator list shows one prioritized title beside each name while retaining assigned role details', async () => {
  operators = [
    { ...staff('master@example.test', ['master']), display_name: '대회 총괄' },
    {
      ...staff('author@example.test', [
        'problem_reviewer',
        'notices_manager',
        'problem_author',
      ]),
      display_name: '손동열',
    },
    {
      ...staff('operations@example.test', ['audit_viewer', 'problem_reviewer']),
      display_name: '운영 담당자',
    },
    {
      ...staff('reviewer@example.test', ['problem_reviewer']),
      display_name: '문제 검수자',
    },
    {
      ...staff('legacy@example.test', []),
      display_name: '기존 운영자',
      contest_scopes: { contest: ['contest.notice.create'] },
    },
  ];
  await render();
  for (const [email, label] of [
    ['master@example.test', '대회 총괄 / 마스터'],
    ['author@example.test', '손동열 / 출제자'],
    ['operations@example.test', '운영 담당자 / 운영자'],
    ['reviewer@example.test', '문제 검수자 / 검수자'],
    ['legacy@example.test', '기존 운영자 / 운영자'],
  ])
    assert.equal(
      operatorCard(email).querySelector('strong').textContent,
      label,
    );
  const permissions = operatorCard('author@example.test').querySelector(
    '[aria-label="부여된 권한"]',
  );
  assert.match(permissions.textContent, /검수진/);
  assert.match(permissions.textContent, /공지 작성/);
  assert.match(permissions.textContent, /출제진/);
  assert.match(container.textContent, /운영자 \/ 마스터/);
});

test('settings manager sees settings and divisions without fetching or exposing staff controls', async () => {
  setActor(['contest.view', 'contest.settings.manage']);
  await render(SettingsPage, 'settings');
  assert.ok(button('설정 저장'));
  assert.ok(button('유형 추가'));
  assert.equal(button('운영자 추가'), undefined);
  assert.equal(reads, 0);
  assert.equal(container.textContent.includes('assigned@example.test'), false);
});

test('master settings page keeps staff management on its separate tab without fetching operators', async () => {
  await render(SettingsPage, 'settings');
  assert.ok(button('설정 저장'));
  assert.ok(button('유형 추가'));
  assert.equal(button('운영자 추가'), undefined);
  assert.equal(reads, 0);
  assert.equal(container.textContent.includes('assigned@example.test'), false);
});

test('staff manager sees staff controls only and cannot assign or edit masters', async () => {
  setActor(['contest.view', 'contest.staff.manage']);
  await render();
  assert.equal(button('설정 저장'), undefined);
  assert.equal(button('유형 추가'), undefined);
  assert.ok(button('운영자 추가'));
  assert.ok(reads > 0);
  assert.equal(role('대회 마스터'), undefined);
  assert.equal(
    operatorCard('assigned@example.test').querySelector('button'),
    null,
  );
  assert.equal(
    operatorCard('master@example.test').querySelector('button'),
    null,
  );
  assert.ok(button('이름·권한 수정', operatorCard('reviewer@example.test')));
});

test('editing preserves email, submits changed name and roles, and protects assigned master even from master actor', async () => {
  await render();
  assert.equal(
    operatorCard('assigned@example.test').querySelector('button'),
    null,
  );
  await click(button('이름·권한 수정', operatorCard('reviewer@example.test')));
  assert.equal(inputByLabel('이메일 (필수)').disabled, true);
  assert.equal(role('검수진').checked, true);
  await input(inputByLabel('이름 (필수)'), '  출제 검수자  ');
  await click(role('출제진'));
  await click(button('변경사항 저장'));
  assert.deepEqual(updates, [
    {
      contestId: 'contest',
      email: 'reviewer@example.test',
      token: 'staff-token',
      body: {
        display_name: '출제 검수자',
        roles: ['problem_reviewer', 'problem_author'],
      },
    },
  ]);
  assert.deepEqual(removals, []);
});

for (const [label, scope, page, suffix] of [
  [
    'staff manager cannot open settings',
    'contest.staff.manage',
    SettingsPage,
    'settings',
  ],
  [
    'settings manager cannot open operators',
    'contest.settings.manage',
    OperatorsPage,
    'operators',
  ],
  [
    'review-only staff cannot open settings',
    'contest.problem.review',
    SettingsPage,
    'settings',
  ],
  [
    'review-only staff cannot open operators',
    'contest.problem.review',
    OperatorsPage,
    'operators',
  ],
]) {
  test(`${label} or fetch operator accounts by direct URL`, async () => {
    setActor(['contest.view', scope]);
    await render(page, suffix);
    assert.equal(button('운영자 추가'), undefined);
    assert.equal(button('설정 저장'), undefined);
    assert.equal(reads, 0);
  });
}
