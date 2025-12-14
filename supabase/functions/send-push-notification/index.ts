import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { notificationId } = await req.json();
    console.log('Processing notification:', notificationId);

    // Get notification details
    const { data: notification, error: notifError } = await supabase
      .from('push_notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (notifError) {
      console.error('Error fetching notification:', notifError);
      throw notifError;
    }

    console.log('Notification details:', notification.title);

    // Get all subscribed users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    // For web notifications, we'll store the notification for users to fetch
    // and mark their subscriptions as having pending notifications
    for (const subscription of subscriptions || []) {
      try {
        // Log the notification delivery attempt
        await supabase.from('push_notification_logs').insert({
          notification_id: notificationId,
          user_id: subscription.user_id,
          status: 'pending',
          sent_at: new Date().toISOString(),
        });

        sentCount++;
        deliveredCount++;
        
        console.log(`Notification queued for user: ${subscription.user_id}`);
      } catch (err: any) {
        console.error(`Failed to queue notification for ${subscription.user_id}:`, err);
        
        await supabase.from('push_notification_logs').insert({
          notification_id: notificationId,
          user_id: subscription.user_id,
          status: 'failed',
          error_message: err?.message || 'Unknown error',
        });

        failedCount++;
      }
    }

    // Update notification status
    await supabase
      .from('push_notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        delivered_count: deliveredCount,
        failed_count: failedCount,
      })
      .eq('id', notificationId);

    console.log(`Notification processed: ${deliveredCount} queued, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount, 
        deliveredCount,
        failedCount,
        message: 'Push notifications queued for delivery'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
