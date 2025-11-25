import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    if (!isAdmin) {
      throw new Error('Admin access required');
    }

    const { referralId, notes } = await req.json();

    if (!referralId || !notes?.trim()) {
      throw new Error('Referral ID and notes are required');
    }

    // Start transaction
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select(`
        *,
        referrer:users!referrals_referrer_id_fkey(user_id, balance, referral_count)
      `)
      .eq('id', referralId)
      .single();

    if (referralError || !referral) {
      throw new Error('Referral not found');
    }

    // Check if already credited
    if (referral.amount_given || referral.manually_credited) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Referral already credited',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referrerData = referral.referrer as any;
    const currentBalance = referrerData.balance || 0;
    const newBalance = currentBalance + 5000;
    const currentCount = referrerData.referral_count || 0;

    // Update referrer balance and count
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        balance: newBalance,
        referral_count: currentCount + 1,
      })
      .eq('user_id', referral.referrer_id);

    if (updateUserError) throw updateUserError;

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: referral.referrer_id,
        title: 'Referral Bonus (Manual)',
        amount: 5000,
        type: 'credit',
        transaction_id: `MANUAL-REF-${Date.now()}`,
        balance_before: currentBalance,
        balance_after: newBalance,
        meta: {
          referral_id: referralId,
          new_user_id: referral.new_user_id,
          admin_user_id: user.id,
          notes: notes,
          date: new Date().toISOString(),
        },
      });

    if (transactionError) throw transactionError;

    // Mark referral as manually credited
    const { error: updateReferralError } = await supabase
      .from('referrals')
      .update({
        manually_credited: true,
        amount_given: 5000,
        manual_credit_notes: notes,
      })
      .eq('id', referralId);

    if (updateReferralError) throw updateReferralError;

    console.log(`Manual credit successful: ${referralId} by admin ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        referrer_id: referral.referrer_id,
        new_balance: newBalance,
        referral_count: currentCount + 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Manual credit error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
