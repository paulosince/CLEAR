-- RLS compat: customer DB owner cannot grant USAGE on Neon cloud_admin-owned auth schema.
-- Owner-privilege view runs auth.user_id() without exposing credentials or auth tables.
-- The subject is derived from the JWT context verified by Neon Data API.
-- See https://github.com/neondatabase/pg_session_jwt/issues/51

CREATE VIEW public.clear_auth_subject AS SELECT auth.user_id() AS subject;

REVOKE ALL ON public.clear_auth_subject FROM PUBLIC, anonymous;

GRANT SELECT ON public.clear_auth_subject TO authenticated;

CREATE FUNCTION public.clear_current_subject() RETURNS text LANGUAGE sql STABLE AS $$ SELECT subject FROM public.clear_auth_subject $$;

REVOKE EXECUTE ON FUNCTION public.clear_current_subject() FROM PUBLIC, anonymous;

GRANT EXECUTE ON FUNCTION public.clear_current_subject() TO authenticated;

ALTER TABLE public.clear_runs ALTER COLUMN owner_id SET DEFAULT public.clear_current_subject();

DROP POLICY clear_runs_read ON public.clear_runs;

DROP POLICY clear_runs_insert ON public.clear_runs;

DROP POLICY clear_runs_update ON public.clear_runs;

DROP POLICY clear_chunks_read ON public.clear_chunks;

DROP POLICY clear_chunks_insert ON public.clear_chunks;

CREATE POLICY clear_runs_read ON public.clear_runs FOR SELECT TO authenticated USING (owner_id = (SELECT public.clear_current_subject()));

CREATE POLICY clear_runs_insert ON public.clear_runs FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT public.clear_current_subject()) AND status = 'open' AND closed_at IS NULL);

CREATE POLICY clear_runs_update ON public.clear_runs FOR UPDATE TO authenticated USING (owner_id = (SELECT public.clear_current_subject()) AND status = 'open') WITH CHECK (owner_id = (SELECT public.clear_current_subject()) AND status IN ('open','closed'));

CREATE POLICY clear_chunks_read ON public.clear_chunks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.clear_runs r WHERE r.id = run_id AND r.owner_id = (SELECT public.clear_current_subject())));

CREATE POLICY clear_chunks_insert ON public.clear_chunks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.clear_runs r WHERE r.id = run_id AND r.owner_id = (SELECT public.clear_current_subject()) AND r.status = 'open'));
