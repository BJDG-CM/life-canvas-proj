-- Remove email column from profiles table to eliminate PII exposure risk
-- Email addresses are already available through Supabase Auth (user.email)
-- and don't need to be duplicated in the profiles table

-- First, update the handle_new_user function to not insert email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- Then drop the email column from profiles
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS email;