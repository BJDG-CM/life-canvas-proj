-- Fix 1: challenge_participants infinite recursion
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view participants of challenges they joined" ON public.challenge_participants;

-- Create simpler policies: users can view all participants (since it's anonymous anyway)
-- or at least participants of challenges that exist and are active
CREATE POLICY "Users can view challenge participants"
ON public.challenge_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges
    WHERE challenges.id = challenge_participants.challenge_id
    AND challenges.is_active = true
  )
);

-- Fix 2: user_roles insertion issue
-- Drop existing insert policy
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

-- Create new policy: admins can insert any role, users can insert 'user' role for themselves
CREATE POLICY "Users can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  -- Either the user is an admin (can insert any role)
  public.has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Or the user is inserting 'user' role for themselves
  (auth.uid() = user_id AND role = 'user'::app_role)
);

-- Also add a trigger to automatically assign 'user' role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on auth.users (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();