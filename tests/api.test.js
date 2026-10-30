import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, createTodoApi } from '../src/services/api.js';

function mockApi(responses) {
  const calls = [];
  const api = createTodoApi({ fetchImpl: async (url, options) => { calls.push({ url, ...options }); return responses.shift(); } });
  return { api, calls };
}

test('login and registration match the backend case-sensitive routes and body', async () => {
  const { api, calls } = mockApi([new Response(JSON.stringify({ token: 'test-token' })), new Response('Email is Successfully Registered', { status: 201 })]);
  assert.equal(await api.login(' test@example.com ', 'example-password'), 'test-token');
  assert.equal(calls[0].url, '/api/auth/Login');
  assert.deepEqual(JSON.parse(calls[0].body), { email: 'test@example.com', password: 'example-password' });
  assert.equal(calls[0].headers.Authorization, undefined);
  await api.register('test@example.com', 'example-password');
  assert.equal(calls[1].url, '/api/auth/Register');
  assert.equal(calls[1].method, 'POST');
});

test('create, update and delete use the saved TodoController contract', async () => {
  const task = { id: 12, title: ' Test task ', description: ' Note ', isCompleted: true };
  const { api, calls } = mockApi([new Response(JSON.stringify(task), { status: 201 }), new Response(JSON.stringify(task)), new Response(null, { status: 204 })]);
  await api.create(task, 'test-token');
  await api.update(task, 'test-token');
  await api.remove(12, 'test-token');
  assert.deepEqual(calls.map(({ url, method }) => [url, method]), [['/api/todo/create','POST'], ['/api/todo','PUT'], ['/api/todo/12','DELETE']]);
  assert.deepEqual(JSON.parse(calls[0].body), { title: 'Test task', description: 'Note', isCompleted: true });
  assert.deepEqual(JSON.parse(calls[1].body), { id: 12, title: 'Test task', description: 'Note', isCompleted: true });
  calls.forEach((call) => assert.equal(call.headers.Authorization, 'Bearer test-token'));
  assert.equal(calls[2].body, undefined);
});

test('list normalises nullable backend fields without treating false as completed', async () => {
  const { api } = mockApi([new Response(JSON.stringify([{ id: 1, title: 'Read', isCompleted: null, description: null }, { id: 2, title: 'Write', isCompleted: false }]))]);
  const result = await api.list('test-token');
  assert.equal(result[0].isCompleted, false);
  assert.equal(result[0].description, '');
  assert.equal(result[1].isCompleted, false);
});

test('authentication failures preserve the status so the UI can request sign-in', async () => {
  const { api } = mockApi([new Response('Invalid User', { status: 401 })]);
  await assert.rejects(api.login('test@example.com', 'incorrect'), (error) => error instanceof ApiError && error.status === 401 && error.message === 'Invalid User');
});

test('failed updates are errors, never a successful response', async () => {
  const { api } = mockApi([new Response(JSON.stringify({ message: 'Update rejected' }), { status: 500 })]);
  await assert.rejects(api.update({ id: 1, title: 'New', isCompleted: false }, 'test-token'), /Update rejected/);
});

test('an invalid list response is rejected instead of replacing tasks silently', async () => {
  const { api } = mockApi([new Response(JSON.stringify({ message: 'Unexpected response' }))]);
  await assert.rejects(api.list('test-token'), /Expected a task list/);
});

test('network errors give a readable connection message', async () => {
  const api = createTodoApi({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(api.list('test-token'), /Cannot reach the backend/);
});
