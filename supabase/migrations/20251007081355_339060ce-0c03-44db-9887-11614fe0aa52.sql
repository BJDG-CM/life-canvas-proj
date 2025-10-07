-- Drop the service_integrations_decrypted view to eliminate security risk
-- Views cannot have RLS policies in PostgreSQL, and this view is not used in the codebase
-- If decrypted tokens are needed in the future, they should be accessed through
-- a security definer function with explicit auth.uid() checks, not through a view

DROP VIEW IF EXISTS public.service_integrations_decrypted;