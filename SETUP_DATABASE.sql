-- ============================================
-- REDPAY DATABASE SETUP
-- Run this entire SQL script in your Supabase SQL Editor
-- ============================================

-- 1. CREATE USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  country TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  balance INTEGER DEFAULT 160000,
  last_claim_at TIMESTAMPTZ,
  rpc_purchased BOOLEAN DEFAULT false,
  rpc_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_user_id ON public.users(user_id);
CREATE INDEX idx_users_referral_code ON public.users(referral_code);
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = auth_user_id);

CREATE POLICY "Allow insert during registration" ON public.users
  FOR INSERT WITH CHECK (true);

-- 2. CREATE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  reference_id TEXT,
  balance_after INTEGER NOT NULL,
  proof_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date DESC);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT USING (
    user_id IN (
      SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- 3. CREATE REFERRALS TABLE
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  new_user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  amount_given INTEGER DEFAULT 5000,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_new_user_id ON public.referrals(new_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they made" ON public.referrals
  FOR SELECT USING (
    referrer_id IN (
      SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Allow insert for referrals" ON public.referrals
  FOR INSERT WITH CHECK (true);

-- 4. CREATE RPC PURCHASES TABLE
CREATE TABLE IF NOT EXISTS public.rpc_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  user_unique_id TEXT NOT NULL,
  proof_image TEXT,
  rpc_code_issued TEXT,
  verified BOOLEAN DEFAULT false,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rpc_purchases_user_id ON public.rpc_purchases(user_id);
CREATE INDEX idx_rpc_purchases_verified ON public.rpc_purchases(verified);

ALTER TABLE public.rpc_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own RPC purchases" ON public.rpc_purchases
  FOR SELECT USING (
    user_id IN (
      SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own RPC purchases" ON public.rpc_purchases
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT user_id FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

-- 5. CREATE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.settings (key, value) VALUES
  ('video_url', ''),
  ('telegram_url', ''),
  ('referral_bonus_amount', '5000'),
  ('rpc_price', '6700'),
  ('moniepoint_account_number', '5569742889'),
  ('moniepoint_account_name', 'Sunday Liberty'),
  ('bank_name', 'Moniepoint')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.settings
  FOR SELECT USING (true);

-- ============================================
-- SETUP COMPLETE!
-- Your database is now ready for RedPay
-- ============================================
