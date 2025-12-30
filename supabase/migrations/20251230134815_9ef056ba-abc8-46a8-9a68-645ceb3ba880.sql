-- ============================================
-- SECURITY FIX: Lock down user creation and RLS
-- ============================================

-- 1. DROP overly permissive policies on users table
DROP POLICY IF EXISTS "Allow insert during registration" ON public.users;

-- 2. Create secure INSERT policy for users - only allow via auth trigger
-- Users can only insert their own profile when authenticated
CREATE POLICY "Authenticated users can insert own profile only"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- 3. DROP and recreate policies on rpc_purchases to be more restrictive
DROP POLICY IF EXISTS "Users can insert their own RPC purchases" ON public.rpc_purchases;
DROP POLICY IF EXISTS "Users can view their own RPC purchases" ON public.rpc_purchases;
DROP POLICY IF EXISTS "Admins can view all RPC purchases" ON public.rpc_purchases;
DROP POLICY IF EXISTS "Admins can update RPC purchases" ON public.rpc_purchases;

-- Recreate with explicit authenticated role
CREATE POLICY "Authenticated users can insert own purchases"
  ON public.rpc_purchases FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can view own purchases"
  ON public.rpc_purchases FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Admin users can view all purchases"
  ON public.rpc_purchases FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin users can update all purchases"
  ON public.rpc_purchases FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. DROP and recreate policies on referrals to be more restrictive
DROP POLICY IF EXISTS "Service role manages referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referral record during signup" ON public.referrals;
DROP POLICY IF EXISTS "Users can view referrals they made" ON public.referrals;
DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins can update referrals" ON public.referrals;

-- Only authenticated users can view their own referrals
CREATE POLICY "Authenticated users can view own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (referrer_id IN (
    SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
  ));

-- Admins can view all referrals
CREATE POLICY "Admin users can view all referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update referrals
CREATE POLICY "Admin users can update referrals"
  ON public.referrals FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- NO INSERT policy for regular users - referrals created only via edge function with service role

-- 5. DROP and recreate policies on transactions
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;

-- Users can only view their own transactions (NO INSERT - only via edge functions)
CREATE POLICY "Authenticated users can view own transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
  ));

-- Admins can view all transactions
CREATE POLICY "Admin users can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 6. Ensure settings table has proper restrictions
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;

-- Only authenticated users can view public settings (payment info, video links)
CREATE POLICY "Authenticated users can view public settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

-- 7. Fix push_subscriptions - users should be able to upsert their own
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Admins can view all push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Authenticated users can insert own subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can update own subscriptions"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can view own subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id IN (
    SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Admin users can view all subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));