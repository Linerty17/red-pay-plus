-- Drop the existing status check constraint
ALTER TABLE public.rpc_purchases DROP CONSTRAINT IF EXISTS rpc_purchases_status_check;

-- Add new constraint that includes 'cancelled' as a valid status
ALTER TABLE public.rpc_purchases ADD CONSTRAINT rpc_purchases_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));