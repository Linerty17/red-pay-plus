import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Send, Users, Bell } from 'lucide-react';

export default function AdminPush() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [subscribedUsers, setSubscribedUsers] = useState(0);

  useEffect(() => {
    fetchUserCounts();
  }, []);

  const fetchUserCounts = async () => {
    try {
      // Get total users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      // Get subscribed users count (those with push tokens)
      const { count: subsCount } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

      setTotalUsers(usersCount || 0);
      setSubscribedUsers(subsCount || 0);
    } catch (error) {
      console.error('Error fetching user counts:', error);
    }
  };

  const handleSend = async () => {
    if (!title || !body) {
      toast.error('Title and body are required');
      return;
    }

    setSending(true);
    try {
      const adminUser = await supabase.auth.getUser();
      
      // Create notification record
      const { data: notification, error: notifError } = await supabase
        .from('push_notifications')
        .insert({
          title,
          body,
          cta_url: ctaUrl || null,
          target_type: 'all',
          status: 'pending',
          created_by: adminUser.data.user?.id || '',
        })
        .select()
        .single();

      if (notifError) throw notifError;

      // Call edge function to send notifications
      const { data, error: functionError } = await supabase.functions.invoke('send-push-notification', {
        body: { notificationId: notification.id }
      });

      if (functionError) throw functionError;

      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          admin_user_id: adminUser.data.user?.id,
          action_type: 'push_notification_sent',
          details: { 
            notification_id: notification.id,
            title,
            target_type: 'all',
            result: data
          },
        });

      toast.success(`Notification sent to ${data.deliveredCount || 0} users!`);
      
      // Reset form
      setTitle('');
      setBody('');
      setCtaUrl('');
      
      // Refresh counts
      fetchUserCounts();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Broadcast Message</h1>
          <p className="text-muted-foreground">Send push notifications to all users</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-primary rounded-full p-3">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-3xl font-bold">{totalUsers.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-green-500 rounded-full p-3">
              <Bell className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Push Subscribed</p>
              <p className="text-3xl font-bold">{subscribedUsers.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compose Notification</CardTitle>
            <CardDescription>
              Send to all {subscribedUsers.toLocaleString()} subscribed users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Notification title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">{title.length}/50 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                placeholder="Notification message..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={200}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">{body.length}/200 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta">Call to Action URL (Optional)</Label>
              <Input
                id="cta"
                placeholder="https://..."
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleSend} 
              disabled={sending || !title || !body}
              className="w-full"
              size="lg"
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : `Send to All ${subscribedUsers.toLocaleString()} Users`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How your notification will appear</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-card space-y-2">
              <div className="flex items-start gap-3">
                <div className="bg-primary rounded-full p-2">
                  <Send className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{title || 'Notification Title'}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {body || 'Your notification message will appear here...'}
                  </p>
                  {ctaUrl && (
                    <Button variant="link" className="h-auto p-0 mt-2 text-xs">
                      Open Link →
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                This notification will be sent to <span className="font-semibold text-foreground">{subscribedUsers.toLocaleString()}</span> subscribed users out of <span className="font-semibold text-foreground">{totalUsers.toLocaleString()}</span> total users
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
