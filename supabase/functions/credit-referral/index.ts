import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreditReferralRequest {
  new_user_id: string
  new_user_email?: string
  referral_code: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { new_user_id, referral_code, new_user_email } = await req.json() as CreditReferralRequest

    console.log('Credit referral request:', { new_user_id, referral_code, new_user_email })

    // Validate inputs
    if (!new_user_id || !referral_code) {
      return new Response(
        JSON.stringify({ credited: false, reason: 'missing_parameters', message: 'new_user_id and referral_code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Find referrer by referral code
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from('users')
      .select('user_id, referral_count, balance')
      .eq('referral_code', referral_code)
      .single()

    if (referrerError || !referrer) {
      console.log('Invalid referral code:', referral_code, referrerError)
      return new Response(
        JSON.stringify({ credited: false, reason: 'invalid_code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found referrer:', referrer.user_id)

    // Step 2: Check if new user already has a referrer (idempotency check)
    const { data: newUser, error: newUserError } = await supabaseAdmin
      .from('users')
      .select('referred_by, user_id')
      .eq('user_id', new_user_id)
      .single()

    if (newUserError || !newUser) {
      console.error('Failed to find new user:', newUserError)
      return new Response(
        JSON.stringify({ credited: false, reason: 'user_not_found', message: 'New user not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (newUser.referred_by) {
      console.log('User already referred by:', newUser.referred_by)
      return new Response(
        JSON.stringify({
          credited: false,
          reason: 'already_credited',
          referrer_id: referrer.user_id,
          referral_count: referrer.referral_count,
          referrer_balance: referrer.balance
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 3: Atomic update - set referred_by on new user
    const { error: updateNewUserError } = await supabaseAdmin
      .from('users')
      .update({ referred_by: referrer.user_id })
      .eq('user_id', new_user_id)
      .is('referred_by', null) // Only update if still null (race condition protection)

    if (updateNewUserError) {
      console.error('Failed to update new user referred_by:', updateNewUserError)
      return new Response(
        JSON.stringify({ credited: false, reason: 'database_error', message: updateNewUserError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 4: Get current balance for transaction record
    const balanceBefore = referrer.balance || 0
    const balanceAfter = balanceBefore + 5000

    // Step 5: Create transaction record
    const transactionId = `REF-${Date.now()}-${new_user_id.slice(0, 8)}`
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: referrer.user_id,
        title: 'Referral Bonus',
        amount: 5000,
        type: 'credit',
        transaction_id: transactionId,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        meta: {
          referral_new_user_id: new_user_id,
          referral_new_user_email: new_user_email,
          date: new Date().toISOString()
        }
      })
      .select('id')
      .single()

    if (transactionError) {
      console.error('Failed to create transaction:', transactionError)
      // Rollback: remove referred_by
      await supabaseAdmin
        .from('users')
        .update({ referred_by: null })
        .eq('user_id', new_user_id)
      
      return new Response(
        JSON.stringify({ credited: false, reason: 'transaction_failed', message: transactionError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 6: Update referrer's balance and referral_count
    const { error: updateReferrerError } = await supabaseAdmin
      .from('users')
      .update({
        balance: balanceAfter,
        referral_count: (referrer.referral_count || 0) + 1
      })
      .eq('user_id', referrer.user_id)

    if (updateReferrerError) {
      console.error('Failed to update referrer:', updateReferrerError)
      // Note: Transaction and referred_by already set - this is a partial failure
      // Log for manual reconciliation
      return new Response(
        JSON.stringify({ 
          credited: false, 
          reason: 'referrer_update_failed', 
          message: updateReferrerError.message,
          transaction_id: transaction.id 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 7: Create referral record for tracking
    const { error: referralRecordError } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_id: referrer.user_id,
        new_user_id: new_user_id,
        amount_given: 5000
      })

    if (referralRecordError) {
      console.warn('Failed to create referral record (non-critical):', referralRecordError)
      // Non-critical - don't fail the entire operation
    }

    // Success!
    console.log('Referral credited successfully:', {
      referrer_id: referrer.user_id,
      new_user_id,
      transaction_id: transactionId
    })

    return new Response(
      JSON.stringify({
        credited: true,
        referrer_id: referrer.user_id,
        referral_count: (referrer.referral_count || 0) + 1,
        referrer_balance: balanceAfter,
        transaction_id: transactionId
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error in credit-referral:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ 
        credited: false, 
        reason: 'server_error', 
        message: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
