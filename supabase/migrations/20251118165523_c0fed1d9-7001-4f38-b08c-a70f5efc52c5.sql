-- Create support_requests table for user support
CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  admin_notes text,
  resolved_at timestamp with time zone,
  CONSTRAINT fk_support_user FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- Enable RLS on support_requests
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own support requests
CREATE POLICY "Users can create their own support requests"
  ON public.support_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT user_id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Users can view their own support requests
CREATE POLICY "Users can view their own support requests"
  ON public.support_requests FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT user_id FROM public.users WHERE auth_user_id = auth.uid())
  );

-- Admins can view all support requests
CREATE POLICY "Admins can view all support requests"
  ON public.support_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update support requests
CREATE POLICY "Admins can update support requests"
  ON public.support_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for viewing all RPC purchases
CREATE POLICY "Admins can view all RPC purchases"
  ON public.rpc_purchases FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for updating RPC purchases (verification)
CREATE POLICY "Admins can update RPC purchases"
  ON public.rpc_purchases FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for viewing all transactions
CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies for viewing all users
CREATE POLICY "Admins can view all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for faster admin queries (skip already existing ones)
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_requests_user_id ON public.support_requests(user_id);

-- Add trigger to update support_requests updated_at
CREATE OR REPLACE FUNCTION public.update_support_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_support_request_updated_at
  BEFORE UPDATE ON public.support_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_request_updated_at();