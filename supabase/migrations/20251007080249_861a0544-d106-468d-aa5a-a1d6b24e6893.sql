-- Phase 1: Recreate the decrypted view with security_invoker
DROP VIEW IF EXISTS public.service_integrations_decrypted;

CREATE VIEW public.service_integrations_decrypted
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  service_name,
  is_active,
  created_at,
  updated_at,
  CASE 
    WHEN access_token_encrypted IS NOT NULL THEN
      convert_from(
        pgsodium.crypto_aead_det_decrypt(
          access_token_encrypted,
          convert_to('service_integrations_secret', 'utf8'),
          user_id::text::bytea
        ),
        'utf8'
      )
    ELSE NULL
  END as access_token
FROM public.service_integrations;

-- Phase 2: Drop the old plaintext access_token column
ALTER TABLE public.service_integrations 
DROP COLUMN IF EXISTS access_token;

-- Phase 3: Restrict challenge_participants visibility to authenticated users
DROP POLICY IF EXISTS "Users can view challenge participants" ON public.challenge_participants;

CREATE POLICY "Authenticated users can view active challenge participants"
ON public.challenge_participants
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1
  FROM challenges
  WHERE challenges.id = challenge_participants.challenge_id
    AND challenges.is_active = true
));