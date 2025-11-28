
-- Backfill uncredited referrals since Nov 25, 2025
DO $$
DECLARE
  rec RECORD;
  v_referrer_balance_before INTEGER;
  v_referrer_balance_after INTEGER;
  v_referrer_count INTEGER;
  v_credited_count INTEGER := 0;
BEGIN
  FOR rec IN 
    SELECT 
      u.user_id as new_user_id,
      u.referred_by as referral_code,
      r.user_id as referrer_id,
      r.balance as referrer_balance,
      r.referral_count as referrer_count
    FROM users u
    JOIN users r ON r.referral_code = u.referred_by
    WHERE u.referred_by IS NOT NULL 
      AND u.created_at > '2025-11-25'
      AND NOT EXISTS (
        SELECT 1 FROM referrals ref 
        WHERE ref.new_user_id = u.user_id
      )
  LOOP
    -- Get current referrer balance
    v_referrer_balance_before := COALESCE(rec.referrer_balance, 0);
    v_referrer_balance_after := v_referrer_balance_before + 5000;
    v_referrer_count := COALESCE(rec.referrer_count, 0) + 1;

    -- Create referral record
    INSERT INTO referrals (referrer_id, new_user_id, status, amount_given, confirmed_at)
    VALUES (rec.referrer_id, rec.new_user_id, 'confirmed', 5000, NOW())
    ON CONFLICT DO NOTHING;

    -- Create transaction record
    INSERT INTO transactions (
      user_id, title, amount, type, transaction_id, 
      balance_before, balance_after, meta
    ) VALUES (
      rec.referrer_id,
      'Referral Bonus - Backfill',
      5000,
      'credit',
      'REF-BF-' || EXTRACT(epoch FROM NOW())::bigint || '-' || rec.new_user_id,
      v_referrer_balance_before,
      v_referrer_balance_after,
      jsonb_build_object('referral_new_user_id', rec.new_user_id, 'backfill', true, 'date', NOW())
    );

    -- Update referrer balance and count
    UPDATE users 
    SET balance = balance + 5000,
        referral_count = referral_count + 1
    WHERE user_id = rec.referrer_id;

    v_credited_count := v_credited_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfilled % referrals', v_credited_count;
END $$;
