-- Add missing columns and tables for referral system

-- Add push_subscriptions table for FCM tokens
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Add push_campaigns table
CREATE TABLE IF NOT EXISTS public.push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_criteria JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update referrals table to add status and confirmed_at
ALTER TABLE public.referrals 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Create unique index to prevent duplicate referrals for same new user
CREATE UNIQUE INDEX IF NOT EXISTS ux_referrals_new_user ON public.referrals(new_user_id);

-- Update referrals status based on existing data
UPDATE public.referrals 
SET status = CASE 
  WHEN manually_credited = true THEN 'manual'
  WHEN amount_given IS NOT NULL AND amount_given > 0 THEN 'confirmed'
  ELSE 'pending'
END
WHERE status IS NULL OR status = 'pending';

UPDATE public.referrals
SET confirmed_at = date
WHERE status = 'confirmed' AND confirmed_at IS NULL;

-- Enable RLS on new tables
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
CREATE POLICY "Users can insert their own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (
    user_id IN (SELECT user_id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (
    user_id IN (SELECT user_id FROM public.users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins can view all push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- RLS policies for push_campaigns
CREATE POLICY "Admins can manage push campaigns" ON public.push_campaigns
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Create server-side function to confirm referral atomically
CREATE OR REPLACE FUNCTION public.confirm_referral(
  _new_user_id TEXT,
  _amount INTEGER DEFAULT 5000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_id UUID;
  v_referrer_id TEXT;
  v_referrer_balance_before INTEGER;
  v_referrer_balance_after INTEGER;
  v_result JSONB;
BEGIN
  -- Lock and get pending referral
  SELECT id, referrer_id INTO v_referral_id, v_referrer_id
  FROM public.referrals
  WHERE new_user_id = _new_user_id 
    AND (status = 'pending' OR status IS NULL)
  FOR UPDATE;

  IF v_referral_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No pending referral found for user'
    );
  END IF;

  -- Get referrer's current balance
  SELECT COALESCE(balance, 0) INTO v_referrer_balance_before
  FROM public.users
  WHERE user_id = v_referrer_id
  FOR UPDATE;

  v_referrer_balance_after := v_referrer_balance_before + _amount;

  -- Update referral status
  UPDATE public.referrals
  SET status = 'confirmed',
      confirmed_at = NOW(),
      amount_given = _amount
  WHERE id = v_referral_id;

  -- Update referrer's balance and count
  UPDATE public.users
  SET balance = v_referrer_balance_after,
      referral_count = COALESCE(referral_count, 0) + 1
  WHERE user_id = v_referrer_id;

  -- Create transaction record
  INSERT INTO public.transactions (
    user_id,
    title,
    amount,
    type,
    transaction_id,
    balance_before,
    balance_after,
    meta
  ) VALUES (
    v_referrer_id,
    'Referral Bonus - Confirmed',
    _amount,
    'credit',
    'REF-CONFIRM-' || EXTRACT(epoch FROM NOW())::bigint,
    v_referrer_balance_before,
    v_referrer_balance_after,
    jsonb_build_object(
      'referral_id', v_referral_id,
      'new_user_id', _new_user_id,
      'confirmed_at', NOW()
    )
  );

  -- Create audit log
  INSERT INTO public.audit_logs (
    admin_user_id,
    action_type,
    details
  ) VALUES (
    NULL,
    'referral_confirmed',
    jsonb_build_object(
      'referral_id', v_referral_id,
      'new_user_id', _new_user_id,
      'referrer_id', v_referrer_id,
      'amount', _amount
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', v_referral_id,
    'referrer_id', v_referrer_id,
    'amount', _amount
  );
END;
$$;