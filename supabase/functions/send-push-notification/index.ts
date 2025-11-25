import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    if (notifError) throw notifError;

    // Get target subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (subError) throw subError;

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    // NOTE: This is where you would integrate with FCM or another push service
    // For now, we'll just log the notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const subscription of subscriptions || []) {
      try {
        // TODO: Implement actual push notification sending with FCM
        // Example FCM call would go here
        console.log(`Would send to ${subscription.user_id}: ${notification.title}`);
        
        // Log successful delivery
        await supabase.from('push_notification_logs').insert({
          notification_id: notificationId,
          user_id: subscription.user_id,
          status: 'delivered',
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
        });

        sentCount++;
      } catch (err: any) {
        console.error(`Failed to send to ${subscription.user_id}:`, err);
        
        // Log failed delivery
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
        delivered_count: sentCount,
        failed_count: failedCount,
      })
      .eq('id', notificationId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount, 
        failedCount,
        message: 'Push notifications processed'
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