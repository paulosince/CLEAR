import { NEON } from './config.mjs';
import { createAuthGateway } from './auth.mjs';
import { createRemoteRepository } from './remote.mjs';
import { createLocalStore } from './local.mjs';
import { createSyncService } from './sync.mjs';

// The UI chooses callbackURL later. No DOM, experiment engine, or framework dependency.
// createClient is injected so the SDK can be pinned, replaced and tested independently.
export function createLabInfrastructure({ createClient, callbackURL, indexedDB }) {
  if (typeof createClient !== 'function') throw new TypeError('Neon createClient factory required');
  const client = createClient({ auth: { url: NEON.authUrl }, dataApi: { url: NEON.dataApiUrl } });
  const auth = createAuthGateway(client, { callbackURL });
  const remote = createRemoteRepository(client);
  const local = createLocalStore(indexedDB);
  const sync = createSyncService({ auth, local, remote });
  return Object.freeze({ auth, remote, local, sync, endpoints: NEON });
}

// No build step is required; browser SDK loads only when app initialization calls this.
// In the final PWA, vendor and precache this dependency before promising offline startup.
export async function createBrowserLabInfrastructure(options) {
  const sdk = await import('https://esm.sh/@neondatabase/neon-js@0.9.0-beta');
  return createLabInfrastructure({ ...options, createClient: sdk.createClient });
}
