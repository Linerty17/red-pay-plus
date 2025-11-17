-- 1. Create the trigger to automatically apply referral credits when a referral record is inserted
DROP TRIGGER IF EXISTS on_referral_created ON public.referrals;
CREATE TRIGGER on_referral_created
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_referral();

-- 2. Enable realtime for users table so dashboard updates immediately when balance changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- 3. Add index on referral_code for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);