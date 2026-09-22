const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

function load(file) {
  const filename = path.resolve(
    __dirname,
    '../src/domains/usageAnalytics',
    file,
  );
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  compiled._compile(code, filename);
  return compiled.exports;
}
function harness(options = {}) {
  const dom = new JSDOM('', {
    url: 'https://zoj.kr/about',
    referrer: 'https://www.google.com/search?q=private',
    pretendToBeVisual: true,
  });
  for (const key of [
    'window',
    'document',
    'navigator',
    'localStorage',
    'sessionStorage',
  ]) {
    Object.defineProperty(global, key, {
      configurable: true,
      value: dom.window[key],
    });
  }
  let time = 1_000_000,
    sequence = 0,
    hidden = false;
  const timeouts = new Map(),
    intervals = new Map(),
    sent = [];
  const stops = [];
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  if (options.optOut)
    Object.defineProperty(navigator, options.optOut, {
      value: options.optOut === 'doNotTrack' ? '1' : true,
    });
  if (options.blockStorage) {
    Object.defineProperty(global, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('Blocked');
      },
    });
    Object.defineProperty(global, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('Blocked');
      },
    });
  }
  window.setTimeout = (callback) => {
    timeouts.set(++sequence, callback);
    return sequence;
  };
  window.clearTimeout = (id) => timeouts.delete(id);
  window.setInterval = (callback) => {
    intervals.set(++sequence, callback);
    return sequence;
  };
  window.clearInterval = (id) => intervals.delete(id);
  const tracker = load('tracker.ts');
  const start = (pathname = '/about') => {
    const stop = tracker.startUsageTracking({
      path: pathname,
      endpoint: '/api/public/usage',
      now: () => time,
      createId: () =>
        `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
      getToken: () => 'current-token',
      send: (payload, token) => sent.push({ ...payload, token }),
    });
    stops.push(stop);
    return stop;
  };
  return {
    ...tracker,
    start,
    sent,
    initial() {
      for (const [id, callback] of [...timeouts]) {
        timeouts.delete(id);
        callback();
      }
    },
    tick(ms) {
      time += ms;
      for (const callback of intervals.values()) callback();
    },
    visibility(value) {
      hidden = value;
      document.dispatchEvent(new window.Event('visibilitychange'));
    },
    close() {
      for (const stop of stops) stop();
      dom.window.close();
    },
  };
}

test('StrictMode cancellation and initial pageshow do not add visits; heartbeat and unload reuse an event', () => {
  const h = harness();
  try {
    h.start()();
    h.start();
    window.dispatchEvent(
      new window.PageTransitionEvent('pageshow', { persisted: false }),
    );
    assert.equal(h.sent.length, 0);
    h.initial();
    assert.equal(h.sent.length, 1);
    h.tick(30_000);
    window.dispatchEvent(new window.Event('pagehide'));
    assert.equal(new Set(h.sent.map((row) => row.event_id)).size, 1);
    assert.equal(h.sent.at(-1).active_seconds, 30);
    assert.equal(h.sent[0].referrer, 'https://www.google.com');
    assert.equal(h.sent[0].token, 'current-token');
  } finally {
    h.close();
  }
});

test('Hidden tabs do not accumulate time; a return after 30 minutes opens a new visit', () => {
  const h = harness();
  try {
    h.start();
    h.initial();
    h.tick(30_000);
    const first = h.sent[0];
    h.visibility(true);
    const count = h.sent.length;
    h.tick(29 * 60_000);
    assert.equal(h.sent.length, count);
    h.visibility(false);
    h.tick(30_000);
    assert.equal(h.sent.at(-1).active_seconds, 60);
    assert.equal(h.sent.at(-1).event_id, first.event_id);
    h.visibility(true);
    h.tick(31 * 60_000);
    h.visibility(false);
    assert.notEqual(h.sent.at(-1).event_id, first.event_id);
    assert.notEqual(h.sent.at(-1).visit_id, first.visit_id);
    assert.equal(h.sent.at(-1).visitor_id, first.visitor_id);
    assert.equal(h.sent.at(-1).active_seconds, 0);
  } finally {
    h.close();
  }
});

test('A route change counts a page in the same visit, even when storage is blocked', () => {
  const h = harness({ blockStorage: true });
  try {
    const stop = h.start();
    h.initial();
    h.tick(15_000);
    stop();
    h.start('/notices');
    h.initial();
    const first = h.sent[0],
      last = h.sent.at(-1);
    assert.notEqual(first.event_id, last.event_id);
    assert.equal(first.visitor_id, last.visitor_id);
    assert.equal(first.visit_id, last.visit_id);
    assert.equal(last.path, '/notices');
    assert.equal(last.referrer, 'https://zoj.kr');
  } finally {
    h.close();
  }
});

for (const optOut of ['doNotTrack', 'globalPrivacyControl']) {
  test(`${optOut} disables collection without storing an identifier`, () => {
    const h = harness({ optOut });
    try {
      h.start();
      h.initial();
      h.tick(60_000);
      assert.deepEqual(h.sent, []);
      assert.equal(localStorage.length, 0);
      assert.equal(sessionStorage.length, 0);
    } finally {
      h.close();
    }
  });
}

test('A suspended laptop is not counted as hours of active viewing', () => {
  const h = harness();
  try {
    h.start();
    h.initial();
    h.tick(3 * 60 * 60_000);
    assert.equal(h.sent.at(-1).active_seconds, 45);
    h.tick(24 * 60 * 60_000);
    assert.notEqual(h.sent[0].event_id, h.sent.at(-1).event_id);
  } finally {
    h.close();
  }
});

test('Only allowlisted support tabs are retained from query parameters', () => {
  const { usagePath } = load('tracker.ts');
  assert.equal(
    usagePath('/login', '?email=secret@example.com&token=abc'),
    '/login',
  );
  assert.equal(
    usagePath('/support', '?tab=privacy&email=secret'),
    '/support/privacy',
  );
  assert.equal(usagePath('/support', '?tab=secret'), '/support');
});

test('Date shortcuts use Korea calendar days across UTC and month boundaries', () => {
  const { koreaDate, dateRange } = load('format.ts');
  const date = new Date('2024-02-29T15:01:00Z');
  assert.equal(koreaDate(date), '2024-03-01');
  assert.deepEqual(dateRange(7, date), {
    start: '2024-02-24',
    end: '2024-03-01',
  });
});

test('CSV export quotes user-provided titles and prevents spreadsheet formula execution', () => {
  const { usageCsv } = load('format.ts');
  const report = {
    period: { start: '2026-09-22', end: '2026-09-23' },
    filters: { audience: 'all' },
    summary: { views: 5, visitors: 2, visits: 3, signed_in_users: 1 },
    timeline: [],
    heatmap: [],
    contests: [
      { title: '=HYPERLINK("bad")', views: 5, visitors: 2, visits: 3 },
    ],
    services: [],
    pages: [],
    devices: [],
    browsers: [],
    referrers: [],
    audiences: [],
    operations: {},
  };
  const csv = usageCsv(report);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"한국시간(KST)"'));
});
