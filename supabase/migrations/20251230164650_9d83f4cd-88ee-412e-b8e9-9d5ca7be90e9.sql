-- Add INSERT policy for transactions table to allow the system to create transaction records
-- This is needed for referral bonuses and other system-generated transactions
CREATE POLICY "Service role can insert transactions"
ON public.transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Also allow the confirm_referral function to insert transactions (it runs as security definer)
-- The function already has SECURITY DEFINER so it bypasses RLS, but we need a policy for edge functions
CREATE POLICY "Allow authenticated users to receive transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT users.user_id FROM users WHERE users.auth_user_id = auth.uid()
  )
);