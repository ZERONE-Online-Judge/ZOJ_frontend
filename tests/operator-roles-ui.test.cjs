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
const {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
} = require('react-router-dom');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const h = React.createElement;
let session, operators, reads, creates, updates, removals;
let updateError, sessionClears, currentLocation, apiCalls;
let contestOverrides, settingsChanges, transfers, transferError;
let divisionCreates;
const mocks = {
  '@/shared/unsaved/useUnsavedForm': {
    default: () => ({ formProps: {}, confirm: (callback) => callback() }),
  },
  '@/utils/Icons': { SvgIcon: () => null },
  '@/domains/identityAccess/queryIdentity': {
    tokenQueryIdentity: (token) => token,
  },
  '@/domains/identityAccess/sessionStore': {
    useSessionStore: (selector) =>
      selector({
        generalSession: session,
        clearSessions: () => {
          sessionClears++;
          session = null;
        },
      }),
  },
  '@/shared/api/client': {
    apiRequest: async (url, token, init) => {
      apiCalls.push({ url, token, init });
      return {};
    },
  },
  '@/domains/contestAdministration/api': {
    createOperatorDivision: async (contestId, token, body) => {
      divisionCreates.push({ contestId, token, body });
      return { division_id: 'new-division', ...body };
    },
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
        ...contestOverrides,
      },
      divisions: [],
    }),
    updateContestSettings: async (contestId, token, body) => {
      settingsChanges.push({ contestId, token, body });
      contestOverrides = { ...contestOverrides, ...body };
      return {
        contest_id: 'contest',
        title: '권한 테스트',
        organization_name: 'ZOJ',
        overview: '',
        status: 'draft',
        start_at: '2026-10-01T01:00:00Z',
        end_at: '2026-10-01T06:00:00Z',
        freeze_at: '2026-10-01T05:00:00Z',
        ...contestOverrides,
      };
    },
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
      if (updateError) throw updateError;
      const result = { ...body, email: body.email.trim().toLowerCase() };
      operators = operators.map((operator) =>
        operator.email === email ? { ...operator, ...result } : operator,
      );
      return result;
    },
    transferContestOwner: async (contestId, token, email) => {
      transfers.push({ contestId, token, email });
      if (transferError) throw transferError;
      const changed = operators
        .filter(
          (operator) =>
            operator.contest_roles.contest.includes('owner') ||
            operator.email === email,
        )
        .map((operator) => ({
          ...operator,
          contest_roles: {
            contest: [operator.email === email ? 'owner' : 'master'],
          },
          contest_scopes: {
            contest:
              operator.email === email
                ? ['contest.*', 'contest.owner']
                : ['contest.*'],
          },
          protected_master_contests:
            operator.email === email ? ['contest'] : [],
        }));
      operators = operators.map(
        (operator) =>
          changed.find((item) => item.email === operator.email) ?? operator,
      );
      return changed;
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
  '@/domains/teamParticipation/api': { listParticipantTeams: async () => [] },
};
mocks['@/domains/identityAccess/sessionStore'].useSessionStore.getState =
  () => ({
    generalSession: session,
    setGeneralSession: (next) => {
      session = next;
    },
  });
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
    if (id.endsWith('.css')) return {};
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
const ParticipantsPage = source(
  'pages/operator/OperatorParticipantsPage.tsx',
).default;
const LoginPage = source('pages/auth/LoginPage.tsx').default;
const { ApiClientError } = source('shared/api/errors.ts');
const { updateContestOperator } = source(
  'domains/contestAdministration/api.ts',
);
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
      contest: roles.includes('owner')
        ? ['contest.*', 'contest.owner']
        : roles.includes('master')
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
  updateError = null;
  sessionClears = 0;
  apiCalls = [];
  contestOverrides = {};
  settingsChanges = [];
  divisionCreates = [];
  transfers = [];
  transferError = null;
  window.localStorage.removeItem('zoj.scoreboard.updated.contest');
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
  function Observer() {
    currentLocation = useLocation();
    return null;
  }
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        h(
          MemoryRouter,
          { initialEntries: [`/operator/contests/contest/${suffix}`] },
          h(Observer),
          h(
            Routes,
            null,
            h(Route, {
              path: `/operator/contests/:contestId/${suffix}`,
              element: h(page),
            }),
            h(Route, { path: '/login', element: h(LoginPage) }),
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

test('participant preview is exclusive in both selection directions and saves as its own role', async () => {
  await render();
  await input(inputByLabel('이메일 (필수)'), 'preview@example.test');
  await input(inputByLabel('이름 (필수)'), '참가자 화면 검수자');
  await click(role('출제진'));
  await click(role('공지 작성'));
  await click(role('참가자 미리보기'));
  assert.equal(role('출제진').checked, false);
  assert.equal(role('공지 작성').checked, false);
  await click(role('대회 마스터'));
  assert.equal(role('참가자 미리보기').checked, false);
  await click(role('참가자 미리보기'));
  assert.equal(role('대회 마스터').checked, false);
  await click(role('검수진'));
  assert.equal(role('참가자 미리보기').checked, false);
  await click(role('참가자 미리보기'));
  assert.equal(role('검수진').checked, false);
  await click(button('운영자 추가'));
  assert.deepEqual(creates[0].body.roles, ['participant_preview']);
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
      ...staff('preview@example.test', ['participant_preview']),
      display_name: '미리보기 계정',
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
    ['preview@example.test', '미리보기 계정 / 참가자 미리보기'],
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

test('settings manager sees settings without participant division or staff controls', async () => {
  setActor(['contest.view', 'contest.settings.manage']);
  await render(SettingsPage, 'settings');
  assert.ok(button('변경사항 저장'));
  assert.equal(button('유형 추가'), undefined);
  assert.equal(button('운영자 추가'), undefined);
  assert.equal(reads, 0);
  assert.equal(container.textContent.includes('assigned@example.test'), false);
});

test('participant manager creates divisions from participant management without settings permission', async () => {
  setActor([
    'contest.view',
    'contest.participant.view',
    'contest.participant.manage',
  ]);
  await render(ParticipantsPage, 'participants');
  assert.ok(button('유형 추가'));
  assert.equal(button('변경사항 저장'), undefined);
  await input(inputByLabel('유형 이름'), '고등부');
  await click(button('유형 추가'));
  assert.deepEqual(divisionCreates, [
    {
      contestId: 'contest',
      token: 'staff-token',
      body: { name: '고등부', description: '' },
    },
  ]);
  assert.match(container.textContent, /참가 유형을 저장했습니다/);
});

test('participant view-only permission does not expose division editing', async () => {
  setActor(['contest.view', 'contest.participant.view']);
  await render(ParticipantsPage, 'participants');
  assert.equal(button('유형 추가'), undefined);
  assert.equal(container.textContent.includes('참가 유형 관리'), false);
});

test('master settings page keeps staff management on its separate tab without fetching operators', async () => {
  await render(SettingsPage, 'settings');
  assert.ok(button('변경사항 저장'));
  assert.equal(button('유형 추가'), undefined);
  assert.equal(button('운영자 추가'), undefined);
  assert.equal(reads, 0);
  assert.equal(container.textContent.includes('assigned@example.test'), false);
});

test('contest settings defaults to manual release and saves the chosen resolver mode', async () => {
  await render(SettingsPage, 'settings');
  const choices = container.querySelectorAll(
    'input[name="scoreboard_release_mode"]',
  );
  assert.equal(choices.length, 3);
  assert.equal([...choices].find((input) => input.checked).value, 'manual');
  await click(container.querySelector('input[value="resolver"]'));
  await click(button('변경사항 저장'));
  assert.equal(settingsChanges.length, 1);
  assert.equal(settingsChanges[0].body.scoreboard_release_mode, 'resolver');
  assert.ok(window.localStorage.getItem('zoj.scoreboard.updated.contest'));
  assert.match(
    container.textContent,
    /열람 범위가 비공개이면 참가자는 볼 수 없습니다/,
  );
});

test('a started release disables mode selection but preserves the saved mode', async () => {
  contestOverrides = {
    scoreboard_release_mode: 'resolver',
    scoreboard_release_locked: true,
  };
  await render(SettingsPage, 'settings');
  const selected = container.querySelector('input[value="resolver"]');
  assert.equal(selected.checked, true);
  assert.equal(selected.closest('fieldset').disabled, true);
  assert.match(container.textContent, /공개 방식을 변경할 수 없습니다/);
});

test('staff manager sees staff controls only and cannot assign or edit masters', async () => {
  setActor(['contest.view', 'contest.staff.manage']);
  await render();
  assert.equal(button('변경사항 저장'), undefined);
  assert.equal(button('유형 추가'), undefined);
  assert.ok(button('운영자 추가'));
  assert.ok(reads > 0);
  assert.equal(role('대회 마스터'), undefined);
  assert.ok(role('참가자 미리보기'));
  assert.equal(
    operatorCard('assigned@example.test').querySelector('button'),
    null,
  );
  assert.equal(
    operatorCard('master@example.test').querySelector('button'),
    null,
  );
  assert.ok(
    button('이름·이메일·권한 수정', operatorCard('reviewer@example.test')),
  );
});

test('editing submits old email in the route and new email, name and roles in the body while assigned masters allow only name editing', async () => {
  await render();
  assert.ok(button('이름 수정', operatorCard('assigned@example.test')));
  assert.equal(
    button('제거', operatorCard('assigned@example.test')),
    undefined,
  );
  await click(
    button('이름·이메일·권한 수정', operatorCard('reviewer@example.test')),
  );
  assert.equal(inputByLabel('이메일 (필수)').disabled, false);
  await input(inputByLabel('이메일 (필수)'), 'new-reviewer@example.test');
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
        email: 'new-reviewer@example.test',
        roles: ['problem_reviewer', 'problem_author'],
      },
    },
  ]);
  assert.deepEqual(removals, []);
  assert.equal(sessionClears, 0);
  assert.ok(operatorCard('new-reviewer@example.test'));
  assert.match(container.textContent, /새 이메일로 다시 로그인해야 합니다/);
});

test('operator update API encodes the old address and sends the new address in the PATCH body', async () => {
  const body = {
    email: 'new@example.test',
    display_name: '운영자',
    roles: ['problem_reviewer'],
  };
  await updateContestOperator(
    'contest',
    'old+review@example.test',
    'token',
    body,
  );
  assert.deepEqual(apiCalls, [
    {
      url: '/operator/contests/contest/operators/old%2Breview%40example.test',
      token: 'token',
      init: { method: 'PATCH', body: JSON.stringify(body) },
    },
  ]);
});

test('successful self email change clears sessions and cached data and opens login with the new address and success notice', async () => {
  operators = [staff('actor@example.test', ['master'])];
  await render();
  client.setQueryData(['private-old-account'], 'old account data');
  await click(
    button('이름·이메일·권한 수정', operatorCard('actor@example.test')),
  );
  await input(inputByLabel('이메일 (필수)'), 'new-actor@example.test');
  await click(button('변경사항 저장'));
  assert.equal(sessionClears, 1);
  assert.equal(client.getQueryData(['private-old-account']), undefined);
  assert.equal(currentLocation.pathname, '/login');
  assert.equal(currentLocation.search, '?reason=email_changed');
  assert.equal(
    container.querySelector('input[type="email"]').value,
    'new-actor@example.test',
  );
  assert.match(
    container.textContent,
    /이메일을 변경했습니다. 새 이메일로 다시 로그인해 주세요/,
  );
});

test('same normalized self email keeps the session while updating the name', async () => {
  operators = [staff('actor@example.test', ['master'])];
  await render();
  await click(
    button('이름·이메일·권한 수정', operatorCard('actor@example.test')),
  );
  await input(inputByLabel('이메일 (필수)'), 'Actor@Example.test');
  await input(inputByLabel('이름 (필수)'), '수정된 이름');
  await click(button('변경사항 저장'));
  assert.equal(sessionClears, 0);
  assert.equal(
    currentLocation.pathname,
    '/operator/contests/contest/operators',
  );
});

for (const [status, code, message] of [
  [409, 'email_already_in_use', '이미 등록된 이메일'],
  [403, 'email_change_scope_denied', '모든 대회에서 운영자 관리 권한'],
  [409, 'assigned_master_email_immutable', '서비스 관리자만 변경'],
  [409, 'email_change_participant_identity', '참가자 계정에도 연결된 이메일'],
]) {
  test(`failed email edit (${code}) preserves the form and current session`, async () => {
    updateError = new ApiClientError(status, code, 'server error');
    await render();
    await click(
      button('이름·이메일·권한 수정', operatorCard('reviewer@example.test')),
    );
    await input(inputByLabel('이메일 (필수)'), 'blocked@example.test');
    await click(button('변경사항 저장'));
    assert.equal(sessionClears, 0);
    assert.equal(inputByLabel('이메일 (필수)').value, 'blocked@example.test');
    assert.equal(inputByLabel('이름 (필수)').value, 'reviewer');
    assert.match(container.textContent, new RegExp(message));
    assert.ok(operatorCard('reviewer@example.test'));
  });
}

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
  [
    'participant preview cannot open settings',
    'contest.participant.preview',
    SettingsPage,
    'settings',
  ],
  [
    'participant preview cannot open operators',
    'contest.participant.preview',
    OperatorsPage,
    'operators',
  ],
]) {
  test(`${label} or fetch operator accounts by direct URL`, async () => {
    setActor(
      scope === 'contest.participant.preview'
        ? [scope]
        : ['contest.view', scope],
    );
    await render(page, suffix);
    assert.equal(button('운영자 추가'), undefined);
    assert.equal(button('변경사항 저장'), undefined);
    assert.equal(reads, 0);
  });
}

async function selectOwner(email) {
  const select = container.querySelector('select');
  await act(async () => {
    select.value = email;
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await flush();
}
function ownerSetup() {
  setActor(['contest.*', 'contest.owner']);
  operators = [
    staff('actor@example.test', ['owner'], true),
    staff('reviewer@example.test', ['problem_reviewer']),
  ];
  session.operatorSession.staff = operators[0];
  session.operatorContests = [
    {
      contest: { contest_id: 'contest' },
      scopes: ['contest.*', 'contest.owner'],
    },
  ];
}

test('owner delegation requires reviewing the named recipient and updates the former owner session immediately', async () => {
  ownerSetup();
  await render();
  assert.equal(role('대회 총괄'), undefined);
  assert.ok(button('이름 수정', operatorCard('actor@example.test')));
  assert.equal(button('제거', operatorCard('actor@example.test')), undefined);
  assert.equal(button('위임 내용 확인').disabled, true);
  await selectOwner('reviewer@example.test');
  assert.equal(transfers.length, 0);
  await click(button('위임 내용 확인'));
  assert.match(
    container.querySelector('[aria-label="총괄 위임 확인"]').textContent,
    /reviewer@example.test/,
  );
  await click(button('취소'));
  assert.equal(transfers.length, 0);
  await click(button('위임 내용 확인'));
  await click(button('총괄 위임 확정'));
  assert.deepEqual(transfers, [
    {
      contestId: 'contest',
      token: 'staff-token',
      email: 'reviewer@example.test',
    },
  ]);
  assert.equal(button('총괄 위임 확정'), undefined);
  assert.match(
    operatorCard('reviewer@example.test').textContent,
    /reviewer \/ 총괄/,
  );
  assert.match(
    operatorCard('actor@example.test').textContent,
    /actor \/ 마스터/,
  );
  assert.deepEqual(session.operatorSession.staff.contest_roles.contest, [
    'master',
  ]);
  assert.deepEqual(session.operatorSession.staff.protected_master_contests, []);
  assert.deepEqual(session.operatorContests[0].scopes, ['contest.*']);
});

test('ordinary masters can see the owner but have no delegation control', async () => {
  operators = [
    staff('owner@example.test', ['owner'], true),
    staff('actor@example.test', ['master']),
  ];
  await render();
  assert.match(container.textContent, /owner \/ 총괄/);
  assert.equal(container.querySelector('select'), null);
  assert.equal(button('위임 내용 확인'), undefined);
});

test('owner can edit their name while email and role stay fixed and the current session updates immediately', async () => {
  ownerSetup();
  await render();
  await click(button('이름 수정', operatorCard('actor@example.test')));
  assert.match(container.textContent, /총괄 이름 수정/);
  assert.equal(inputByLabel('이메일 (필수)').disabled, true);
  assert.equal(role('대회 마스터'), undefined);
  assert.equal(role('검수진'), undefined);
  assert.match(container.textContent, /대회 총괄 · 권한 유지/);
  await input(inputByLabel('이름 (필수)'), '  손동열  ');
  await click(button('변경사항 저장'));
  assert.deepEqual(updates, [
    {
      contestId: 'contest',
      email: 'actor@example.test',
      token: 'staff-token',
      body: {
        email: 'actor@example.test',
        display_name: '손동열',
        roles: ['master'],
      },
    },
  ]);
  assert.equal(sessionClears, 0);
  assert.equal(session.account.display_name, '손동열');
  assert.equal(session.operatorSession.staff.display_name, '손동열');
  assert.deepEqual(session.operatorSession.staff.contest_roles.contest, [
    'owner',
  ]);
  assert.deepEqual(session.operatorSession.staff.contest_scopes.contest, [
    'contest.*',
    'contest.owner',
  ]);
  assert.deepEqual(session.operatorSession.staff.protected_master_contests, [
    'contest',
  ]);
  assert.match(
    operatorCard('actor@example.test').textContent,
    /손동열 \/ 총괄/,
  );
  assert.equal(button('제거', operatorCard('actor@example.test')), undefined);
  assert.deepEqual(transfers, []);
  assert.deepEqual(removals, []);
});

test('master can edit the owner name without gaining delegation controls or changing their own name', async () => {
  operators = [
    staff('owner@example.test', ['owner'], true),
    staff('actor@example.test', ['master']),
  ];
  await render();
  await click(button('이름 수정', operatorCard('owner@example.test')));
  await input(inputByLabel('이름 (필수)'), '새 총괄');
  await click(button('변경사항 저장'));
  assert.match(
    operatorCard('owner@example.test').textContent,
    /새 총괄 \/ 총괄/,
  );
  assert.equal(session.account.display_name, '운영자');
  assert.equal(button('위임 내용 확인'), undefined);
});

test('staff managers cannot edit the owner name', async () => {
  setActor(['contest.view', 'contest.staff.manage']);
  operators = [staff('owner@example.test', ['owner'], true)];
  await render();
  assert.equal(
    operatorCard('owner@example.test').querySelector('button'),
    null,
  );
});

test('failed owner name edit preserves the form and the existing session name', async () => {
  ownerSetup();
  updateError = new ApiClientError(
    403,
    'permission_denied',
    'Permission denied',
  );
  await render();
  await click(button('이름 수정', operatorCard('actor@example.test')));
  await input(inputByLabel('이름 (필수)'), '바꿀 이름');
  await click(button('변경사항 저장'));
  assert.equal(inputByLabel('이름 (필수)').value, '바꿀 이름');
  assert.equal(inputByLabel('이메일 (필수)').disabled, true);
  assert.equal(session.operatorSession.staff.display_name, 'actor');
  assert.equal(sessionClears, 0);
});

test('failed owner transfer preserves the selected recipient and current owner', async () => {
  ownerSetup();
  transferError = new ApiClientError(
    403,
    'contest_owner_transfer_denied',
    '현재 대회 총괄만 위임할 수 있습니다.',
  );
  await render();
  await selectOwner('reviewer@example.test');
  await click(button('위임 내용 확인'));
  await click(button('총괄 위임 확정'));
  assert.match(
    container.querySelector('[role="alert"]').textContent,
    /현재 대회 총괄만/,
  );
  assert.equal(
    container.querySelector('select').value,
    'reviewer@example.test',
  );
  assert.deepEqual(session.operatorSession.staff.contest_roles.contest, [
    'owner',
  ]);
});

test('contest visibility stays separate from lifecycle and restricts anonymous resource choices after ending', async () => {
  contestOverrides = {
    visibility: 'public',
    visibility_after_end: 'public',
    ...Object.fromEntries(
      [
        'problem',
        'scoreboard',
        'submission',
        'board',
        'notice',
        'editorial',
      ].map((key) => [key + '_access_after_end', 'public']),
    ),
  };
  await render(SettingsPage, 'settings');
  const before = container.querySelector(
    'input[name="visibility"][value="private"]',
  );
  const after = container.querySelector(
    'input[name="visibility_after_end"][value="private"]',
  );
  const status = [...container.querySelectorAll('label')]
    .find((el) => el.textContent.trim().startsWith('상태'))
    .querySelector('select');
  await click(before);
  assert.equal(status.value, 'draft');
  assert.ok(container.querySelector('option[value="public"]'));
  await click(after);
  assert.equal(container.querySelector('option[value="public"]'), null);
  const resources = [
    ...container.querySelectorAll('.zoj-settings-access select'),
  ];
  assert.equal(resources.length, 6);
  assert.ok(resources.every((select) => select.value === 'participants'));
  await click(button('변경사항 저장'));
  assert.equal(settingsChanges.at(-1).body.visibility, 'private');
  assert.equal(settingsChanges.at(-1).body.visibility_after_end, 'private');
  assert.equal('status' in settingsChanges.at(-1).body, false);
  assert.ok(
    [
      'problem',
      'scoreboard',
      'submission',
      'board',
      'notice',
      'editorial',
    ].every(
      (key) =>
        settingsChanges.at(-1).body[key + '_access_after_end'] ===
        'participants',
    ),
  );
  await click(
    container.querySelector(
      'input[name="visibility_after_end"][value="public"]',
    ),
  );
  assert.ok(container.querySelector('option[value="public"]'));
  assert.ok(
    [...container.querySelectorAll('.zoj-settings-access select')].every(
      (select) => select.value === 'participants',
    ),
  );
});

test('visibility can change during a running contest while its lifecycle remains locked', async () => {
  contestOverrides = { status: 'running' };
  await render(SettingsPage, 'settings');
  const status = [...container.querySelectorAll('label')]
    .find((el) => el.textContent.trim().startsWith('상태'))
    .querySelector('select');
  assert.equal(status.disabled, true);
  await click(
    container.querySelector('input[name="visibility"][value="private"]'),
  );
  await click(button('변경사항 저장'));
  assert.equal(settingsChanges.at(-1).body.visibility, 'private');
  assert.equal('status' in settingsChanges.at(-1).body, false);
});

test('saving one field sends only that field and leaves untouched schedules intact', async () => {
  contestOverrides = { status: 'open', start_at: '2026-10-01T01:00:37Z' };
  await render(SettingsPage, 'settings');
  assert.equal(button('변경사항 저장').disabled, true);
  assert.equal(
    container.querySelectorAll('.operator-settings-section[open]').length,
    1,
  );
  await input(inputByLabel('대회명'), '제목만 변경');
  await click(button('변경사항 저장'));
  assert.deepEqual(settingsChanges.at(-1).body, { title: '제목만 변경' });
  assert.equal(contestOverrides.start_at, '2026-10-01T01:00:37Z');
});
