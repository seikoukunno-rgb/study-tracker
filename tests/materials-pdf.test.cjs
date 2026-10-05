/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, extra = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, AbortController, Date, Error, Map, URL, ...extra }, { filename: path });
  return exports;
}
function loaderSetup() {
  const changes = [], released = [];
  const { createPdfDocumentLoader } = load('lib/pdf-document-loader.ts', { URL: { revokeObjectURL: url => released.push(url) } });
  return { loader: createPdfDocumentLoader(state => changes.push(state)), changes, released };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test('selection clears the old PDF and reports loading immediately', async () => {
  const { loader, changes } = loaderSetup();
  await loader.load('a', async () => ({ url: 'blob:a' }));
  const request = deferred();
  const pending = loader.load('b', () => request.promise);
  assert.equal(changes.at(-1).key, 'b');
  assert.equal(changes.at(-1).url, null);
  assert.equal(changes.at(-1).loading, true);
  request.resolve({ url: 'blob:b' });
  await pending;
  assert.equal(changes.at(-1).url, 'blob:b');
});

test('a slow previous selection cannot overwrite a newer PDF', async () => {
  const { loader, changes, released } = loaderSetup();
  const slow = deferred();
  let oldSignal;
  const first = loader.load('a', signal => { oldSignal = signal; return slow.promise; });
  await loader.load('b', async () => ({ url: 'blob:b' }));
  assert.equal(oldSignal.aborted, true);
  slow.resolve({ url: 'blob:a' });
  await first;
  assert.equal(changes.at(-1).key, 'b');
  assert.equal(changes.at(-1).url, 'blob:b');
  assert.deepEqual(released, ['blob:a']);
});

test('returning to a loaded PDF uses the cache without another fetch', async () => {
  const { loader, changes } = loaderSetup();
  await loader.load('a', async () => ({ url: 'blob:a' }));
  await loader.load('b', async () => ({ url: 'blob:b' }));
  await loader.load('a', () => assert.fail('cached PDF should not be fetched again'));
  assert.equal(changes.at(-1).url, 'blob:a');
  assert.equal(changes.at(-1).loading, false);
});

test('expired signed URLs are refreshed', async () => {
  const { loader, changes } = loaderSetup();
  await loader.load('a', async () => ({ url: 'https://example.test/expired', expiresAt: Date.now() - 1 }));
  await loader.load('a', async () => ({ url: 'https://example.test/fresh' }));
  assert.equal(changes.at(-1).url, 'https://example.test/fresh');
});

test('failures are shown for the selected PDF and allow retry', async () => {
  const { loader, changes } = loaderSetup();
  await loader.load('a', async () => { throw new Error('network failure'); });
  assert.equal(changes.at(-1).error, 'network failure');
  assert.equal(changes.at(-1).loading, false);
  await loader.load('a', async () => ({ url: 'blob:retry' }));
  assert.equal(changes.at(-1).error, null);
  assert.equal(changes.at(-1).url, 'blob:retry');
});

test('cancelled errors do not replace the current selection', async () => {
  const { loader, changes } = loaderSetup();
  const slow = deferred();
  const first = loader.load('a', () => slow.promise);
  await loader.load('b', async () => ({ url: 'blob:b' }));
  slow.reject(new Error('cancelled old request'));
  await first;
  assert.equal(changes.at(-1).key, 'b');
  assert.equal(changes.at(-1).error, null);
});

test('disposing releases all cached blobs and any late response', async () => {
  const { loader, changes, released } = loaderSetup();
  await loader.load('a', async () => ({ url: 'blob:a' }));
  const slow = deferred();
  const pending = loader.load('b', () => slow.promise);
  loader.dispose();
  const count = changes.length;
  slow.resolve({ url: 'blob:b' });
  await pending;
  assert.equal(changes.length, count);
  assert.deepEqual(released, ['blob:a', 'blob:b']);
});

function renameSetup({ user = { id: 'owner' }, failure = false } = {}) {
  const filters = [];
  let update;
  const query = { update(value) { update = value; return this; }, eq(k, v) { filters.push([k, v]); return this; },
    select() { return this; }, async single() { return failure ? { data: null, error: {} } : { data: { id: 'material', title: update.title }, error: null }; } };
  const supabase = { auth: { async getUser() { return { data: { user }, error: null }; } }, from() { return query; } };
  const { renameMaterial } = load('lib/materials/rename.ts', { require: () => ({ supabase }) });
  return { renameMaterial, filters };
}

test('rename trims the title and limits updates to the authenticated owner', async () => {
  const { renameMaterial, filters } = renameSetup();
  assert.equal(await renameMaterial('material', '  New title  '), 'New title');
  assert.deepEqual(filters, [['id', 'material'], ['student_id', 'owner']]);
});
test('empty names are rejected without updating a material', async () => {
  const { renameMaterial, filters } = renameSetup();
  await assert.rejects(renameMaterial('material', '   '));
  assert.deepEqual(filters, []);
});
test('unauthenticated renaming is rejected', async () => {
  const { renameMaterial, filters } = renameSetup({ user: null });
  await assert.rejects(renameMaterial('material', 'Title'));
  assert.deepEqual(filters, []);
});
test('failed updates do not report a successful rename', async () => {
  const { renameMaterial } = renameSetup({ failure: true });
  await assert.rejects(renameMaterial('material', 'Title'));
});
