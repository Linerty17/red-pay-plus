-- Drop all duplicate triggers on referrals table
DROP TRIGGER IF EXISTS on_referral_created ON public.referrals;
DROP TRIGGER IF EXISTS on_referral_inserted ON public.referrals;
DROP TRIGGER IF EXISTS on_referrals_after_insert ON public.referrals;

-- Keep only the correct trigger: on_new_referral
-- (already exists from previous migration, just ensuring it's the only one)

-- Verify the handle_new_referral function has correct balance_before calculation
CREATE OR REPLACE FUNCTION public.handle_new_referral()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_before integer;
  v_after integer;
BEGIN
  -- Lock row to avoid race conditions and read current balance
  SELECT COALESCE(balance, 0) INTO v_before
  FROM public.users
  WHERE user_id = NEW.referrer_id
  FOR UPDATE;

  v_after := v_before + 5000;

  -- Update referrer's balance and count
  UPDATE public.users
  SET balance = v_after,
      referral_count = COALESCE(referral_count, 0) + 1
  WHERE user_id = NEW.referrer_id;

  -- Insert transaction record
  INSERT INTO public.transactions (
    user_id, title, amount, type, transaction_id, balance_before, balance_after, meta
  ) VALUES (
    NEW.referrer_id,
    'Referral Bonus',
    5000,
    'credit',
    'REF-' || EXTRACT(epoch FROM NOW())::bigint,
    v_before,
    v_after,
    jsonb_build_object('referral_new_user_id', NEW.new_user_id, 'date', NOW())
  );

  RETURN NEW;
END;
$$;