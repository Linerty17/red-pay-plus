-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Create a new INSERT policy that allows service role and authenticated users
-- The key insight: after signUp, the user IS authenticated with their new user ID
-- But we need to ensure the auth_user_id they're inserting matches their auth.uid()
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- Also create a policy for anon role in case auto-confirm is disabled
-- This allows the insert right after signup before email confirmation
CREATE POLICY "Allow signup insert"
ON public.users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);