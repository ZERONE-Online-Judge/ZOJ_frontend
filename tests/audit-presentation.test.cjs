const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const filename = path.resolve(
  __dirname,
  '../src/components/audit/auditPresentation.ts',
);
const loaded = new Module(filename, module);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  filename,
);
const { actionLabel, auditChanges, groupAuditLogs, valueLabel } =
  loaded.exports;
function log(overrides = {}) {
  return {
    operational_audit_log_id: 'one',
    scope: 'operator',
    action: 'raw',
    method: 'POST',
    path: '/api/operator/contests/c/problems/p/testcase-sets/s/testcases',
    status_code: 200,
    contest_id: 'c',
    actor_email: 'one@example.com',
    client_ip: '127.0.0.1',
    created_at: '2026-09-24T10:00:00Z',
    details: {},
    ...overrides,
  };
}

test('specific actions never get mislabeled by parent resources', () => {
  for (const [url, method, label] of [
    ['/divisions/d/scoreboard/release', 'POST', '순위 전체 공개'],
    ['/problems/p/judge-bundle:warm', 'POST', '채점 패키지 준비'],
    [
      '/problems/p/verified-testcase-sets:zip',
      'POST',
      '테스트케이스 일괄 검증 등록',
    ],
    ['/problems/p', 'DELETE', '문제 삭제'],
    ['/divisions/d', 'DELETE', '참가 유형 삭제'],
    [
      '/participants/t/members/m/sessions:revoke',
      'POST',
      '참가자 계정 강제 로그아웃',
    ],
    ['/storage/presign-upload', 'POST', '파일 업로드 주소 발급'],
  ])
    assert.equal(
      actionLabel(
        log({
          path: '/api/operator/contests/c' + url,
          method,
          details: { body: { action: 'all' } },
        }),
      ),
      label,
    );
  assert.equal(
    actionLabel(log({ path: '/api/admin/service-notices/n', method: 'PATCH' })),
    '서비스 공지 수정',
  );
});

test('old audit request values are not presented as actual changes', () => {
  const details = {
    changes: [
      { field: 'title', old: 'old', new: 'new' },
      { field: 'organization_name', old: 'ZOJ', new: 'ZOJ' },
      {
        field: 'start_at',
        old: '2026-01-01T00:00:00Z',
        new: '2026-01-01T09:00:00+09:00',
      },
      { field: 'visibility', new: 'public' },
    ],
  };
  assert.deepEqual(
    auditChanges(log({ details })).map((x) => x.field),
    ['title'],
  );
  assert.deepEqual(auditChanges(log({ details, status_code: 403 })), []);
});

test('verified long-text changes remain visible even when truncated prefixes match', () => {
  const details = {
    schema_version: 2,
    change_kind: 'updated',
    changes: [
      {
        field: 'statement',
        old: 'same prefix...',
        new: 'same prefix...',
        truncated: true,
      },
    ],
  };
  assert.equal(auditChanges(log({ details })).length, 1);
  assert.equal(
    auditChanges(log({ details: { ...details, schema_version: 1 } })).length,
    0,
  );
});

test('repeated testcases collapse while every failure and individual ID remains available', () => {
  const logs = Array.from({ length: 70 }, (_, index) =>
    log({
      operational_audit_log_id: String(index),
      status_code: index === 5 ? 422 : 200,
      created_at: new Date(
        Date.parse('2026-09-24T10:00:00Z') - index * 1000,
      ).toISOString(),
    }),
  );
  const groups = groupAuditLogs(logs);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].logs.length, 70);
  assert.equal(groups[0].logs.filter((x) => x.status_code === 422).length, 1);
  assert.deepEqual(
    groups.flatMap((x) => x.logs.map((x) => x.operational_audit_log_id)),
    logs.map((x) => x.operational_audit_log_id),
  );
});

test('grouping cannot combine another actor, target, contest, method or distant time', () => {
  const items = [
    log(),
    log({ operational_audit_log_id: 'actor', actor_email: 'two@example.com' }),
    log({
      operational_audit_log_id: 'target',
      path: '/api/operator/contests/c/problems/p2/testcase-sets/s/testcases',
    }),
    log({ operational_audit_log_id: 'contest', contest_id: 'another' }),
    log({ operational_audit_log_id: 'delete', method: 'DELETE' }),
    log({
      operational_audit_log_id: 'old',
      created_at: '2026-09-24T09:55:00Z',
    }),
    log({
      operational_audit_log_id: 'settings',
      path: '/api/operator/contests/c/settings',
      method: 'PATCH',
    }),
  ];
  assert.equal(groupAuditLogs(items).length, items.length);
});

test('setting values have readable labels', () => {
  assert.equal(valueLabel('private', 'problem_access_after_end'), '비공개');
  assert.equal(valueLabel('running', 'status'), '진행 중');
  assert.equal(valueLabel('resolver', 'scoreboard_release_mode'), '리졸버');
});
