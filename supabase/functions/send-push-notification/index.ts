import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FCMMessage {
  token: string;
  notification: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;
  webpush?: {
    fcm_options?: {
      link?: string;
    };
  };
}

async function sendFCMNotification(message: FCMMessage): Promise<boolean> {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
  
  if (!FCM_SERVER_KEY) {
    console.error('FCM_SERVER_KEY not configured');
    return false;
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${FCM_SERVER_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: message.token,
        notification: message.notification,
        data: message.data || {},
        webpush: message.webpush,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('FCM API error:', result);
      return false;
    }

    console.log('FCM notification sent successfully:', result);
    return result.success === 1;
  } catch (err: any) {
    console.error('Failed to send FCM notification:', err);
    return false;
  }
}

Deno.serve(async (req) => {
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

    let sentCount = 0;
    let deliveredCount = 0;
    let failedCount = 0;

    // Send notifications to all subscribed users
    for (const subscription of subscriptions || []) {
      try {
        const fcmMessage: FCMMessage = {
          token: subscription.fcm_token,
          notification: {
            title: notification.title,
            body: notification.body,
            image: notification.image_url || undefined,
          },
          data: {
            notification_id: notificationId,
            ...(notification.data_payload || {}),
          },
        };

        // Add webpush link if CTA URL provided
        if (notification.cta_url) {
          fcmMessage.webpush = {
            fcm_options: {
              link: notification.cta_url,
            },
          };
        }

        const success = await sendFCMNotification(fcmMessage);

        if (success) {
          await supabase.from('push_notification_logs').insert({
            notification_id: notificationId,
            user_id: subscription.user_id,
            status: 'delivered',
            sent_at: new Date().toISOString(),
            delivered_at: new Date().toISOString(),
          });
          sentCount++;
          deliveredCount++;
        } else {
          await supabase.from('push_notification_logs').insert({
            notification_id: notificationId,
            user_id: subscription.user_id,
            status: 'failed',
            error_message: 'FCM delivery failed',
          });
          failedCount++;
        }
      } catch (err: any) {
        console.error(`Failed to send to ${subscription.user_id}:`, err);
        
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

    console.log(`Notification sent: ${deliveredCount} delivered, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount, 
        deliveredCount,
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