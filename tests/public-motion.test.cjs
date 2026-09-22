const { test, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<html><body></body></html>', {
  url: 'https://judge.test/',
});
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const file = path.resolve(__dirname, '../src/shared/hooks/usePublicMotion.ts');
const loaded = new Module(file, module);
loaded.filename = file;
loaded.paths = Module._nodeModulePaths(path.dirname(file));
loaded._compile(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  file,
);
const useMotion = loaded.exports.default;
let root, host, motion, listener, media;
function Subject() {
  motion = useMotion();
  return React.createElement(
    'button',
    {
      onClick: motion.toggle,
      disabled: motion.reduced,
      'aria-pressed': motion.paused,
    },
    'motion',
  );
}
beforeEach(() => {
  window.localStorage.clear();
  media = {
    matches: false,
    addEventListener: (name, fn) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
  };
  window.matchMedia = () => media;
  document.body.innerHTML = '<main></main>';
  host = document.querySelector('main');
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
});
after(() => dom.window.close());
async function render() {
  await act(async () => root.render(React.createElement(Subject)));
}
test('manual motion preference survives page unmount and remount', async () => {
  await render();
  assert.equal(motion.paused, false);
  await act(async () => host.querySelector('button').click());
  assert.equal(motion.paused, true);
  await act(async () => root.render(null));
  await render();
  assert.equal(motion.paused, true);
  await act(async () => host.querySelector('button').click());
  assert.equal(window.localStorage.getItem('zoj.publicMotion'), 'on');
});
test('system reduced motion takes priority and responds to changes without losing manual preference', async () => {
  window.localStorage.setItem('zoj.publicMotion', 'off');
  await render();
  await act(async () => {
    media.matches = true;
    listener();
  });
  assert.equal(motion.paused, true);
  assert.equal(host.querySelector('button').disabled, true);
  await act(async () => {
    media.matches = false;
    listener();
  });
  assert.equal(motion.paused, true);
  assert.equal(host.querySelector('button').disabled, false);
});
test('motion still works when browser storage is unavailable', async () => {
  const original = window.Storage.prototype.setItem;
  window.Storage.prototype.setItem = () => {
    throw Error('unavailable');
  };
  try {
    await render();
    await act(async () => host.querySelector('button').click());
    assert.equal(motion.paused, true);
  } finally {
    window.Storage.prototype.setItem = original;
  }
});
