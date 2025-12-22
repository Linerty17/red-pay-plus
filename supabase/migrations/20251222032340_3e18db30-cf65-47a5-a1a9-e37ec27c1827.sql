-- Add column to track if user has acknowledged payment status
ALTER TABLE public.rpc_purchases ADD COLUMN IF NOT EXISTS status_acknowledged BOOLEAN DEFAULT false;

-- Enable realtime for rpc_purchases table
ALTER PUBLICATION supabase_realtime ADD TABLE public.rpc_purchases;