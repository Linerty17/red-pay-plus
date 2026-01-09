-- Block anonymous access to all sensitive tables
-- This prevents unauthenticated users from accessing any data

-- Block anonymous access to users table
CREATE POLICY "Block anonymous access on users"
ON public.users
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to transactions table  
CREATE POLICY "Block anonymous access on transactions"
ON public.transactions
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to rpc_purchases table
CREATE POLICY "Block anonymous access on rpc_purchases"
ON public.rpc_purchases
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to support_requests table
CREATE POLICY "Block anonymous access on support_requests"
ON public.support_requests
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to referrals table
CREATE POLICY "Block anonymous access on referrals"
ON public.referrals
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to push_subscriptions table
CREATE POLICY "Block anonymous access on push_subscriptions"
ON public.push_subscriptions
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to user_notification_preferences
CREATE POLICY "Block anonymous access on user_notification_preferences"
ON public.user_notification_preferences
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to in_app_notifications
CREATE POLICY "Block anonymous access on in_app_notifications"
ON public.in_app_notifications
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to settings
CREATE POLICY "Block anonymous access on settings"
ON public.settings
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to user_roles
CREATE POLICY "Block anonymous access on user_roles"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to audit_logs
CREATE POLICY "Block anonymous access on audit_logs"
ON public.audit_logs
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to private_settings
CREATE POLICY "Block anonymous access on private_settings"
ON public.private_settings
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to push_notifications
CREATE POLICY "Block anonymous access on push_notifications"
ON public.push_notifications
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to push_notification_logs
CREATE POLICY "Block anonymous access on push_notification_logs"
ON public.push_notification_logs
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to push_campaigns
CREATE POLICY "Block anonymous access on push_campaigns"
ON public.push_campaigns
FOR SELECT
TO anon
USING (false);

-- Block anonymous access to settings_audit
CREATE POLICY "Block anonymous access on settings_audit"
ON public.settings_audit
FOR SELECT
TO anon
USING (false);