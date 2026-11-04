// Data API adapter. Never trust client-side filtering: PostgreSQL RLS owns authorization.
const fail = ({ error, data }) => { if (error) throw error; return data; };
const duplicate = error => error?.code === '23505' || error?.code === '409';

export function createRemoteRepository(client) {
  if (typeof client?.from !== 'function') throw new TypeError('Neon Data API client required');

  async function getRun(id) {
    const rows = fail(await client.from('clear_runs').select('*').eq('id', id).limit(1));
    return rows?.[0] || null;
  }
  async function createRun(run) {
    const fields = ['id', 'protocol_id', 'protocol_version', 'engine_revision', 'seed', 'initial_state_sha256'];
    const payload = Object.fromEntries(fields.map(key => [key, run[key]]));
    const result = await client.from('clear_runs').insert(payload);
    if (!result.error) return;
    if (!duplicate(result.error)) throw result.error;
    const existing = await getRun(run.id);
    if (!existing || fields.some(key => String(existing[key]) !== String(payload[key]))) {
      throw new Error('Run ID collision: server record differs from local run');
    }
  }
  async function createChunk(chunk) {
    const fields = ['run_id', 'ordinal', 'encoding', 'payload_b64', 'payload_sha256'];
    const payload = Object.fromEntries(fields.map(key => [key, chunk[key]]));
    const result = await client.from('clear_chunks').insert(payload);
    if (!result.error) return;
    if (!duplicate(result.error)) throw result.error;
    const rows = fail(await client.from('clear_chunks')
      .select('run_id,ordinal,encoding,payload_sha256,payload_b64')
      .eq('run_id', chunk.run_id).eq('ordinal', chunk.ordinal).limit(1));
    const existing = rows?.[0];
    if (!existing || fields.some(key => String(existing[key]) !== String(payload[key]))) {
      throw new Error('Chunk collision: server payload differs from local payload');
    }
  }
  async function closeRun(id) {
    const updated = fail(await client.from('clear_runs')
      .update({ status: 'closed' }).eq('id', id).eq('status', 'open').select('id,status'));
    if (updated?.[0]?.status === 'closed') return;
    const existing = await getRun(id);
    if (existing?.status !== 'closed') throw new Error('Run not found or not closable');
  }
  async function listRuns() {
    return fail(await client.from('clear_runs')
      .select('id,protocol_id,protocol_version,engine_revision,seed,initial_state_sha256,status,created_at,closed_at')
      .order('created_at', { ascending: false }));
  }
  async function listChunkMetadata(runId) {
    return fail(await client.from('clear_chunks')
      .select('run_id,ordinal,encoding,payload_sha256,created_at')
      .eq('run_id', runId).order('ordinal', { ascending: true }));
  }
  return Object.freeze({ createRun, createChunk, closeRun, getRun, listRuns, listChunkMetadata });
}
