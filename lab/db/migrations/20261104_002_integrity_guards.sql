-- The database verifies opaque payload digests and generates insertion timestamps.
-- It does not interpret the contents as representational properties.

CREATE FUNCTION public.clear_stamp_run_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.created_at := statement_timestamp();
  RETURN NEW;
END $$;

CREATE TRIGGER clear_runs_server_time BEFORE INSERT ON public.clear_runs FOR EACH ROW EXECUTE FUNCTION public.clear_stamp_run_insert();

CREATE FUNCTION public.clear_validate_chunk_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.created_at := statement_timestamp();
  IF encode(sha256(decode(NEW.payload_b64, 'base64')), 'hex') <> NEW.payload_sha256 THEN
    RAISE EXCEPTION 'Chunk SHA-256 does not match payload';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER clear_chunks_validate BEFORE INSERT ON public.clear_chunks FOR EACH ROW EXECUTE FUNCTION public.clear_validate_chunk_insert();
