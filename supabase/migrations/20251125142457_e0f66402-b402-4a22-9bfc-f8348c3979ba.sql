-- Create admin user account
-- First, create the auth user (this will be done manually via Supabase Auth UI or signup)
-- We'll create the profile and role records that link to this auth user

-- Insert admin profile (using a placeholder auth_user_id that will be updated)
-- Note: The actual auth user must be created through Supabase Auth
-- Email: sundaychinemerem66@gmail.com
-- Password: Chinemerem18$ (to be set in Supabase Auth)

-- For now, we'll create a trigger that automatically assigns admin role
-- when a user with the admin email signs up

CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user email matches admin email
  IF NEW.email = 'sundaychinemerem66@gmail.com' THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();

-- Also create a function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
  );
$$;

-- Create audit_logs table for admin actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_user_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create push_notifications table
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  cta_url text,
  image_url text,
  data_payload jsonb DEFAULT '{}'::jsonb,
  target_type text NOT NULL DEFAULT 'all', -- 'all', 'country', 'referral_count', 'role', 'custom'
  target_criteria jsonb DEFAULT '{}'::jsonb,
  schedule_at timestamp with time zone,
  repeat_type text DEFAULT 'once', -- 'once', 'daily', 'weekly'
  status text DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone
);

-- Enable RLS on push_notifications
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can manage push notifications
CREATE POLICY "Admins can view push notifications"
  ON public.push_notifications
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert push notifications"
  ON public.push_notifications
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update push notifications"
  ON public.push_notifications
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete push notifications"
  ON public.push_notifications
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create push_notification_logs table
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.push_notifications(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  error_message text,
  sent_at timestamp with time zone,
  delivered_at timestamp with time zone,
  clicked_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on push_notification_logs
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view push notification logs
CREATE POLICY "Admins can view push notification logs"
  ON public.push_notification_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert push notification logs"
  ON public.push_notification_logs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  push_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own preferences
CREATE POLICY "Users can view their own notification preferences"
  ON public.user_notification_preferences
  FOR SELECT
  USING (user_id IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can update their own notification preferences"
  ON public.user_notification_preferences
  FOR UPDATE
  USING (user_id IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY "Users can insert their own notification preferences"
  ON public.user_notification_preferences
  FOR INSERT
  WITH CHECK (user_id IN (SELECT user_id FROM users WHERE auth_user_id = auth.uid()));

-- Admins can view all preferences
CREATE POLICY "Admins can view all notification preferences"
  ON public.user_notification_preferences
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));