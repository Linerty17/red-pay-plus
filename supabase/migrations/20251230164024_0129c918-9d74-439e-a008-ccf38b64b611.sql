-- Drop the duplicate/conflicting INSERT policies on users table
DROP POLICY IF EXISTS "Authenticated users can insert own profile only" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create a single permissive INSERT policy that allows users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);