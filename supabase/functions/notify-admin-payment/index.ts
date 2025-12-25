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

    const { userName, userEmail, paymentId } = await req.json();
    console.log('New payment notification request:', { userName, userEmail, paymentId });

    // Get all admin user IDs
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error fetching admin roles:', rolesError);
      throw rolesError;
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admins found');
      return new Response(JSON.stringify({ success: true, message: 'No admins to notify' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminUserIds = adminRoles.map(r => r.user_id);
    console.log('Admin user IDs:', adminUserIds);

    // Get admin users from users table (matching auth_user_id)
    const { data: adminUsers, error: usersError } = await supabase
      .from('users')
      .select('user_id, auth_user_id')
      .in('auth_user_id', adminUserIds);

    if (usersError) {
      console.error('Error fetching admin users:', usersError);
    }

    // Get push subscriptions for admin users
    const userIdsToCheck = adminUsers?.map(u => u.user_id) || [];
    
    // Also check with auth_user_id directly in push_subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .or(`user_id.in.(${adminUserIds.join(',')}),user_id.in.(${userIdsToCheck.join(',') || 'null'})`);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
    }

    console.log('Found subscriptions:', subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No admin push subscriptions found');
      return new Response(JSON.stringify({ success: true, message: 'No admin subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send push notifications using FCM
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      console.error('FCM_SERVER_KEY not configured');
      return new Response(JSON.stringify({ success: false, error: 'FCM not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const notificationPayload = {
      notification: {
        title: '💰 New Payment Received',
        body: `${userName || 'A user'} has submitted a payment for approval`,
        icon: '/favicon.png',
        badge: '/favicon.png',
        click_action: '/admin/payments',
      },
      data: {
        url: '/admin/payments',
        payment_id: paymentId,
        type: 'new_payment',
      },
    };

    let sentCount = 0;
    let failedCount = 0;

    for (const sub of subscriptions) {
      try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${fcmServerKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: sub.fcm_token,
            ...notificationPayload,
          }),
        });

        const result = await response.json();
        console.log('FCM response for token:', sub.fcm_token.substring(0, 20) + '...', result);

        if (result.success === 1) {
          sentCount++;
        } else {
          failedCount++;
          // Remove invalid tokens
          if (result.results?.[0]?.error === 'NotRegistered' || result.results?.[0]?.error === 'InvalidRegistration') {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.log('Removed invalid subscription:', sub.id);
          }
        }
      } catch (err) {
        console.error('Error sending to token:', err);
        failedCount++;
      }
    }

    console.log(`Notification sent: ${sentCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in notify-admin-payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
