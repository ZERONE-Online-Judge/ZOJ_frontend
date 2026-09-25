const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { JSDOM } = require('jsdom');
const file = path.resolve(
  __dirname,
  '../src/components/operator/VerificationMarkdown.tsx',
);
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = Module._nodeModulePaths(path.dirname(file));
const native = loaded.require.bind(loaded);
loaded.require = (id) => (id.endsWith('.css') ? {} : native(id));
loaded._compile(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  file,
);
const { default: Markdown, normalizeReportMarkdown } = loaded.exports;
const render = (text) =>
  new JSDOM(renderToStaticMarkup(React.createElement(Markdown, null, text)))
    .window.document;

test('real Markdown and KaTeX render math, inline code and multi-line test input', () => {
  const doc = render(
    '점수 $a^2/b$ · `status: accepted`\n\n\\[x+y=2\\]\n\n반례 `2\\nAAA 10 0 10\\nBBB 10 0 20\\n`',
  );
  assert.equal(doc.querySelectorAll('.katex').length, 2);
  assert.equal(doc.querySelector('code').textContent, 'status: accepted');
  assert.equal(
    doc.querySelector('pre code').textContent,
    '2\nAAA 10 0 10\nBBB 10 0 20\n',
  );
  assert.equal(doc.querySelector('pre').getAttribute('tabindex'), '0');
});
test('source string escapes and mathematical notation inside code are preserved', () => {
  const source = '```cpp\ncout << "\\n"; // \\(x\\)\n```';
  assert.equal(normalizeReportMarkdown(source), source);
  const doc = render(source + '\n\n`"2\\n"`');
  assert.match(doc.querySelector('pre code').textContent, /"\\n"/);
  assert.equal(doc.querySelector('.katex'), null);
});
test('report markup cannot load external images or execute raw HTML or unsafe links', () => {
  const doc = render(
    '<script>alert(1)</script>\n<img src=x onerror=alert(1)>\n\n![external](https://external.test/track)\n\n[bad](javascript:alert%281%29)\n\n$\\href{javascript:alert(1)}{x}$',
  );
  assert.equal(doc.querySelector('img,script'), null);
  for (const link of doc.querySelectorAll('a'))
    assert.ok(!link.href.startsWith('javascript:'));
});
