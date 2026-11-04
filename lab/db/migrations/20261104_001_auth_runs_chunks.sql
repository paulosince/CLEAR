-- CLEAR Experimental Laboratory, isolated from the theory website.
-- Neon Data API role 'authenticated', Managed Better Auth, JWT subject via auth.user_id().
-- Science ledger storage; this does NOT define the organism's representation.
-- Do not apply this migration to Viaggio or any existing database.

-- 1
CREATE TABLE public.clear_runs (
 id uuid PRIMARY KEY,
 owner_id text NOT NULL DEFAULT auth.user_id(),
 protocol_id text NOT NULL CHECK (char_length(protocol_id) BETWEEN 1 AND 120),
 protocol_version text NOT NULL CHECK (char_length(protocol_version) BETWEEN 1 AND 80),
 engine_revision text NOT NULL CHECK (char_length(engine_revision) BETWEEN 1 AND 120),
 seed text NOT NULL CHECK (char_length(seed) BETWEEN 1 AND 160),
 initial_state_sha256 text NOT NULL CHECK (initial_state_sha256 ~ '^[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 closed_at timestamptz,
 CONSTRAINT clear_run_closed_consistency CHECK (
    (status = 'open' AND closed_at IS NULL) OR (status = 'closed' AND closed_at IS NOT NULL)
 )
);

-- 2
CREATE TABLE public.clear_chunks (
 run_id uuid NOT NULL REFERENCES public.clear_runs(id) ON DELETE RESTRICT,
 ordinal integer NOT NULL CHECK (ordinal >= 0),
 encoding text NOT NULL CHECK (char_length(encoding) BETWEEN 1 AND 80),
 payload_b64 text NOT NULL CHECK (char_length(payload_b64) BETWEEN 1 AND 700000),
 payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (run_id, ordinal)
);

-- 3
CREATE INDEX clear_runs_owner_created_idx ON public.clear_runs(owner_id, created_at DESC);

-- 4
ALTER TABLE public.clear_runs ENABLE ROW LEVEL SECURITY;

-- 5
ALTER TABLE public.clear_chunks ENABLE ROW LEVEL SECURITY;

-- 6
CREATE POLICY clear_runs_read ON public.clear_runs FOR SELECT TO authenticated USING (owner_id = (SELECT auth.user_id()));

-- 7
CREATE POLICY clear_runs_insert ON public.clear_runs FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.user_id()) AND status = 'open' AND closed_at IS NULL);

-- 8
CREATE POLICY clear_runs_update ON public.clear_runs FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.user_id()) AND status = 'open') WITH CHECK (owner_id = (SELECT auth.user_id()) AND status IN ('open','closed'));

-- 9
CREATE POLICY clear_chunks_read ON public.clear_chunks FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.clear_runs r WHERE r.id = run_id AND r.owner_id = (SELECT auth.user_id())));

-- 10
CREATE POLICY clear_chunks_insert ON public.clear_chunks FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.clear_runs r WHERE r.id = run_id AND r.owner_id = (SELECT auth.user_id()) AND r.status = 'open'));

-- 11
CREATE FUNCTION public.clear_guard_run_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status <> 'open' THEN RAISE EXCEPTION 'A closed run cannot be modified'; END IF;
 IF (to_jsonb(NEW) - 'status' - 'closed_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'closed_at') THEN
   RAISE EXCEPTION 'Run metadata is immutable';
 END IF;
 IF NEW.status = 'closed' THEN
   NEW.closed_at := now();
 ELSIF NEW.status = 'open' THEN
   NEW.closed_at := NULL;
 ELSE
   RAISE EXCEPTION 'Invalid status';
 END IF;
 RETURN NEW;
END $$;

-- 12
CREATE TRIGGER clear_runs_immutability BEFORE UPDATE ON public.clear_runs FOR EACH ROW EXECUTE FUNCTION public.clear_guard_run_update();

-- 13
REVOKE ALL ON public.clear_runs, public.clear_chunks FROM PUBLIC, anonymous;

-- 14
GRANT USAGE ON SCHEMA public TO authenticated;

-- 15
GRANT SELECT, INSERT, UPDATE ON public.clear_runs TO authenticated;

-- 16
GRANT SELECT, INSERT ON public.clear_chunks TO authenticated;
