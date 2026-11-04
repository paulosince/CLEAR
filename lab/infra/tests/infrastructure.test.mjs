import test from 'node:test';
import assert from 'node:assert/strict';
import { createSyncService } from '../sync.mjs';
import { createAuthGateway } from '../auth.mjs';

function rig({ owner = 'researcher-a', remoteFails = null } = {}) {
  const entries = [
    { id: 1, owner, action: 'create_run', data: { id: 'run-1' } },
    { id: 2, owner, action: 'create_chunk', data: { run_id: 'run-1', ordinal: 0 } },
    { id: 3, owner, action: 'close_run', data: { id: 'run-1' } }
  ];
  const calls = [];
  const local = {
    pending: async id => entries.filter(x => x.owner === id),
    acknowledge: async id => { const i = entries.findIndex(x => x.id === id); entries.splice(i, 1); }
  };
  const auth = { currentUser: async () => ({ id: owner }) };
  const remote = Object.fromEntries(['createRun','createChunk','closeRun'].map(method => [method, async arg => {
    calls.push(method);
    if (remoteFails === method) throw new Error('network offline');
  }]));
  return { service: createSyncService({auth,local,remote}), entries,calls,auth };
}
test('strict researcher isolation prevents other session from draining local queue', async () => {
  const r = rig();
  await assert.rejects(() => r.service.flush('researcher-b'), /does not match/);
  assert.equal(r.entries.length, 3);
  assert.equal(r.calls.length, 0);
});
test('outbox is delivered sequentially and acknowledged after success', async () => {
  const r = rig();
  const result = await r.service.flush('researcher-a');
  assert.deepEqual(r.calls, ['createRun','createChunk','closeRun']);
  assert.deepEqual(result, { acknowledged: 3, remaining: 0 });
  assert.equal(r.entries.length, 0);
});
test('remote failure retains failed entry and all later entries', async () => {
  const r = rig({ remoteFails: 'createChunk' });
  await assert.rejects(() => r.service.flush('researcher-a'), /network offline/);
  assert.deepEqual(r.entries.map(x => x.id), [2,3]);
  assert.deepEqual(r.calls, ['createRun','createChunk']);
});
test('account switch during synchronization stops delivery before the next entry', async () => {
  const r = rig();
  let count = 0;
  r.auth.currentUser = async () => ({ id: ++count === 3 ? 'researcher-b' : 'researcher-a' });
  await assert.rejects(() => r.service.flush('researcher-a'), /session changed/);
  assert.deepEqual(r.calls, ['createRun']);
  assert.deepEqual(r.entries.map(x => x.id), [2,3]);
});
test('Google provider is passed to Neon Auth without storing credentials', async () => {
  const calls = [];
  const client = { auth: {
    getSession: async () => ({ data: { user: { id: 'a', email: 'researcher@example.org' } } }),
    signIn: { social: async options => { calls.push(options); return { data: { url: 'test' } }; } },
    signOut: async () => ({})
  }};
  const auth = createAuthGateway(client, { callbackURL: 'https://paulosince.github.io/CLEAR/lab/' });
  assert.equal((await auth.currentUser()).id, 'a');
  await auth.signInGoogle();
  assert.equal(calls[0].provider, 'google');
  assert.equal(calls[0].callbackURL, 'https://paulosince.github.io/CLEAR/lab/');
});
