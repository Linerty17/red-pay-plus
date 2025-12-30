-- Create a trigger function to handle new user profile creation
-- This runs with SECURITY DEFINER so it bypasses RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is called when a new auth user is created
  -- It will be used for future automatic profile creation
  -- For now, we just ensure the RLS policy allows the insert
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- The real fix: allow any authenticated user to insert a profile
-- but only for themselves (the auth_user_id must match their auth.uid())
-- Drop and recreate with proper permissions
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());