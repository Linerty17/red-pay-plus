import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

// Domain restriction - ONLY allow requests from official domain
const ALLOWED_ORIGINS = [
  'https://www.redpay.com.co',
  'https://redpay.com.co',
  'http://localhost:8080', // For local development only - remove in production
  'http://localhost:5173',
];

const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed) || origin.includes('lovable.dev'));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://www.redpay.com.co',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

interface WithdrawalRequest {
  user_id: string;
  amount: number;
  account_number: string;
  account_name: string;
  bank: string;
  access_code: string;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Domain restriction check
  if (origin && !ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed) || origin.includes('lovable.dev'))) {
    console.error('Blocked request from unauthorized origin:', origin);
    return new Response(
      JSON.stringify({ error: 'Unauthorized origin', success: false }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: WithdrawalRequest = await req.json();
    const { user_id, amount, account_number, account_name, bank, access_code } = requestData;

    console.log('Processing withdrawal for user:', user_id);

    // Server-side validation
    if (!user_id || !amount || !account_number || !account_name || !bank || !access_code) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate account number format
    if (!/^[0-9]{10}$/.test(account_number)) {
      return new Response(
        JSON.stringify({ error: 'Invalid account number format', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate amount
    if (amount < 1000 || amount > 10000000) {
      return new Response(
        JSON.stringify({ error: 'Amount must be between ₦1,000 and ₦10,000,000', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Note: RPC code validation is now done against the user's personal RPC code after fetching their profile

    // Get user profile with balance and RPC code
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'User not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user's personal RPC code - this is the primary validation
    const userRpcCode = user.rpc_code;
    if (!userRpcCode || access_code !== userRpcCode) {
      console.error('Invalid access code attempt for user:', user_id, '- Expected:', userRpcCode, 'Got:', access_code);
      return new Response(
        JSON.stringify({ error: 'Invalid access code', success: false, redirect: '/buy-rpc' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check balance
    const currentBalance = user.balance || 0;
    if (amount > currentBalance) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newBalance = currentBalance - amount;

    // Update balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('user_id', user_id);

    if (updateError) {
      throw updateError;
    }

    // Create transaction record
    const transactionId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user_id,
        title: 'Withdrawal',
        amount: -amount,
        type: 'debit',
        transaction_id: transactionId,
        balance_before: currentBalance,
        balance_after: newBalance,
        meta: {
          account_number,
          account_name,
          bank,
          processed_at: new Date().toISOString(),
          server_validated: true
        }
      });

    if (transactionError) {
      // Rollback balance update
      await supabase
        .from('users')
        .update({ balance: currentBalance })
        .eq('user_id', user_id);
      throw transactionError;
    }

    console.log('Withdrawal processed successfully:', transactionId);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        new_balance: newBalance,
        message: 'Withdrawal processed successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Withdrawal error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Processing failed', success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
