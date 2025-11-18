-- Ensure the trigger exists on referrals table
DROP TRIGGER IF EXISTS on_new_referral ON public.referrals;
CREATE TRIGGER on_new_referral
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_referral();

-- Add index on referral_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);