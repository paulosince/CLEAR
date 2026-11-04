// Sync is pull-free by design in v1: an acknowledged outbox row is never retried.
// Failures preserve the remaining queue. Scientific simulation time does not advance here.
export function createSyncService({ auth, local, remote }) {
  if (!auth?.currentUser || !local?.pending || !remote?.createRun) {
    throw new TypeError('Auth, local and remote adapters required');
  }
  let inProgress = false;
  async function flush(ownerId) {
    if (inProgress) throw new Error('A synchronization is already running');
    inProgress = true;
    let acknowledged = 0;
    try {
      const principal = await auth.currentUser();
      if (!principal || principal.id !== ownerId) {
        throw new Error('Authenticated researcher does not match local journal owner');
      }
      for (const entry of await local.pending(ownerId)) {
        // Recheck on each step: a sign-out or account switch must stop the queue.
        const current = await auth.currentUser();
        if (!current || current.id !== ownerId) throw new Error('Researcher session changed');
        if (entry.action === 'create_run') await remote.createRun(entry.data);
        else if (entry.action === 'create_chunk') await remote.createChunk(entry.data);
        else if (entry.action === 'close_run') await remote.closeRun(entry.data.id);
        else throw new Error('Unknown outbox operation; journal kept intact');
        await local.acknowledge(entry.id);
        acknowledged += 1;
      }
      return { acknowledged, remaining: (await local.pending(ownerId)).length };
    } finally {
      inProgress = false;
    }
  }
  return Object.freeze({ flush });
}
