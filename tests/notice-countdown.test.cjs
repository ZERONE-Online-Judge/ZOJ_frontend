const { test, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://zoj.test/',
});
global.window = dom.window;
global.document = dom.window.document;
global.Event = dom.window.Event;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
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
    if (id === '@/utils/Icons') return { SvgIcon: () => null };
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
const { renderNoticeCountdown: render } = source(
  'domains/serviceCommunication/noticeCountdown.ts',
);
const Banner = source('components/contest/ContestEmergencyNotice.tsx').default;
const { default: NoticeText, NoticeCountdownCommands: Commands } = source(
  'components/contest/NoticeCountdownText.tsx',
);
const contest = {
  status: 'open',
  scoreboard_freeze_mode: 'auto',
  start_at: '2035-09-05T12:30:00Z',
  freeze_at: '2035-09-05T13:00:00Z',
  end_at: '2035-09-05T14:00:00Z',
};
const start = Date.parse(contest.start_at);
const now = start - 1800000;
const command = '{{countdown:start}}';

test('one allowlisted command renders exact remaining time, completion and long durations', () => {
  assert.equal(
    render(command, contest, now).text,
    '대회 시작까지 30분 남았습니다.',
  );
  assert.equal(
    render(command, contest, now + 1000).text,
    '대회 시작까지 29분 59초 남았습니다.',
  );
  assert.equal(
    render(command, contest, now + 60000).text,
    '대회 시작까지 29분 남았습니다.',
  );
  assert.equal(
    render(command, contest, start - 1).text,
    '대회 시작까지 1초 남았습니다.',
  );
  assert.equal(render(command, contest, start).text, '대회가 시작되었습니다.');
  assert.equal(render(command, contest, start + 1).pending, false);
  assert.equal(
    render(command, contest, start - 90061000).text,
    '대회 시작까지 1일 1시간 1분 1초 남았습니다.',
  );
  assert.equal(
    render('안내\n' + command + '\n{{countdown:end}}', contest, now).text,
    '안내\n대회 시작까지 30분 남았습니다.\n대회 종료까지 2시간 남았습니다.',
  );
});

test('dismissal identity is stable while ticking and refetching, and changes on completion or rescheduling', () => {
  const initial = render(command, contest, now);
  assert.equal(
    initial.identity,
    render(command, { ...contest }, now + 1000).identity,
  );
  assert.notEqual(initial.identity, render(command, contest, start).identity);
  assert.notEqual(
    initial.identity,
    render(command, { ...contest, start_at: contest.end_at }, now).identity,
  );
  const snapshot = '{{countdown:start@2035-09-05T12:30:00+00:00}}';
  assert.equal(
    render(snapshot, { ...contest, start_at: contest.end_at }, now).text,
    initial.text,
  );
});

test('manual modes, missing schedules, literal text and timezone offsets render safely', () => {
  assert.equal(
    render(
      '{{countdown:freeze}}',
      { ...contest, scoreboard_freeze_mode: 'live' },
      now,
    ).text,
    '스코어보드가 실시간으로 갱신됩니다.',
  );
  assert.match(
    render(
      '{{countdown:freeze}}',
      { ...contest, scoreboard_freeze_mode: 'frozen' },
      now,
    ).text,
    /프리즈되었습니다/,
  );
  assert.match(
    render('{{countdown:end}}', { ...contest, status: 'ended' }, now).text,
    /종료되었습니다/,
  );
  assert.match(
    render(command, { ...contest, status: 'draft' }, now).text,
    /확정되지 않았습니다/,
  );
  assert.match(render(command, undefined, now).text, /일정을 확인/);
  assert.equal(
    render('{{countdown:start@2035-09-05T21:30:00+09:00}}', contest, now).text,
    '대회 시작까지 30분 남았습니다.',
  );
  for (const text of [
    '',
    '일반 공지',
    '{{countdown:unknown}}',
    '{{countdown:start@bad}}',
    '{{countdown:start@2035-09-05T12:30:00}}',
    '<script>alert(1)</script>',
  ]) {
    const result = render(text, contest, now);
    assert.equal(result.text, text);
    assert.equal(result.pending, false);
  }
});

let root, container;
const realNow = Date.now,
  realInterval = window.setInterval,
  realClear = window.clearInterval;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  container?.remove();
  Date.now = realNow;
  window.setInterval = realInterval;
  window.clearInterval = realClear;
  window.localStorage.clear();
});
after(() => dom.window.close());
async function mount(element) {
  if (!root) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  await act(async () => root.render(element));
  await act(
    async () => new Promise((resolve) => global.setTimeout(resolve, 10)),
  );
}

test('banner counts down without requests, stays dismissed during ticks, announces completion once and cleans up', async () => {
  let clock = now;
  Date.now = () => clock;
  const timers = new Map();
  let id = 0;
  window.setInterval = (fn) => {
    timers.set(++id, fn);
    return id;
  };
  window.clearInterval = (id) => timers.delete(id);
  const element = (patch = {}) =>
    React.createElement(Banner, {
      contestId: 'c',
      notice: 'server snapshot',
      template: command,
      contest,
      ...patch,
    });
  const tick = async (time) => {
    clock = time;
    await act(async () => [...timers.values()].forEach((fn) => fn()));
    await act(
      async () => new Promise((resolve) => global.setTimeout(resolve, 10)),
    );
  };
  await mount(element());
  assert.match(container.textContent, /30분 남았습니다/);
  await tick(now + 1000);
  assert.match(container.textContent, /29분 59초 남았습니다/);
  await act(async () => container.querySelector('button').click());
  assert.equal(container.textContent, '');
  await tick(now + 60000);
  await mount(element({ notice: 'new server snapshot' }));
  assert.equal(container.textContent, '');
  await act(async () => root.unmount());
  root = null;
  await mount(element());
  assert.equal(container.textContent, '', 'dismissal survives reload');
  await tick(start);
  assert.match(container.textContent, /대회가 시작되었습니다/);
  assert.equal(timers.size, 0, 'completed countdown stops its interval');
  await act(async () => container.querySelector('button').click());
  await mount(element());
  assert.equal(container.textContent, '');
  await mount(element({ contest: { ...contest, start_at: contest.end_at } }));
  assert.match(container.textContent, /대회 시작까지 1시간 30분/);
  await act(async () => root.unmount());
  root = null;
  assert.equal(timers.size, 0);
});

test('restoring a background tab catches up immediately; preview renders text without HTML execution', async () => {
  let clock = now;
  Date.now = () => clock;
  await mount(
    React.createElement(NoticeText, {
      text: '<script>alert(1)</script>\n' + command,
      contest,
    }),
  );
  assert.equal(container.querySelector('script'), null);
  assert.match(container.textContent, /30분 남았습니다/);
  clock = start;
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    value: false,
  });
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  assert.match(container.textContent, /대회가 시작되었습니다/);
});

test('insertion buttons provide the three supported commands without submitting a form', async () => {
  const inserted = [];
  await mount(
    React.createElement(Commands, {
      onInsert: (command) => inserted.push(command),
    }),
  );
  for (const button of container.querySelectorAll('button')) {
    assert.equal(button.type, 'button');
    await act(async () => button.click());
  }
  assert.deepEqual(inserted, [
    '{{countdown:start}}',
    '{{countdown:freeze}}',
    '{{countdown:end}}',
  ]);
});
