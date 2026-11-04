# CLEAR Laboratory — identity and experiment ledger (infrastructure only)

This directory does not implement the organism, its creator process, its temporotopology or the UI. It does not modify the theory website or Viaggio.

## Deployment
- GitHub: isolated feature branch `feat/laboratorio-auth-neon-20261104`.
- Neon Free: separate project `clear-lab-experiments`, id `autumn-queen-35207135`, US East, with a 250 MB configured logical storage quota.
- Auth: Neon Managed Better Auth, Google OAuth with shared **development** credentials.
- Data: Neon Data API + PostgreSQL RLS. Only the `authenticated` role has permissions on `clear_runs` and `clear_chunks`.
- The Google auth trusted origin currently includes `https://paulosince.github.io`; no production custom OAuth credentials configured.
- A Neon-managed `auth` schema permissions issue was reproduced. Migration 003 attempted a grant that Neon silently ignored; migration 004 applied the working owner-view-based subject lookup. This is documented at https://github.com/neondatabase/pg_session_jwt/issues/51. Never treat migration 003 alone as a fix.

## Why this differs from Viaggio
The Viaggio prototype needed identity translation and even separate Neon projects per user. The CLEAR lab has no legacy identities or migration. It uses one database with RLS by researcher id. The useful pattern retained is **IndexedDB -> durable outbox -> authenticated Data API**.

## Entry point (no UI chosen yet)
```js
import { createBrowserLabInfrastructure } from './infra/index.mjs';

const infra = await createBrowserLabInfrastructure({
  callbackURL: 'https://paulosince.github.io/CLEAR/lab/'
});
await infra.auth.signInGoogle(); // redirects to Google/Neon
// After login: const user = await infra.auth.currentUser();
// await infra.local.saveRun(user.id, { id: crypto.randomUUID(), protocol_id: '...', protocol_version: '...', engine_revision: '...', seed: '...', initial_state_sha256: '<sha256>' });
// await infra.sync.flush(user.id);
```

No credentials belong in the client. Public Auth and Data API HTTPS endpoints are not secrets. No PostgreSQL connection string, private key, Neon Admin API key, or Google OAuth client secret may be committed.

## Scientific provenance
- Runs record protocol version, engine revision, PRNG seed, initial state hash and server timestamps.
- Event chunks are opaque byte streams encoded as base64 with a SHA-256 fingerprint. The schema **does not interpret them as represented concepts**.
- Each chunk has a per-run ordinal and immutable content. Closed runs are immutable.
- An acknowledged outbox entry is removed only after the remote API reports success. Repeated inserts compare the remote content to prevent silent collisions.
- A browser client is not tamper-resistant. The scientific integrity of experiments still depends on reproducible re-execution and independent review.
- Hashes are provided by the client at present, not independently verified by the database. Neither a client-provided hash nor an OAuth identity proves scientific authenticity.

## Limits and unimplemented items
- Google shared credentials are for development; peer-review release requires a dedicated Google OAuth app.
- Remote login has not been exercised with an actual Google identity. Per-user RLS needs a two-account acceptance test before publication.
- The browser import from esm.sh currently requires network; the future PWA must vendor/cache the pinned SDK to support offline cold starts.
- IndexedDB is not encrypted by this module. Data stored on a shared/unlocked device remains locally inspectable.
- No background execution, remote compute, reviewer sharing permissions, object storage or UI yet.
- The app must start a new run when deriving/continuing a closed run; it must not overwrite prior results.
- For large recordings, move immutable chunks to private object storage via a controlled signed-upload flow, after measuring quotas.
- Do not merge this branch into main until two-account RLS testing and browser login smoke tests pass.

## Database
All four migrations in `../db/migrations/` have been applied to the dedicated Neon database. Do not reapply them indiscriminately. Verified as the `authenticated` role without JWT: SELECT sees zero runs, INSERT is denied by RLS. Browser Google OAuth and positive two-researcher isolation tests remain pending. GitHub Actions infrastructure tests passed.
