-- Create trigger to execute referral bonus function when a new referral is inserted
CREATE TRIGGER on_referral_inserted
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_referral();