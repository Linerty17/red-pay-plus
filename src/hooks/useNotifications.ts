import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useNotifications(userId: string | undefined) {
  const checkAndShowNotifications = useCallback(async () => {
    if (!userId || !('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      // Get pending notifications for this user
      const { data: pendingLogs, error } = await supabase
        .from('push_notification_logs')
        .select(`
          id,
          notification_id,
          status,
          push_notifications (
            title,
            body,
            cta_url,
            image_url
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      for (const log of pendingLogs || []) {
        const notif = log.push_notifications as any;
        if (!notif) continue;

        // Show browser notification
        const notification = new Notification(notif.title || 'REDPAY', {
          body: notif.body || '',
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: log.notification_id,
          data: {
            url: notif.cta_url || '/dashboard'
          }
        });

        notification.onclick = () => {
          window.focus();
          if (notif.cta_url) {
            window.location.href = notif.cta_url;
          }
          notification.close();
        };

        // Mark as delivered
        await supabase
          .from('push_notification_logs')
          .update({ 
            status: 'delivered',
            delivered_at: new Date().toISOString()
          })
          .eq('id', log.id);
      }
    } catch (err) {
      console.error('Error showing notifications:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Check for notifications on mount
    checkAndShowNotifications();

    // Check periodically (every 30 seconds)
    const interval = setInterval(checkAndShowNotifications, 30000);

    // Also subscribe to realtime changes
    const channel = supabase
      .channel('push_notifications_channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'push_notification_logs',
          filter: `user_id=eq.${userId}`
        },
        () => {
          // New notification received, show it
          setTimeout(checkAndShowNotifications, 1000);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [userId, checkAndShowNotifications]);

  return { checkAndShowNotifications };
}
