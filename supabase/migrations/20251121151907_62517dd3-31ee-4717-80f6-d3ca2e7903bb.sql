-- Disable the old trigger-based referral system since we now use server-side edge function
-- The edge function provides atomic, idempotent referral crediting with proper transaction isolation

-- Drop the trigger if it exists (it may have been created by previous migrations)
DROP TRIGGER IF EXISTS on_new_referral ON public.referrals;

-- Keep the trigger function for reference but document that it's no longer used
COMMENT ON FUNCTION public.handle_new_referral() IS 
'DEPRECATED: This trigger function is no longer used. Referral crediting is now handled by the credit-referral edge function for atomic, idempotent processing with proper service-role permissions.';

-- Add comment to referrals table explaining the new flow
COMMENT ON TABLE public.referrals IS 
'Referral tracking table. Referral bonuses are now processed server-side via the credit-referral edge function, which ensures atomic updates to users.balance, users.referral_count, and transactions table.';
