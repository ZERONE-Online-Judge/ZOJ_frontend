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
// jsdom has no top layer; browser QA verifies native focus containment and sizing.
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
dom.window.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const h = React.createElement;
const cache = new Map();
function source(relative) {
  const filename = path.resolve(__dirname, '../src', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const nativeRequire = loaded.require.bind(loaded);
  loaded.require = (id) => {
    if (!id.startsWith('@/')) return nativeRequire(id);
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
const Modal = source('shared/ui/Modal.tsx').default;
const useConfirmation = source('shared/ui/useConfirmation.tsx').default;
let root, host;
beforeEach(() => {
  document.body.innerHTML = '<button id="trigger">열기</button><main></main>';
  document.body.style.overflow = 'auto';
  document.body.style.paddingRight = '7px';
  host = document.querySelector('main');
  root = createRoot(host);
  document.querySelector('#trigger').focus();
});
afterEach(async () => {
  await act(async () => root.unmount());
});
after(() => dom.window.close());
const panel = (props = {}) =>
  h(
    Modal,
    { 'aria-label': '파일 내용', ...props },
    props.children ??
      h('section', { className: 'zoj-modal-shell' }, h('button', null, '보기')),
  );

test('dialog uses the top layer portal, locks scrolling and restores the trigger and original styles', async () => {
  await act(async () => root.render(panel()));
  const dialog = document.querySelector('dialog');
  assert.equal(dialog.parentElement, document.body);
  assert.equal(dialog.open, true);
  assert.equal(document.activeElement, dialog);
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(host.querySelector('dialog'), null);
  await act(async () => root.render(null));
  assert.equal(document.body.style.overflow, 'auto');
  assert.equal(document.body.style.paddingRight, '7px');
  assert.equal(document.activeElement.id, 'trigger');
});

test('Escape requests dismissal, but a blocking progress dialog stays open', async () => {
  let closes = 0;
  await act(async () =>
    root.render(
      panel({
        onClose: () => {
          closes++;
        },
      }),
    ),
  );
  let cancel = new dom.window.Event('cancel', { cancelable: true });
  await act(async () => document.querySelector('dialog').dispatchEvent(cancel));
  assert.equal(closes, 1);
  assert.equal(cancel.defaultPrevented, true);
  await act(async () => root.render(panel()));
  cancel = new dom.window.Event('cancel', { cancelable: true });
  await act(async () => document.querySelector('dialog').dispatchEvent(cancel));
  assert.equal(closes, 1);
  assert.equal(document.querySelector('dialog').open, true);
  assert.equal(cancel.defaultPrevented, true);
});

test('drawer keeps the shared backdrop and requests dismissal without prematurely unlocking', async () => {
  let closes = 0;
  await act(async () =>
    root.render(
      panel({
        drawer: true,
        onClose: () => {
          closes++;
        },
      }),
    ),
  );
  const backdrop = document.querySelector('.zoj-modal-drawer');
  assert.ok(backdrop.classList.contains('zoj-modal-backdrop'));
  await act(async () => {
    backdrop.dispatchEvent(
      new dom.window.Event('pointerdown', { bubbles: true }),
    );
    backdrop.click();
  });
  assert.equal(closes, 1);
  assert.equal(document.body.style.overflow, 'hidden');
});

test('dragging out of content does not dismiss; clicking the backdrop does', async () => {
  let closes = 0;
  await act(async () =>
    root.render(
      panel({
        onClose: () => {
          closes++;
        },
      }),
    ),
  );
  const backdrop = document.querySelector('.zoj-modal-backdrop');
  const content = document.querySelector('section');
  await act(async () => {
    content.dispatchEvent(
      new dom.window.Event('pointerdown', { bubbles: true }),
    );
    backdrop.click();
  });
  assert.equal(closes, 0);
  await act(async () => {
    backdrop.dispatchEvent(
      new dom.window.Event('pointerdown', { bubbles: true }),
    );
    backdrop.click();
  });
  assert.equal(closes, 1);
});

test('closing a nested confirmation leaves the parent locked and focused', async () => {
  const nested = (open) =>
    panel({
      children: h(
        React.Fragment,
        null,
        h('button', { id: 'inside' }, '삭제'),
        open ? panel({ 'aria-label': '삭제 확인' }) : null,
      ),
    });
  await act(async () => root.render(nested(false)));
  document.querySelector('#inside').focus();
  await act(async () => root.render(nested(true)));
  assert.equal(document.querySelectorAll('dialog').length, 2);
  await act(async () => root.render(nested(false)));
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(document.activeElement.id, 'inside');
  await act(async () => root.render(null));
  assert.equal(document.body.style.overflow, 'auto');
});

test('confirmation waits for an explicit choice, supports cancel, and settles on unmount', async () => {
  let confirm;
  function Harness() {
    const state = useConfirmation();
    confirm = state.confirm;
    return state.dialog;
  }
  await act(async () => root.render(h(Harness)));
  let promise,
    settled = false;
  await act(async () => {
    promise = confirm('문제를 삭제할까요?');
    promise.then(() => {
      settled = true;
    });
  });
  assert.equal(settled, false);
  await act(async () =>
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent === '취소')
      .click(),
  );
  assert.equal(await promise, false);
  await act(async () => {
    promise = confirm('남은 순위를 공개할까요?', {
      title: '순위 공개 확인',
      confirmLabel: '공개',
      tone: 'primary',
    });
  });
  assert.equal(document.querySelector('h2').textContent, '순위 공개 확인');
  await act(async () =>
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent === '공개')
      .click(),
  );
  assert.equal(await promise, true);
  await act(async () => {
    promise = confirm('미완료 작업');
  });
  await act(async () => root.render(null));
  assert.equal(await promise, false);
});

const { default: ModalDialog, ModalButton } = source(
  'shared/ui/ModalDialog.tsx',
);
test('custom dialog body retains both layout classes so its inner content can scroll', async () => {
  await act(async () =>
    root.render(
      h(
        ModalDialog,
        { title: '문제 미리보기', customBody: true, fill: true },
        h('article', null, '긴 문제 본문'),
      ),
    ),
  );
  const body = document.querySelector('.zoj-modal-body');
  assert.ok(body, 'the shared shrinking body must be present');
  assert.ok(body.classList.contains('zoj-modal-body--custom'));
  assert.equal(body.querySelector('article').textContent, '긴 문제 본문');
});

test('shared dialog connects its heading and description and keeps footer actions operable', async () => {
  let closed = 0,
    applied = 0;
  await act(async () =>
    root.render(
      h(
        ModalDialog,
        {
          title: '변경 확인',
          description: '설정 변경 내용을 확인해 주세요.',
          onClose: () => closed++,
          footer: h(
            ModalButton,
            { tone: 'primary', onClick: () => applied++ },
            '적용',
          ),
        },
        h('p', null, '변경된 설정'),
      ),
    ),
  );
  const dialog = document.querySelector('dialog');
  assert.equal(
    document.getElementById(dialog.getAttribute('aria-labelledby')).textContent,
    '변경 확인',
  );
  assert.equal(
    document.getElementById(dialog.getAttribute('aria-describedby'))
      .textContent,
    '설정 변경 내용을 확인해 주세요.',
  );
  await act(async () => document.querySelector('footer button').click());
  assert.equal(applied, 1);
  await act(async () =>
    document.querySelector('button[aria-label="닫기"]').click(),
  );
  assert.equal(closed, 1);
});

test('blocking shared dialog exposes only explicit actions and still prevents Escape dismissal', async () => {
  let completed = 0;
  await act(async () =>
    root.render(
      h(
        ModalDialog,
        {
          title: '연결이 종료되었습니다',
          footer: h(
            ModalButton,
            { onClick: () => completed++ },
            '메인으로 돌아가기',
          ),
        },
        '다시 로그인해 주세요.',
      ),
    ),
  );
  assert.equal(document.querySelector('button[aria-label="닫기"]'), null);
  const cancel = new dom.window.Event('cancel', { cancelable: true });
  await act(async () => document.querySelector('dialog').dispatchEvent(cancel));
  assert.equal(cancel.defaultPrevented, true);
  assert.equal(completed, 0);
  await act(async () => document.querySelector('footer button').click());
  assert.equal(completed, 1);
});
