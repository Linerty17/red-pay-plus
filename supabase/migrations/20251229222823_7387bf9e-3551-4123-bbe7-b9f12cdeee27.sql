-- SECURITY FIX: Restrict settings table access to authenticated users only
-- This prevents exposure of payment account numbers and business configuration

-- Drop the overly permissive policy that allows anyone to view settings
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;

-- Create a policy that only allows authenticated users to view settings
CREATE POLICY "Authenticated users can view settings"
ON public.settings
FOR SELECT
USING (auth.uid() IS NOT NULL);