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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, dryRun = true } = await req.json();

    const results: {
      duplicatesFound: Array<{ new_user_id: string; duplicate_id: string; original_id: string }>;
      earningsFixed: Array<{ user_id: string; current_count: number; actual_count: number; count_delta: number }>;
      errors: Array<string>;
    } = {
      duplicatesFound: [],
      earningsFixed: [],
      errors: []
    };

    // Find duplicate referrals (same new_user_id)
    const { data: allReferrals } = await supabaseClient
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: true });

    if (allReferrals) {
      const newUserMap = new Map();
      
      for (const ref of allReferrals) {
        if (newUserMap.has(ref.new_user_id)) {
          results.duplicatesFound.push({
            new_user_id: ref.new_user_id,
            duplicate_id: ref.id,
            original_id: newUserMap.get(ref.new_user_id).id
          });

          if (!dryRun) {
            // Mark duplicate as rejected
            await supabaseClient
              .from('referrals')
              .update({
                status: 'rejected',
                notes: 'Duplicate referral - marked by repair script'
              })
              .eq('id', ref.id);
          }
        } else {
          newUserMap.set(ref.new_user_id, ref);
        }
      }
    }

    // Verify referral_earnings matches sum of confirmed referrals
    const { data: users } = await supabaseClient
      .from('users')
      .select('user_id, referral_count, balance');

    if (users) {
      for (const usr of users) {
        const { data: confirmedRefs } = await supabaseClient
          .from('referrals')
          .select('amount_given')
          .eq('referrer_id', usr.user_id)
          .in('status', ['confirmed', 'manual']);

        if (confirmedRefs) {
          const actualCount = confirmedRefs.length;
          const actualEarnings = confirmedRefs.reduce((sum, r) => sum + (r.amount_given || 0), 0);

          if (actualCount !== usr.referral_count || actualEarnings !== usr.balance) {
            results.earningsFixed.push({
              user_id: usr.user_id,
              current_count: usr.referral_count,
              actual_count: actualCount,
              count_delta: actualCount - usr.referral_count
            });

            if (!dryRun) {
              // Fix the counts
              await supabaseClient
                .from('users')
                .update({
                  referral_count: actualCount
                })
                .eq('user_id', usr.user_id);

              // Log the fix
              await supabaseClient
                .from('audit_logs')
                .insert({
                  admin_user_id: user.id,
                  action_type: 'referral_repair',
                  details: {
                    user_id: usr.user_id,
                    old_count: usr.referral_count,
                    new_count: actualCount
                  }
                });
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        results,
        summary: {
          duplicates: results.duplicatesFound.length,
          earningsMismatches: results.earningsFixed.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
