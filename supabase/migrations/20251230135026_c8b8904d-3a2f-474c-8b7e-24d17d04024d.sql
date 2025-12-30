-- Fix: Restrict settings table to only allow reading specific public keys
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view public settings" ON public.settings;

-- Create a whitelist policy for public settings only
CREATE POLICY "Authenticated users can view whitelisted settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (key IN ('payment_amount', 'account_number', 'bank_name', 'account_name', 'video_link'));