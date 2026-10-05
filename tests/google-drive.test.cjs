/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextResponse } = require('next/server');

// Load the real TypeScript handlers with isolated fake credentials and HTTP/DB boundaries.
function setup({ account = { refresh_token: 'fake-refresh', google_email: 'a@example.test' }, user = { id: 'owner' }, fetch } = {}) {
  const filters = [];
  const upserts = [];
  const query = { select() { return this; }, eq(k, v) { filters.push([k, v]); return this; },
    async upsert(row, options) { upserts.push({ row, options }); return { error: null }; },
    async maybeSingle() { return { data: account }; } };
  const client = { auth: { async getUser() { return { data: { user } }; } }, from() { return query; } };
  const environment = { GOOGLE_CLIENT_ID: 'fake-client', GOOGLE_CLIENT_SECRET: 'fake-secret',
    GOOGLE_PICKER_API_KEY: 'fake-key', GOOGLE_CLOUD_PROJECT_NUMBER: '123', APP_URL: 'https://mercury-study47.com' };
  let helper;
  const load = path => {
    const exports = {};
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, { exports, URL, URLSearchParams, Response, process: { env: environment }, fetch,
      require(name) {
        if (name === 'server-only') return {};
        if (name === 'next/server') return { NextResponse };
        if (name === '@/app/utils/supabase/server') return { createClient: async () => client };
        if (name === '@/lib/google-drive/server') return helper;
        return require(name);
      } }, { filename: path });
    return exports;
  };
  helper = load('lib/google-drive/server.ts');
  return { helper, load, filters, environment, upserts };
}
const json = (value, status = 200) => Response.json(value, { status });
const request = (path, headers = {}) => ({ nextUrl: new URL(`https://mercury-study47.com${path}`), url: `https://mercury-study47.com${path}`, headers: new Headers(headers) });

test('account lookup binds the refresh token to the logged-in user', async () => {
  const context = setup({ fetch: async () => json({ access_token: 'fake-access', scope: 'https://www.googleapis.com/auth/drive.file', expires_in: 3600 }) });
  await context.helper.connectedAccountToken('account-a', true);
  assert.deepEqual(context.filters, [['id', 'account-a'], ['user_id', 'owner']]);
});

test('another user account cannot be refreshed', async () => {
  const context = setup({ account: null, fetch: () => assert.fail('must not contact Google') });
  await assert.rejects(context.helper.connectedAccountToken('other'), { code: 'account_not_found', status: 404 });
});

test('unauthenticated requests do not access tokens', async () => {
  const context = setup({ user: null, fetch: () => assert.fail('must not contact Google') });
  await assert.rejects(context.helper.connectedAccountToken('account-a'), { status: 401 });
});

test('revoked refresh tokens explicitly require reconnection', async () => {
  const context = setup({ fetch: async () => json({ error: 'invalid_grant' }, 400) });
  await assert.rejects(context.helper.refreshAccessToken('fake-refresh'), { code: 'reconnect_required' });
});

test('old readonly scope cannot be used for Picker or authorized PDF listing', async () => {
  const context = setup({ fetch: async () => json({ access_token: 'fake-access', scope: 'https://www.googleapis.com/auth/drive.readonly' }) });
  await assert.rejects(context.helper.connectedAccountToken('account-a', true), { code: 'scope_upgrade_required' });
});

test('PDF listing paginates, excludes trash and files authorized only by broad legacy scopes', async () => {
  const urls = [];
  const context = setup({ fetch: async (url) => {
    urls.push(url);
    if (url.includes('oauth2')) return json({ access_token: 'fake-access', scope: context.helper.DRIVE_FILE_SCOPE });
    const params = new URL(url).searchParams;
    assert.equal(params.get('q'), "mimeType='application/pdf' and trashed=false");
    if (!params.has('pageToken')) return json({ files: [{ id: 'picked', isAppAuthorized: true }, { id: 'unpicked', isAppAuthorized: false }], nextPageToken: 'second' });
    return json({ files: [{ id: 'picked2', isAppAuthorized: true }] });
  } });
  const response = await context.load('app/api/google-drive/list/route.ts').GET(request('/api/google-drive/list?accountId=a'));
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).files.map(f => f.id), ['picked', 'picked2']);
  assert.equal(urls.length, 3);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Drive permission failure is not reported as an empty file list', async () => {
  const context = setup({ fetch: async url => url.includes('oauth2') ? json({ access_token: 'fake-access', scope: context.helper.DRIVE_FILE_SCOPE }) : json({}, 403) });
  const response = await context.load('app/api/google-drive/list/route.ts').GET(request('/api/google-drive/list?accountId=a'));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'drive_forbidden');
});

test('Picker returns only a short-lived token for the chosen account', async () => {
  const context = setup({ fetch: async () => json({ access_token: 'fake-access', scope: context.helper.DRIVE_FILE_SCOPE }) });
  const req = request('/api/google-drive/picker', { origin: 'https://mercury-study47.com' });
  req.json = async () => ({ accountId: 'a' });
  const response = await context.load('app/api/google-drive/picker/route.ts').POST(req);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.accessToken, 'fake-access');
  assert.equal(body.refresh_token, undefined);
  assert.equal(body.clientSecret, undefined);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('Picker rejects cross-origin requests before accessing tokens', async () => {
  const context = setup({ fetch: () => assert.fail('must not contact Google') });
  const response = await context.load('app/api/google-drive/picker/route.ts').POST(request('/api/google-drive/picker', { origin: 'https://other.example' }));
  assert.equal(response.status, 403);
});

test('download uses each file account and preserves PDF bytes', async () => {
  const context = setup({ fetch: async url => url.includes('oauth2') ? json({ access_token: 'fake-access' }) : new Response('%PDF-1.7 test', { headers: { 'Content-Type': 'application/pdf' } }) });
  const response = await context.load('app/api/drive/route.ts').GET(request('/api/drive?fileId=pdf-a&accountId=a'));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '%PDF-1.7 test');
  assert.deepEqual(context.filters, [['id', 'a'], ['user_id', 'owner']]);
});

test('OAuth uses canonical production callback, drive.file, state and PKCE', async () => {
  const context = setup();
  const response = await context.load('app/api/auth/google-drive-link/route.ts').GET(request('/api/auth/google-drive-link'));
  const url = new URL(response.headers.get('location'));
  assert.equal(url.searchParams.get('redirect_uri'), 'https://mercury-study47.com/api/auth/google-drive-callback');
  assert.ok(url.searchParams.get('scope').includes(context.helper.DRIVE_FILE_SCOPE));
  assert.ok(!url.searchParams.get('scope').includes('drive.readonly'));
  assert.ok(url.searchParams.get('state'));
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(response.headers.get('set-cookie').includes('HttpOnly'));
});

test('OAuth callback rejects mismatched state without exchanging tokens', async () => {
  const context = setup({ fetch: () => assert.fail('must not contact Google') });
  const req = request('/api/auth/google-drive-callback?code=fake&state=bad');
  req.cookies = { get: () => ({ value: JSON.stringify({ state: 'good', origin: 'https://mercury-study47.com' }) }) };
  const response = await context.load('app/api/auth/google-drive-callback/route.ts').GET(req);
  assert.ok(response.headers.get('location').endsWith('error=invalid_state'));
});


test('reconnection upserts the same user/email without replacing account ID', async () => {
  const context = setup({ fetch: async url => url.includes('oauth2.googleapis.com/token')
    ? json({ access_token: 'fake-access', refresh_token: 'new-fake-refresh', scope: context.helper.DRIVE_FILE_SCOPE })
    : json({ email: 'a@example.test', verified_email: true }) });
  const req = request('/api/auth/google-drive-callback?code=fake&state=good');
  req.cookies = { get: () => ({ value: JSON.stringify({ state: 'good', verifier: 'fake-verifier', userId: 'owner', origin: 'https://mercury-study47.com' }) }) };
  const response = await context.load('app/api/auth/google-drive-callback/route.ts').GET(req);
  assert.ok(response.headers.get('location').endsWith('connected=true'));
  assert.equal(context.upserts[0].row.user_id, 'owner');
  assert.equal(context.upserts[0].row.google_email, 'a@example.test');
  assert.equal(context.upserts[0].row.id, undefined);
  assert.equal(context.upserts[0].options.onConflict, 'user_id,google_email');
});

test('non-PDF responses cannot be mislabeled as application/pdf', async () => {
  const context = setup({ fetch: async url => url.includes('oauth2') ? json({ access_token: 'fake-access' }) : new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } }) });
  const response = await context.load('app/api/drive/route.ts').GET(request('/api/drive?fileId=html&accountId=a'));
  assert.equal(response.status, 415);
  assert.equal((await response.json()).code, 'not_pdf');
});
