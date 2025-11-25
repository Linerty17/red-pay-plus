import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  targetType: 'all' | 'segment' | 'single';
  targetCriteria?: any;
  imageUrl?: string;
  ctaUrl?: string;
  dataPayload?: any;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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

    const payload: PushPayload = await req.json();

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabaseClient
      .from('push_campaigns')
      .insert({
        admin_user_id: user.id,
        title: payload.title,
        body: payload.body,
        target_criteria: payload.targetCriteria || {}
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating campaign:', campaignError);
      return new Response(
        JSON.stringify({ error: campaignError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target push subscriptions based on criteria
    let subscriptionsQuery = supabaseClient
      .from('push_subscriptions')
      .select('user_id, fcm_token, platform');

    if (payload.targetType === 'single' && payload.targetCriteria?.userId) {
      subscriptionsQuery = subscriptionsQuery.eq('user_id', payload.targetCriteria.userId);
    }
    // Add more targeting logic here based on targetCriteria

    const { data: subscriptions, error: subsError } = await subscriptionsQuery;

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return new Response(
        JSON.stringify({ error: subsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for FCM server key
    const fcmServerKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmServerKey) {
      console.warn('FCM_SERVER_KEY not configured - push notifications will not be sent');
      
      // Still create notification records but mark as failed
      if (subscriptions) {
        for (const sub of subscriptions) {
          await supabaseClient
            .from('push_notification_logs')
            .insert({
              notification_id: campaign.id,
              user_id: sub.user_id,
              status: 'failed',
              error_message: 'FCM_SERVER_KEY not configured'
            });
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'FCM_SERVER_KEY not configured',
          campaignId: campaign.id,
          message: 'Campaign created but notifications not sent. Please configure FCM_SERVER_KEY environment variable.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send push notifications via FCM
    let sentCount = 0;
    let failedCount = 0;

    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        try {
          const fcmPayload = {
            message: {
              token: sub.fcm_token,
              notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.imageUrl && { image: payload.imageUrl })
              },
              data: payload.dataPayload || {},
              ...(payload.ctaUrl && {
                webpush: {
                  fcm_options: {
                    link: payload.ctaUrl
                  }
                }
              })
            }
          };

          const fcmResponse = await fetch(
            `https://fcm.googleapis.com/v1/projects/${Deno.env.get('FCM_PROJECT_ID')}/messages:send`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${fcmServerKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(fcmPayload)
            }
          );

          const responseData = await fcmResponse.json();

          if (fcmResponse.ok) {
            sentCount++;
            await supabaseClient
              .from('push_notification_logs')
              .insert({
                notification_id: campaign.id,
                user_id: sub.user_id,
                status: 'delivered',
                sent_at: new Date().toISOString(),
                delivered_at: new Date().toISOString()
              });
          } else {
            failedCount++;
            await supabaseClient
              .from('push_notification_logs')
              .insert({
                notification_id: campaign.id,
                user_id: sub.user_id,
                status: 'failed',
                error_message: JSON.stringify(responseData),
                sent_at: new Date().toISOString()
              });
          }
        } catch (error) {
          failedCount++;
          console.error(`Error sending to ${sub.user_id}:`, error);
          await supabaseClient
            .from('push_notification_logs')
            .insert({
              notification_id: campaign.id,
              user_id: sub.user_id,
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
      }
    }

    // Update campaign with stats
    await supabaseClient
      .from('push_notifications')
      .update({
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
        status: 'sent'
      })
      .eq('id', campaign.id);

    // Create audit log
    await supabaseClient
      .from('audit_logs')
      .insert({
        admin_user_id: user.id,
        action_type: 'push_notification_sent',
        details: {
          campaign_id: campaign.id,
          title: payload.title,
          target_type: payload.targetType,
          sent_count: sentCount,
          failed_count: failedCount
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        campaignId: campaign.id,
        sent: sentCount,
        failed: failedCount,
        total: subscriptions?.length || 0
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
