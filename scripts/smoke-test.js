const { spawn } = require('child_process');
const path = require('path');

require('dotenv').config();

const TEST_PORT = Number(process.env.SMOKE_TEST_PORT || 3100);
const BASE_URL = process.env.SMOKE_BASE_URL || `http://localhost:${TEST_PORT}`;
const START_SERVER = process.env.SMOKE_START_SERVER !== 'false';
const JWT_SECRET = process.env.JWT_SECRET || 'local-smoke-test-secret';

const accounts = {
  citizen: { national_id: '123456789', password: 'password123' },
  staff: { national_id: '987654321', password: 'staff123' },
  admin: { national_id: '111222333', password: 'admin123' }
};

const results = [];
let serverProcess = null;
let serverExited = false;
let serverExitCode = null;
let serverOutput = '';

function addResult(name, passed, detail = '') {
  results.push({ name, passed, detail });
}

function assert(name, condition, detail = '') {
  addResult(name, Boolean(condition), detail);
}

function assertStatus(name, response, expectedStatus) {
  assert(
    name,
    response.status === expectedStatus,
    `expected ${expectedStatus}, got ${response.status}`
  );
}

function hasPasswordHash(value) {
  return JSON.stringify(value).includes('password_hash');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(method, route, { token, body, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  const options = { method, headers: requestHeaders };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${route}`, options);
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  let data = text;

  if (contentType.includes('application/json') && text) {
    data = JSON.parse(text);
  }

  return {
    status: response.status,
    data,
    text,
    headers: response.headers
  };
}

async function multipart(route, files, token) {
  const form = new FormData();

  for (const file of files) {
    const blob = new Blob([file.content], { type: file.mimeType });
    form.append(file.field, blob, file.name);
  }

  const response = await fetch(`${BASE_URL}${route}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: form
  });

  const text = await response.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    data = text;
  }

  return {
    status: response.status,
    data,
    text,
    headers: response.headers
  };
}

async function waitForServer() {
  const deadline = Date.now() + 15000;
  let lastError;
  let lastResponse;

  while (Date.now() < deadline) {
    if (serverExited) {
      throw new Error(
        `Test server exited before it became ready with code ${serverExitCode}.\n${serverOutput}`
      );
    }

    try {
      const response = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ national_id: 'invalid', password: 'invalid' })
      });
      const text = await response.text();
      lastResponse = `HTTP ${response.status}${text ? `: ${text}` : ''}`;

      if (response.status === 400 || response.status === 401) {
        return;
      }
    } catch (err) {
      lastError = err;
    }

    await sleep(300);
  }

  const details = [
    'Server did not become ready in time.',
    lastResponse ? `Last readiness response: ${lastResponse}` : null,
    lastError ? `Last readiness error: ${lastError.message}` : null,
    serverOutput ? `Server output:\n${serverOutput}` : null,
    'Check that MySQL is running and that DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, and JWT_SECRET are configured in .env or your shell.'
  ].filter(Boolean).join('\n');

  throw new Error(details);
}

function startServer() {
  if (!START_SERVER) return;

  const env = {
    ...process.env,
    PORT: String(TEST_PORT),
    JWT_SECRET
  };

  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', data => {
    serverOutput += data.toString();
    if (process.env.SMOKE_VERBOSE === 'true') {
      process.stdout.write(data);
    }
  });

  serverProcess.stderr.on('data', data => {
    serverOutput += data.toString();
    if (process.env.SMOKE_VERBOSE === 'true') {
      process.stderr.write(data);
    }
  });

  serverProcess.on('exit', code => {
    serverExited = true;
    serverExitCode = code;
  });
}

function stopServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
}

function makeTinyPng() {
  return Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
    137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 99, 0, 1, 0,
    0, 5, 0, 1, 13, 10, 42, 180, 0, 0, 0, 0, 73, 69, 78,
    68, 174, 66, 96, 130
  ]);
}

function makeLicenseRenewalFiles() {
  const content = makeTinyPng();
  return [
    'original_license',
    'personal_id_card',
    'personal_photo',
    'medical_check',
    'fines_clearance'
  ].map(field => ({
    field,
    name: `${field}.png`,
    mimeType: 'image/png',
    content
  }));
}

async function login(role) {
  const response = await request('POST', '/login', { body: accounts[role] });
  assertStatus(`${role} login`, response, 200);
  assert(`${role} login returns token`, Boolean(response.data.token));
  assert(`${role} login omits password_hash`, !hasPasswordHash(response.data));
  return response.data.token;
}

async function run() {
  startServer();
  await waitForServer();

  const citizenToken = await login('citizen');
  const staffToken = await login('staff');
  const adminToken = await login('admin');

  const citizenNoToken = await request('GET', '/api/citizen/me');
  assertStatus('protected citizen route returns 401 without token', citizenNoToken, 401);

  const citizenMe = await request('GET', '/api/citizen/me', { token: citizenToken });
  assertStatus('citizen /api/citizen/me', citizenMe, 200);
  assert('citizen /api/citizen/me returns citizen role', citizenMe.data.role === 'citizen');
  assert('citizen /api/citizen/me omits password_hash', !hasPasswordHash(citizenMe.data));

  const citizenTransactions = await request('GET', '/api/citizen/my-transactions', {
    token: citizenToken
  });
  assertStatus('citizen my-transactions', citizenTransactions, 200);
  assert('citizen my-transactions returns an array', Array.isArray(citizenTransactions.data));

  const adminWithStaff = await request('GET', '/api/admin/dashboard/summary', {
    token: staffToken
  });
  assertStatus('admin route returns 403 for staff token', adminWithStaff, 403);

  const uploadResponse = await multipart(
    '/license/upload-license-renewal',
    makeLicenseRenewalFiles(),
    citizenToken
  );
  assertStatus('license renewal upload creates transaction', uploadResponse, 200);
  assert(
    'upload response includes central transaction',
    Boolean(uploadResponse.data.transaction?.id)
  );
  assert(
    'upload response includes transaction documents',
    Array.isArray(uploadResponse.data.documents) && uploadResponse.data.documents.length >= 5
  );

  const transactionId = uploadResponse.data.transaction.id;
  const firstDocument = uploadResponse.data.documents[0];

  const staffDetailNoToken = await request('GET', `/api/staff/transactions/${transactionId}`);
  assertStatus('staff transaction detail returns 401 without token', staffDetailNoToken, 401);

  const staffDetailWithCitizen = await request('GET', `/api/staff/transactions/${transactionId}`, {
    token: citizenToken
  });
  assertStatus('staff transaction detail returns 403 with citizen token', staffDetailWithCitizen, 403);

  const staffDetail = await request('GET', `/api/staff/transactions/${transactionId}`, {
    token: staffToken
  });
  assertStatus('staff transaction detail with staff token', staffDetail, 200);
  assert('staff transaction detail omits password_hash', !hasPasswordHash(staffDetail.data));

  const adminSummary = await request('GET', '/api/admin/dashboard/summary', {
    token: adminToken
  });
  assertStatus('admin dashboard summary', adminSummary, 200);
  assert('admin dashboard summary includes totals', adminSummary.data.total_users !== undefined);
  assert('admin dashboard summary omits password_hash', !hasPasswordHash(adminSummary.data));

  const ownDocuments = await request('GET', `/api/documents/transactions/${transactionId}`, {
    token: citizenToken
  });
  assertStatus('citizen can list own transaction documents', ownDocuments, 200);
  assert('document list omits password_hash', !hasPasswordHash(ownDocuments.data));

  const ownDownload = await request('GET', `/api/documents/${firstDocument.id}/download`, {
    token: citizenToken
  });
  assertStatus('citizen can download own document', ownDownload, 200);

  const unique = Date.now();
  const otherNationalId = `89${unique}`;
  const otherRegister = await request('POST', '/register', {
    body: {
      full_name: `Smoke Other ${unique}`,
      national_id: otherNationalId,
      birth_date: '1995-01-01',
      email: `smoke.other.${unique}@example.com`,
      password: 'OtherPass123!'
    }
  });
  assertStatus('register second citizen for document permission test', otherRegister, 201);

  const otherLogin = await request('POST', '/login', {
    body: {
      national_id: otherNationalId,
      password: 'OtherPass123!'
    }
  });
  assertStatus('second citizen login', otherLogin, 200);

  const otherDownload = await request('GET', `/api/documents/${firstDocument.id}/download`, {
    token: otherLogin.data.token
  });
  assertStatus('citizen cannot download another citizen document', otherDownload, 404);

  const staffDownload = await request('GET', `/api/documents/${firstDocument.id}/download`, {
    token: staffToken
  });
  assertStatus('staff can download transaction document', staffDownload, 200);

  const failed = results.filter(result => !result.passed);
  for (const result of results) {
    const marker = result.passed ? 'PASS' : 'FAIL';
    console.log(`${marker} ${result.name}${result.detail ? ` (${result.detail})` : ''}`);
  }

  console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run()
  .catch(err => {
    console.error('Smoke test runner failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    stopServer();
  });
