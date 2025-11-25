import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Calendar } from 'lucide-react';

export default function AdminPush() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [sending, setSending] = useState(false);

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
          target_type: targetType,
          status: 'draft',
          created_by: adminUser.data.user?.id || '',
        })
        .select()
        .single();

      if (notifError) throw notifError;

      // Get target users based on selection
      let userQuery = supabase
        .from('push_subscriptions')
        .select('user_id, fcm_token');

      if (targetType !== 'all') {
        // Add filtering logic here based on targetType
      }

      const { data: subscriptions, error: subError } = await userQuery;

      if (subError) throw subError;

      // Update notification status
      await supabase
        .from('push_notifications')
        .update({ 
          status: 'sent', 
          sent_at: new Date().toISOString(),
          sent_count: subscriptions?.length || 0
        })
        .eq('id', notification.id);

      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          admin_user_id: adminUser.data.user?.id,
          action_type: 'push_notification_sent',
          details: { 
            notification_id: notification.id,
            title,
            target_type: targetType,
            recipient_count: subscriptions?.length || 0
          },
        });

      toast.success(`Notification queued for ${subscriptions?.length || 0} users`);
      
      // Reset form
      setTitle('');
      setBody('');
      setCtaUrl('');
      setTargetType('all');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Push Notifications</h1>
        <p className="text-muted-foreground">Send notifications to app users</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compose Notification</CardTitle>
            <CardDescription>Create and send push notifications</CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="target">Target Audience</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Users</SelectItem>
                  <SelectItem value="inactive">Inactive Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSend} 
              disabled={sending || !title || !body}
              className="w-full"
            >
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : 'Send Now'}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
