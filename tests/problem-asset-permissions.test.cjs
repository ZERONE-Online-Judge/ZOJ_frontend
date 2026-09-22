const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const cache = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const native = loaded.require.bind(loaded);
  loaded.require = (id) =>
    id.startsWith('@/') ? source(id.slice(2) + '.ts') : native(id);
  cache.set(filename, loaded);
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}
const { resolveAssetSource } = source('domains/problemManagement/document.ts');
const key = 'contests/contest-a/problems/problem-a/assets/문제 그림.png';
const encodedKey = key.split('/').map(encodeURIComponent).join('/');
const freshUrl = `/api/storage/objects/${encodedKey}?expires=9999999999&signature=fresh`;
const assets = [
  {
    asset_id: 'statement-image',
    storage_key: key,
    original_filename: '문제 그림.png',
    download_url: freshUrl,
  },
];

test('authorized raw storage links refresh missing and expired signatures with the current signed URL', () => {
  for (const url of [
    `/api/storage/objects/${encodedKey}`,
    `/api/storage/objects/${encodedKey}?expires=1&signature=expired#image`,
    `https://judge.test/api/storage/objects/${encodedKey}?signature=old`,
    `http://127.0.0.1:8000/api/storage/objects/${encodedKey}`,
    `/storage/objects/${encodedKey}?expires=1`,
  ])
    assert.equal(resolveAssetSource(url, assets), freshUrl);
});

test('a denied storage key cannot resolve to an allowed asset with the same basename', () => {
  for (const url of [
    `/api/storage/objects/contests/other/problems/other/assets/문제%20그림.png`,
    `https://judge.test/api/storage/objects/contests/other/problems/other/assets/문제%20그림.png`,
    `/storage/objects/contests/other/problems/other/assets/문제%20그림.png`,
  ])
    assert.equal(resolveAssetSource(url, assets), url);
  assert.equal(
    resolveAssetSource(`/api/storage/objects/${encodedKey}`, []),
    `/api/storage/objects/${encodedKey}`,
  );
});

test('external images and data URLs stay unchanged even when their filenames match a local asset', () => {
  for (const url of [
    'https://external.test/images/문제%20그림.png',
    'http://external.test/문제%20그림.png?file=1',
    '//external.test/문제%20그림.png',
    'data:image/png;base64,AA==',
    'blob:https://judge.test/statement-image',
  ])
    assert.equal(resolveAssetSource(url, assets), url);
});

test('malformed percent encoding and invalid URLs do not throw or select a matching basename', () => {
  for (const url of [
    '/api/storage/objects/contests/a/assets/%E0%A4%A',
    'https://judge.test/api/storage/objects/%ZZ',
    'https://[invalid/api/storage/objects/contests/a/assets/image.png',
    '%E0%A4%A',
    '문제%GG그림.png',
  ])
    assert.equal(resolveAssetSource(url, assets), url);
});

test('asset IDs use only the exact authorized asset while ordinary relative filenames retain support', () => {
  assert.equal(resolveAssetSource('asset://statement-image', assets), freshUrl);
  assert.equal(resolveAssetSource('asset://unknown-image', assets), '');
  assert.equal(resolveAssetSource('asset://statement-image', []), '');
  assert.equal(resolveAssetSource('문제%20그림.png', assets), freshUrl);
  assert.equal(resolveAssetSource('unlisted.png', assets), 'unlisted.png');
});
