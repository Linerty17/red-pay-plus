-- Drop the problematic policy that blocks everyone
DROP POLICY IF EXISTS "Block anonymous access on users" ON public.users;

-- Create a proper policy that only blocks truly anonymous users (not authenticated)
-- This is actually not needed since other policies already require auth.uid()
-- But if you want explicit blocking of anon:
CREATE POLICY "Block anonymous access on users" 
ON public.users 
FOR SELECT 
TO anon
USING (false);

-- Also drop and recreate the same for referrals table
DROP POLICY IF EXISTS "Block anonymous access on referrals" ON public.referrals;
CREATE POLICY "Block anonymous access on referrals" 
ON public.referrals 
FOR SELECT 
TO anon
USING (false);