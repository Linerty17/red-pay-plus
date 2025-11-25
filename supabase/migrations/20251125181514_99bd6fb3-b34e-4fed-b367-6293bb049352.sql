-- Backfill all missed referrals
DO $$
DECLARE
  ref_record RECORD;
  referrer_record RECORD;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_transaction_id TEXT;
BEGIN
  -- Loop through all users who have a referred_by value
  FOR ref_record IN 
    SELECT u.user_id, u.email, u.referred_by, u.created_at
    FROM users u
    WHERE u.referred_by IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM referrals r WHERE r.new_user_id = u.user_id
      )
  LOOP
    RAISE NOTICE 'Processing referral for user: % (referred by: %)', ref_record.user_id, ref_record.referred_by;
    
    -- Find the referrer by referral code
    SELECT user_id, balance INTO referrer_record
    FROM users
    WHERE referral_code = ref_record.referred_by;
    
    IF referrer_record.user_id IS NOT NULL THEN
      -- Get current balance
      v_balance_before := COALESCE(referrer_record.balance, 0);
      v_balance_after := v_balance_before + 5000;
      v_transaction_id := 'REF-BACKFILL-' || EXTRACT(epoch FROM NOW())::bigint || '-' || ref_record.user_id;
      
      RAISE NOTICE 'Crediting referrer % (balance: % -> %)', referrer_record.user_id, v_balance_before, v_balance_after;
      
      -- Update referrer's balance and count
      UPDATE users
      SET balance = v_balance_after,
          referral_count = COALESCE(referral_count, 0) + 1
      WHERE user_id = referrer_record.user_id;
      
      -- Create transaction record
      INSERT INTO transactions (
        user_id, title, amount, type, transaction_id, balance_before, balance_after, meta
      ) VALUES (
        referrer_record.user_id,
        'Referral Bonus (Backfill)',
        5000,
        'credit',
        v_transaction_id,
        v_balance_before,
        v_balance_after,
        jsonb_build_object(
          'referral_new_user_id', ref_record.user_id,
          'referral_new_user_email', ref_record.email,
          'date', ref_record.created_at,
          'backfill', true
        )
      );
      
      -- Create referral record
      INSERT INTO referrals (
        referrer_id,
        new_user_id,
        amount_given,
        status,
        confirmed_at
      ) VALUES (
        referrer_record.user_id,
        ref_record.user_id,
        5000,
        'confirmed',
        ref_record.created_at
      );
      
      RAISE NOTICE '✅ Successfully credited referrer %', referrer_record.user_id;
    ELSE
      RAISE NOTICE '⚠️ Referrer not found for code: %', ref_record.referred_by;
    END IF;
  END LOOP;
END $$;
