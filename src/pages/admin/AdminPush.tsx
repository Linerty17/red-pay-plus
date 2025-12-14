import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Users, Bell, Link, ExternalLink, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  cta_url: string | null;
  status: string;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
}

export default function AdminPush() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [linkType, setLinkType] = useState<'none' | 'internal' | 'external'>('none');
  const [internalPage, setInternalPage] = useState('');
  const [sending, setSending] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [subscribedUsers, setSubscribedUsers] = useState(0);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const internalPages = [
    { value: '/dashboard', label: 'Dashboard' },
    { value: '/withdraw', label: 'Withdraw' },
    { value: '/buyrpc', label: 'Buy RPC' },
    { value: '/refer-earn', label: 'Refer & Earn' },
    { value: '/history', label: 'Transaction History' },
    { value: '/profile', label: 'Profile' },
    { value: '/support', label: 'Support' },
    { value: '/community', label: 'Community' },
  ];

  useEffect(() => {
    fetchUserCounts();
    fetchNotificationHistory();
  }, []);

  useEffect(() => {
    if (linkType === 'internal' && internalPage) {
      setCtaUrl(`https://www.redpay.com.co${internalPage}`);
    } else if (linkType === 'none') {
      setCtaUrl('');
    }
  }, [linkType, internalPage]);

  const fetchUserCounts = async () => {
    try {
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      
      const { count: subsCount } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

      setTotalUsers(usersCount || 0);
      setSubscribedUsers(subsCount || 0);
    } catch (error) {
      console.error('Error fetching user counts:', error);
    }
  };

  const fetchNotificationHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('push_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notification history:', error);
    } finally {
      setLoadingHistory(false);
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

      const { data, error: functionError } = await supabase.functions.invoke('send-push-notification', {
        body: { notificationId: notification.id }
      });

      if (functionError) throw functionError;

      await supabase
        .from('audit_logs')
        .insert({
          admin_user_id: adminUser.data.user?.id,
          action_type: 'push_notification_sent',
          details: { 
            notification_id: notification.id,
            title,
            cta_url: ctaUrl,
            target_type: 'all',
            result: data
          },
        });

      toast.success(`Notification sent to ${data.deliveredCount || 0} users!`);
      
      setTitle('');
      setBody('');
      setCtaUrl('');
      setLinkType('none');
      setInternalPage('');
      
      fetchUserCounts();
      fetchNotificationHistory();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send notification');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Push Notifications</h1>
          <p className="text-muted-foreground">Send notifications with links to users</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
              <p className="text-xs text-muted-foreground">
                {totalUsers > 0 ? ((subscribedUsers / totalUsers) * 100).toFixed(1) : 0}% of users
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-500 rounded-full p-3">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reach Rate</p>
                <p className="text-3xl font-bold">
                  {subscribedUsers > 0 ? subscribedUsers : 0}
                </p>
                <p className="text-xs text-muted-foreground">users will receive</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUserCounts}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose">
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
                  <Label>Link Type</Label>
                  <Select value={linkType} onValueChange={(value: 'none' | 'internal' | 'external') => setLinkType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select link type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Link</SelectItem>
                      <SelectItem value="internal">App Page</SelectItem>
                      <SelectItem value="external">External URL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {linkType === 'internal' && (
                  <div className="space-y-2">
                    <Label>Select Page</Label>
                    <Select value={internalPage} onValueChange={setInternalPage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a page" />
                      </SelectTrigger>
                      <SelectContent>
                        {internalPages.map((page) => (
                          <SelectItem key={page.value} value={page.value}>
                            {page.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {linkType === 'external' && (
                  <div className="space-y-2">
                    <Label htmlFor="externalUrl">External URL</Label>
                    <Input
                      id="externalUrl"
                      placeholder="https://..."
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                    />
                  </div>
                )}

                {ctaUrl && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
                    <Link className="w-4 h-4 text-primary" />
                    <span className="truncate flex-1">{ctaUrl}</span>
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}

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
                    <div className="bg-primary rounded-full p-2 flex-shrink-0">
                      <Bell className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{title || 'Notification Title'}</h4>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                        {body || 'Your notification message will appear here...'}
                      </p>
                      {ctaUrl && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                          <Link className="w-3 h-3" />
                          <span>Tap to open</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground text-center">
                    This notification will be sent to{' '}
                    <span className="font-semibold text-foreground">{subscribedUsers.toLocaleString()}</span>{' '}
                    subscribed users out of{' '}
                    <span className="font-semibold text-foreground">{totalUsers.toLocaleString()}</span> total users
                  </p>
                </div>

                {ctaUrl && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-xs font-medium text-primary flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Users will be directed to:
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{ctaUrl}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Notification History</CardTitle>
                <CardDescription>Recent push notifications sent</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchNotificationHistory}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No notifications sent yet</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notif) => (
                      <TableRow key={notif.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium truncate max-w-[200px]">{notif.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {notif.body}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {notif.cta_url ? (
                            <a 
                              href={notif.cta_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Link
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(notif.status || 'pending')}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-600 font-medium">{notif.delivered_count || 0}</span>
                          {notif.failed_count > 0 && (
                            <span className="text-destructive text-xs ml-1">({notif.failed_count} failed)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {notif.sent_at 
                            ? format(new Date(notif.sent_at), 'MMM d, h:mm a')
                            : format(new Date(notif.created_at), 'MMM d, h:mm a')
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
