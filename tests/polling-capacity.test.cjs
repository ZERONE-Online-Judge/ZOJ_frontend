const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(
  path.join(__dirname, '../src/shared/query/polling.ts'),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const target = { exports: {} };
new Function('module', 'exports', 'require', compiled)(
  target,
  target.exports,
  () => ({
    isApiClientError: (error) => error?.isApiClientError === true,
  }),
);
const { pollDelay, queryRetryDelay } = target.exports;

test('polling spreads requests around the existing refresh interval', () => {
  assert.equal(pollDelay(5000, 0), 4250);
  assert.equal(pollDelay(5000, 0.5), 5000);
  assert.equal(pollDelay(5000, 1), 5750);
  assert.equal(pollDelay(3000, 0), 2550);
  assert.equal(pollDelay(15000, 1), 17250);
});

test('overload retries honor server delay and add bounded jitter', () => {
  const error = { isApiClientError: true, details: { retry_after_seconds: 3 } };
  const delay = queryRetryDelay(0, error);
  assert.ok(delay >= 3000 && delay <= 4000);
  assert.ok(queryRetryDelay(1, new Error()) >= 2000);
  assert.ok(
    queryRetryDelay(0, { ...error, details: { retry_after_seconds: 9999 } }) <=
      61000,
  );
});
