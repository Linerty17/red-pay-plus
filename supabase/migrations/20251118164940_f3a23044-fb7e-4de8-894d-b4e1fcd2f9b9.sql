-- Fix Critical Security Issue: Referral fraud vulnerability
-- Drop the overly permissive policy that allows any user to insert referrals
DROP POLICY IF EXISTS "Allow insert for referrals" ON public.referrals;

-- Only allow service role to insert referrals (during signup flow)
CREATE POLICY "Service role manages referrals"
  ON public.referrals FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow authenticated users to insert referrals only for themselves (as new_user_id)
-- This ensures only the actual new user can trigger referral during their signup
CREATE POLICY "Users can create referral record during signup"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (
    new_user_id IN (
      SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );