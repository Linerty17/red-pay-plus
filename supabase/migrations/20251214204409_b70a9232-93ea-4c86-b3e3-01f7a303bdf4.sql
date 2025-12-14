-- Create in-app notifications table for real-time notifications
CREATE TABLE public.in_app_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,  -- NULL means broadcast to all users
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  cta_url TEXT,
  type TEXT DEFAULT 'info',  -- info, success, warning, error
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  push_notification_id UUID REFERENCES public.push_notifications(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications and broadcast notifications
CREATE POLICY "Users can view their own and broadcast notifications"
ON public.in_app_notifications
FOR SELECT
USING (
  user_id IS NULL OR 
  user_id IN (SELECT users.user_id FROM users WHERE users.auth_user_id = auth.uid())
);

-- Users can update their own notification read status
CREATE POLICY "Users can mark their notifications as read"
ON public.in_app_notifications
FOR UPDATE
USING (
  user_id IS NULL OR 
  user_id IN (SELECT users.user_id FROM users WHERE users.auth_user_id = auth.uid())
);

-- Admins can manage all in-app notifications
CREATE POLICY "Admins can insert in-app notifications"
ON public.in_app_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all in-app notifications"
ON public.in_app_notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete in-app notifications"
ON public.in_app_notifications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for in-app notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.in_app_notifications;