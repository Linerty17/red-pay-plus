-- Add status column to rpc_purchases for tracking approved/rejected states
ALTER TABLE public.rpc_purchases 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing verified records to have 'approved' status
UPDATE public.rpc_purchases SET status = 'approved' WHERE verified = true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_rpc_purchases_status ON public.rpc_purchases(status);