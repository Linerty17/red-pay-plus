import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Bell, Users, CheckCircle, XCircle, Clock } from 'lucide-react';

interface NotificationStats {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalSubscribers: number;
}

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  status: string;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  sent_at: string | null;
}

export default function AdminNotifications() {
  const [stats, setStats] = useState<NotificationStats>({
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalSubscribers: 0,
  });
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch notification stats
      const { data: notifData, error: notifError } = await supabase
        .from('push_notifications')
        .select('sent_count, delivered_count, failed_count')
        .eq('status', 'sent');

      if (notifError) throw notifError;

      // Fetch subscriber count
      const { count: subCount, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

      if (subError) throw subError;

      // Calculate totals
      const totalSent = notifData?.reduce((sum, n) => sum + (n.sent_count || 0), 0) || 0;
      const totalDelivered = notifData?.reduce((sum, n) => sum + (n.delivered_count || 0), 0) || 0;
      const totalFailed = notifData?.reduce((sum, n) => sum + (n.failed_count || 0), 0) || 0;

      setStats({
        totalSent,
        totalDelivered,
        totalFailed,
        totalSubscribers: subCount || 0,
      });

      // Fetch recent notifications
      const { data: recentNotifs, error: recentError } = await supabase
        .from('push_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (recentError) throw recentError;

      setNotifications(recentNotifs || []);
    } catch (error: any) {
      console.error('Error fetching notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Subscribers',
      value: stats.totalSubscribers,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Notifications Sent',
      value: stats.totalSent,
      icon: Bell,
      color: 'text-purple-500',
    },
    {
      title: 'Successfully Delivered',
      value: stats.totalDelivered,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Failed Deliveries',
      value: stats.totalFailed,
      icon: XCircle,
      color: 'text-red-500',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      sent: 'default',
      pending: 'secondary',
      draft: 'secondary',
      failed: 'destructive',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notification Analytics</h1>
        <p className="text-muted-foreground">Monitor push notification performance</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Latest push notifications sent to users</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Delivered</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No notifications sent yet
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notif) => (
                  <TableRow key={notif.id}>
                    <TableCell className="font-medium">{notif.title}</TableCell>
                    <TableCell>{getStatusBadge(notif.status || 'draft')}</TableCell>
                    <TableCell>{notif.sent_count || 0}</TableCell>
                    <TableCell className="text-green-600">{notif.delivered_count || 0}</TableCell>
                    <TableCell className="text-red-600">{notif.failed_count || 0}</TableCell>
                    <TableCell>
                      {notif.sent_at
                        ? new Date(notif.sent_at).toLocaleDateString()
                        : new Date(notif.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delivery Rate */}
      {stats.totalSent > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Success Rate</span>
                <span className="font-bold">
                  {((stats.totalDelivered / stats.totalSent) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${(stats.totalDelivered / stats.totalSent) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
