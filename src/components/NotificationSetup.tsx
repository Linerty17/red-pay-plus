import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSetupProps {
  userId: string;
}

export function NotificationSetup({ userId }: NotificationSetupProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const registerPushNotifications = async () => {
    if (!isSupported) {
      toast.error('Push notifications not supported in this browser');
      return;
    }

    setIsRegistering(true);

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        toast.error('Permission denied for notifications');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // Firebase VAPID Public Key - Get from Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
          'BGpT8mLJvLRHM_yq-K5QZ5QZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z'
        ),
      });

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          fcm_token: JSON.stringify(subscription),
          platform: 'web',
        }, {
          onConflict: 'user_id,fcm_token'
        });

      if (error) throw error;

      toast.success('Push notifications enabled!');
    } catch (error: any) {
      console.error('Error enabling push notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {permission === 'granted' ? (
            <Bell className="h-5 w-5 text-green-500" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Push Notifications
        </CardTitle>
        <CardDescription>
          {permission === 'granted'
            ? 'You will receive notifications about important updates'
            : 'Enable notifications to stay updated'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {permission === 'granted' ? (
          <p className="text-sm text-muted-foreground">
            Notifications are enabled ✓
          </p>
        ) : (
          <Button
            onClick={registerPushNotifications}
            disabled={isRegistering}
            className="w-full"
          >
            {isRegistering ? 'Enabling...' : 'Enable Notifications'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}