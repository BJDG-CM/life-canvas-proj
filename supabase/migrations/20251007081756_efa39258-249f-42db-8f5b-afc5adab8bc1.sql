-- Add INSERT policy to profiles table as defense-in-depth
-- Profiles are created automatically via trigger, but this policy allows
-- users to create their own profile if needed (e.g., if trigger fails)
-- while preventing them from creating profiles for other users

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);