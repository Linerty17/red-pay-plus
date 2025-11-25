import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Bell, Send, Clock, CheckCircle, XCircle, Eye, BarChart } from "lucide-react";

const TEMPLATES = [
  {
    id: "referral_credited",
    name: "Referral Credited",
    title: "You earned ₦5,000!",
    body: "Congrats! Someone used your referral code — ₦5,000 has been added to your balance. View in app.",
    cta_url: "/dashboard"
  },
  {
    id: "welcome",
    name: "Welcome",
    title: "Welcome to RedPay",
    body: "Thanks for joining RedPay! Start by claiming your welcome bonus.",
    cta_url: "/dashboard"
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder",
    title: "Complete activation",
    body: "Your activation payment is pending. Tap to finish and unlock withdrawals.",
    cta_url: "/payment-instructions"
  },
  {
    id: "system_update",
    name: "System Update",
    title: "Maintenance notice",
    body: "RedPay will be down for maintenance. We'll be back ASAP.",
    cta_url: ""
  }
];

export default function AdminPushNotifications() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetCriteria, setTargetCriteria] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");

  const { data: notifications } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_notifications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: notificationLogs } = useQuery({
    queryKey: ["admin-notification-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("push_notification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (notificationData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("push_notifications")
        .insert({
          ...notificationData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log admin action
      await supabase.from("audit_logs").insert({
        admin_user_id: user.id,
        action_type: "push_notification_created",
        details: { notification_id: data.id, title: notificationData.title },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success("Notification saved successfully");
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save notification");
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get admin's user_id from users table
      const { data: userData } = await supabase
        .from("users")
        .select("user_id")
        .eq("auth_user_id", user.id)
        .single();

      if (!userData) throw new Error("User profile not found");

      // Create a test notification
      const testNotification = {
        title,
        body,
        cta_url: ctaUrl,
        image_url: imageUrl,
        target_type: "custom",
        target_criteria: { user_ids: [userData.user_id] },
        status: "sent",
        created_by: user.id,
        sent_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("push_notifications")
        .insert(testNotification)
        .select()
        .single();

      if (error) throw error;

      // Create log entry
      await supabase.from("push_notification_logs").insert({
        notification_id: data.id,
        user_id: userData.user_id,
        status: "sent",
        sent_at: new Date().toISOString(),
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin-notification-logs"] });
      toast.success("Test notification sent to your account");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send test notification");
    },
  });

  const applyTemplate = (template: typeof TEMPLATES[0]) => {
    setTitle(template.title);
    setBody(template.body);
    setCtaUrl(template.cta_url);
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setCtaUrl("");
    setImageUrl("");
    setTargetType("all");
    setTargetCriteria("");
    setScheduleAt("");
  };

  const handleSave = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }

    const criteria: any = {};
    if (targetType === "country" && targetCriteria) {
      criteria.country = targetCriteria;
    } else if (targetType === "referral_count" && targetCriteria) {
      criteria.min_referral_count = parseInt(targetCriteria);
    } else if (targetType === "custom" && targetCriteria) {
      criteria.user_ids = targetCriteria.split(",").map(id => id.trim());
    }

    createNotificationMutation.mutate({
      title,
      body,
      cta_url: ctaUrl || null,
      image_url: imageUrl || null,
      target_type: targetType,
      target_criteria: criteria,
      schedule_at: scheduleAt || null,
      status: "draft",
    });
  };

  const handleSendTest = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    sendTestMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-primary/20 text-primary"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "scheduled":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case "sending":
        return <Badge variant="outline"><Send className="w-3 h-3 mr-1" />Sending</Badge>;
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  const stats = {
    total: notifications?.length || 0,
    sent: notifications?.filter(n => n.status === "sent").length || 0,
    scheduled: notifications?.filter(n => n.status === "scheduled").length || 0,
    totalDelivered: notifications?.reduce((sum, n) => sum + (n.delivered_count || 0), 0) || 0,
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Push Notifications</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Bell className="w-4 h-4" />
                Total Notifications
              </div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Sent</div>
              <div className="text-2xl font-bold text-primary">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Scheduled</div>
              <div className="text-2xl font-bold text-amber-500">{stats.scheduled}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Delivered</div>
              <div className="text-2xl font-bold">{stats.totalDelivered}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="compose" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compose Form */}
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Create Notification</CardTitle>
                  <CardDescription>Compose and send push notifications to users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Templates</Label>
                    <Select onValueChange={(value) => {
                      const template = TEMPLATES.find(t => t.id === value);
                      if (template) applyTemplate(template);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATES.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter notification title"
                      maxLength={60}
                    />
                    <p className="text-xs text-muted-foreground">{title.length}/60 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body">Body *</Label>
                    <Textarea
                      id="body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Enter notification message"
                      rows={4}
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground">{body.length}/160 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cta">CTA URL (optional)</Label>
                    <Input
                      id="cta"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="/dashboard or https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="image">Image URL (optional)</Label>
                    <Input
                      id="image"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
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
                        <SelectItem value="country">By Country</SelectItem>
                        <SelectItem value="referral_count">By Referral Count</SelectItem>
                        <SelectItem value="custom">Custom (User IDs)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {targetType !== "all" && (
                    <div className="space-y-2">
                      <Label htmlFor="criteria">Targeting Criteria</Label>
                      <Input
                        id="criteria"
                        value={targetCriteria}
                        onChange={(e) => setTargetCriteria(e.target.value)}
                        placeholder={
                          targetType === "country" ? "e.g., Nigeria" :
                          targetType === "referral_count" ? "e.g., 5" :
                          "Comma-separated user IDs"
                        }
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="schedule">Schedule (optional)</Label>
                    <Input
                      id="schedule"
                      type="datetime-local"
                      value={scheduleAt}
                      onChange={(e) => setScheduleAt(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSendTest} variant="outline" className="gap-2" disabled={sendTestMutation.isPending}>
                      <Eye className="w-4 h-4" />
                      Send Test
                    </Button>
                    <Button onClick={handleSave} className="gap-2 flex-1" disabled={createNotificationMutation.isPending}>
                      <Send className="w-4 h-4" />
                      Save Draft
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>How your notification will appear</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Mobile Preview */}
                    <div className="border border-border rounded-lg p-4 bg-background">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bell className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-1">
                            {title || "Notification Title"}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {body || "Notification message will appear here..."}
                          </div>
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt="Preview"
                              className="mt-2 rounded border border-border max-h-32 object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                          {ctaUrl && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                {ctaUrl}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Target:</span>
                        <span className="font-medium">
                          {targetType === "all" ? "All Users" :
                           targetType === "country" ? `Country: ${targetCriteria || "Not set"}` :
                           targetType === "referral_count" ? `Referrals ≥ ${targetCriteria || "0"}` :
                           "Custom List"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Schedule:</span>
                        <span className="font-medium">
                          {scheduleAt ? format(new Date(scheduleAt), "MMM d, yyyy HH:mm") : "Send immediately"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Notification History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Date</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Failed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No notifications yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      notifications?.map((notification) => (
                        <TableRow key={notification.id} className="hover:bg-muted/20">
                          <TableCell className="text-sm">
                            {format(new Date(notification.created_at), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="font-medium">{notification.title}</TableCell>
                          <TableCell className="text-sm capitalize">{notification.target_type}</TableCell>
                          <TableCell>{getStatusBadge(notification.status)}</TableCell>
                          <TableCell>{notification.sent_count}</TableCell>
                          <TableCell>{notification.delivered_count}</TableCell>
                          <TableCell className="text-destructive">{notification.failed_count}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle>Delivery Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Date</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Delivered At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationLogs?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No logs yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      notificationLogs?.map((log) => (
                        <TableRow key={log.id} className="hover:bg-muted/20">
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.user_id}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "delivered" ? "default" : log.status === "failed" ? "destructive" : "outline"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.sent_at ? format(new Date(log.sent_at), "HH:mm:ss") : "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.delivered_at ? format(new Date(log.delivered_at), "HH:mm:ss") : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-destructive">{log.error_message || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
