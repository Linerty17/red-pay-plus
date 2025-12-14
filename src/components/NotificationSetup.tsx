import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, BellRing, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationSetupProps {
  userId: string;
}

export function NotificationSetup({ userId }: NotificationSetupProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
    
    // Check if user has an active subscription
    checkSubscription();
  }, [userId]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const registerPushNotifications = async () => {
    if (!isSupported) {
      toast.error('Push notifications not supported in this browser');
      return;
    }

    setIsRegistering(true);

    try {
      // Request permission
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);

      if (newPermission !== 'granted') {
        toast.error('Permission denied for notifications');
        return;
      }

      // Generate a unique device token for this browser
      const deviceToken = `web_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Save subscription to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          fcm_token: deviceToken,
          platform: 'web',
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
    } catch (error: any) {
      console.error('Error enabling push notifications:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsRegistering(false);
    }
  };

  const testNotification = async () => {
    if (permission !== 'granted') {
      toast.error('Please enable notifications first');
      return;
    }

    setIsTesting(true);
    try {
      // Show a test notification locally
      const notification = new Notification('REDPAY Test Notification', {
        body: 'Your notifications are working correctly! 🎉',
        icon: '/favicon.png',
        badge: '/favicon.png',
        tag: 'test-notification'
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      toast.success('Test notification sent!');
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  };

  const resubscribe = async () => {
    // Clear the permission check from localStorage
    localStorage.removeItem(`permissions_checked_${userId}`);
    
    // Re-register
    await registerPushNotifications();
  };

  if (!isSupported) {
    return (
      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Your browser doesn't support push notifications
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {permission === 'granted' ? (
            <Bell className="h-5 w-5 text-green-500" />
          ) : permission === 'denied' ? (
            <BellOff className="h-5 w-5 text-destructive" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          Push Notifications
        </CardTitle>
        <CardDescription>
          {permission === 'granted'
            ? isSubscribed 
              ? 'You are subscribed to receive notifications'
              : 'Permission granted but not subscribed'
            : permission === 'denied'
            ? 'Notifications are blocked. Enable in browser settings.'
            : 'Enable notifications to stay updated'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {permission === 'granted' && isSubscribed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-500/10 p-3 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span>Notifications are active</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={testNotification}
                variant="outline"
                disabled={isTesting}
                className="flex-1"
              >
                <BellRing className="h-4 w-4 mr-2" />
                {isTesting ? 'Sending...' : 'Test'}
              </Button>
              <Button
                onClick={resubscribe}
                variant="outline"
                disabled={isRegistering}
                className="flex-1"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRegistering ? 'animate-spin' : ''}`} />
                {isRegistering ? 'Updating...' : 'Re-subscribe'}
              </Button>
            </div>
          </div>
        ) : permission === 'granted' && !isSubscribed ? (
          <Button
            onClick={registerPushNotifications}
            disabled={isRegistering}
            className="w-full"
          >
            {isRegistering ? 'Subscribing...' : 'Subscribe to Notifications'}
          </Button>
        ) : permission === 'denied' ? (
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">How to enable:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Click the lock icon in the address bar</li>
              <li>Find "Notifications" in the menu</li>
              <li>Change from "Block" to "Allow"</li>
              <li>Refresh the page</li>
            </ol>
          </div>
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
