-- The authenticated Data API role must be able to evaluate auth.user_id().
-- No access to any auth table or administrative credential is granted.
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_id() TO authenticated;
