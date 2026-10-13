const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'),
  path = require('node:path'),
  Module = require('node:module'),
  ts = require('typescript');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<body></body>');
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react'),
  { act } = React,
  { createRoot } = require('react-dom/client');
const {
  QueryClient,
  QueryClientProvider,
  useQuery,
} = require('@tanstack/react-query');
let server, requests, save;
const filename = path.resolve(
  __dirname,
  '../src/domains/auditMonitoring/components/JudgeNodeWorkloads.tsx',
);
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
const requireNative = loaded.require.bind(loaded);
loaded.require = (id) =>
  id.endsWith('/api')
    ? {
        updateAdminJudgeNodeWorkloads: async (nodeId, token, value) => {
          requests.push({ nodeId, token, value });
          if (save) return save(value);
          server = { ...server, ...value };
          return { judge_node_id: nodeId, ...value };
        },
      }
    : id.endsWith('/errors')
      ? { formatApiError: (error) => error.message }
      : requireNative(id);
loaded._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText,
  filename,
);
const Workloads = loaded.exports.default;
function Wrapper() {
  const { data } = useQuery({
    queryKey: ['admin', 'judge-dashboard', 'master'],
    initialData: { nodes: [server] },
    queryFn: async () => ({ nodes: [server] }),
  });
  return React.createElement(Workloads, {
    node: data.nodes[0],
    token: 'master-token',
  });
}
async function mount(flags) {
  requests = [];
  save = null;
  server = {
    judge_node_id: 'node-1',
    node_name: 'judge-1',
    execution_capabilities: ['editor-execute-v1'],
    ...flags,
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host),
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  await act(async () =>
    root.render(
      React.createElement(
        QueryClientProvider,
        { client },
        React.createElement(Wrapper),
      ),
    ),
  );
  return {
    host,
    root,
    client,
    input: (kind) => host.querySelector(`input[aria-label="judge-1 ${kind}"]`),
    close: async () => {
      await act(async () => root.unmount());
      client.clear();
      host.remove();
    },
  };
}
async function click(el) {
  await act(async () => {
    el.click();
    await new Promise((r) => setTimeout(r, 15));
  });
}
test('Node controls persist ZOJ only, Editor only and both and prohibit neither', async () => {
  const view = await mount({ allow_zoj: true, allow_editor: true });
  await click(view.input('ZOJ 채점'));
  assert.equal(view.input('ZOJ 채점').checked, false);
  assert.equal(view.input('Editor 실행').disabled, true);
  assert.deepEqual(requests[0], {
    nodeId: 'node-1',
    token: 'master-token',
    value: { allow_zoj: false, allow_editor: true },
  });
  await click(view.input('ZOJ 채점'));
  await click(view.input('Editor 실행'));
  assert.equal(view.input('ZOJ 채점').disabled, true);
  assert.match(view.host.textContent, /ZOJ만 처리/);
  await click(view.input('Editor 실행'));
  assert.match(view.host.textContent, /ZOJ·Editor 모두 처리/);
  assert.equal(requests.length, 4);
  await view.close();
});
test('A rejected save keeps the original scope and shows the error', async () => {
  const view = await mount({ allow_zoj: true, allow_editor: true });
  save = async () => {
    throw new Error('저장 실패');
  };
  await click(view.input('Editor 실행'));
  assert.equal(view.input('Editor 실행').checked, true);
  assert.match(
    view.host.querySelector('[role="alert"]').textContent,
    /저장 실패/,
  );
  assert.equal(view.input('ZOJ 채점').disabled, false);
  await view.close();
});
test('A pending save cannot send overlapping updates', async () => {
  const view = await mount({ allow_zoj: true, allow_editor: true });
  let resolve;
  save = () => new Promise((r) => (resolve = r));
  await click(view.input('Editor 실행'));
  assert.equal(view.input('ZOJ 채점').disabled, true);
  await click(view.input('ZOJ 채점'));
  assert.equal(requests.length, 1);
  await act(async () => {
    server = { ...server, allow_editor: false };
    resolve({ judge_node_id: 'node-1', allow_zoj: true, allow_editor: false });
    await new Promise((r) => setTimeout(r, 15));
  });
  assert.equal(view.input('Editor 실행').checked, false);
  await view.close();
});
after(() => dom.window.close());
