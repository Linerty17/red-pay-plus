import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PurchaseRequest {
  phone_number: string
  amount: number
  service_type: 'airtime' | 'data'
  access_code: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create authenticated client to get user
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request
    const { phone_number, amount, service_type, access_code } = await req.json() as PurchaseRequest

    console.log('Purchase request:', { user_id: user.id, phone_number, amount, service_type })

    // Validate inputs
    if (!phone_number || !amount || !service_type || !access_code) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (amount < 50 || amount > 100000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Amount must be between ₦50 and ₦100,000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch valid access code from private_settings
    const { data: accessCodeSetting, error: settingsError } = await supabaseAdmin
      .from('private_settings')
      .select('value')
      .eq('key', 'rpc_access_code')
      .single()

    if (settingsError || !accessCodeSetting) {
      console.error('Failed to fetch access code:', settingsError)
      return new Response(
        JSON.stringify({ success: false, error: 'System configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate access code
    if (access_code !== accessCodeSetting.value) {
      return new Response(
        JSON.stringify({ success: false, error: 'invalid_access_code' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('user_id, balance')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Failed to fetch profile:', profileError)
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check balance
    const currentBalance = profile.balance || 0
    if (amount > currentBalance) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newBalance = currentBalance - amount
    const transactionId = `${service_type === 'airtime' ? 'AIR' : 'DATA'}-${Date.now()}`

    // Create transaction record FIRST
    const { error: transactionError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: profile.user_id,
        title: `${service_type === 'airtime' ? 'Airtime' : 'Data'} Purchase`,
        amount: -amount,
        type: 'debit',
        transaction_id: transactionId,
        balance_before: currentBalance,
        balance_after: newBalance,
        meta: {
          phone_number,
          service_type
        }
      })

    if (transactionError) {
      console.error('Failed to create transaction:', transactionError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process transaction' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update user balance
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ balance: newBalance })
      .eq('user_id', profile.user_id)

    if (updateError) {
      console.error('Failed to update balance:', updateError)
      // Note: Transaction already created - would need reconciliation
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update balance' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Purchase successful:', { transaction_id: transactionId, new_balance: newBalance })

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transactionId,
        new_balance: newBalance
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
