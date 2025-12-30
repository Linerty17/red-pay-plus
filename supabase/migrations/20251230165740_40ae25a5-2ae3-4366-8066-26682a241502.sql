-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow signup insert" ON public.users;

-- Keep the authenticated policy for normal operations
-- The issue is that after supabase.auth.signUp(), the user IS authenticated
-- with their new auth.uid(), so the policy (auth.uid() = auth_user_id) should work

-- Let's verify by checking if there are any duplicate or conflicting policies
-- and ensure only one proper INSERT policy exists