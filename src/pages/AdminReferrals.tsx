import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, Filter, CheckCircle, AlertCircle, Download, TrendingUp, UserCog, XCircle } from "lucide-react";

export default function AdminReferrals() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [creditNotes, setCreditNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["admin-referrals", searchQuery, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("referrals")
        .select(`
          *,
          referrer:users!referrals_referrer_id_fkey(user_id, first_name, last_name, email),
          new_user:users!referrals_new_user_id_fkey(user_id, first_name, last_name, email)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter === "credited") {
        query = query.eq('status', 'confirmed');
      } else if (statusFilter === "pending") {
        query = query.eq('status', 'pending');
      } else if (statusFilter === "manual") {
        query = query.in('status', ['manual']).or('manually_credited.eq.true');
      } else if (statusFilter === "rejected") {
        query = query.eq('status', 'rejected');
      }

      if (searchQuery) {
        query = query.or(
          `referrer_id.ilike.%${searchQuery}%,new_user_id.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const manualCreditMutation = useMutation({
    mutationFn: async ({ referralId, notes }: { referralId: string; notes: string }) => {
      const { data, error } = await supabase.functions.invoke("manual-credit-referral", {
        body: { referralId, notes },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast.success("Referral manually credited successfully");
      setSelectedReferral(null);
      setCreditNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to credit referral");
    },
  });

  const handleManualCredit = () => {
    if (!selectedReferral || !creditNotes.trim()) {
      toast.error("Please provide notes for manual credit");
      return;
    }
    manualCreditMutation.mutate({
      referralId: selectedReferral.id,
      notes: creditNotes,
    });
  };

  const getStatusBadge = (referral: any) => {
    const status = referral.status || 'pending';
    
    if (status === 'confirmed') {
      return <Badge variant="default" className="bg-primary/20 text-primary"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
    }
    if (status === 'manual' || referral.manually_credited) {
      return <Badge variant="secondary" className="bg-accent/20 text-accent-foreground"><CheckCircle className="w-3 h-3 mr-1" />Manual</Badge>;
    }
    if (status === 'rejected') {
      return <Badge variant="destructive" className="bg-red-500/20 text-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    }
    return <Badge variant="outline" className="border-muted-foreground/30"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          admin_user_id: user.id,
          action_type: "user_impersonation",
          target_user_id: userId,
          details: { timestamp: new Date().toISOString() },
        });
      }
      // Store impersonation data in sessionStorage
      sessionStorage.setItem("impersonating", userId);
      window.location.href = "/dashboard";
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to impersonate user");
    },
  });

  const exportToCSV = () => {
    if (!referrals || referrals.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Referrer Name", "Referrer Email", "New User Name", "New User Email", "Amount", "Status", "Notes"];
    const rows = referrals.map(r => [
      format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
      `${r.referrer?.first_name} ${r.referrer?.last_name}`,
      r.referrer?.email,
      `${r.new_user?.first_name} ${r.new_user?.last_name}`,
      r.new_user?.email,
      r.amount_given || "0",
      r.manually_credited ? "Manual" : r.amount_given ? "Auto" : "Pending",
      r.manual_credit_notes || ""
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `referrals_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const totalEarnings = referrals?.reduce((sum, r) => sum + (r.amount_given || 0), 0) || 0;
  const pendingCount = referrals?.filter(r => !r.amount_given && !r.manually_credited).length || 0;
  const todayCount = referrals?.filter(r => {
    const today = new Date();
    const refDate = new Date(r.created_at);
    return refDate.toDateString() === today.toDateString();
  }).length || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Referral Management</h1>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <TrendingUp className="w-4 h-4" />
                Total Referrals
              </div>
              <div className="text-2xl font-bold">{referrals?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Total Earnings</div>
              <div className="text-2xl font-bold">₦{totalEarnings.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Pending Credits</div>
              <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Credits Today</div>
              <div className="text-2xl font-bold text-primary">{todayCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>All Referrals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user ID, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Referrals</SelectItem>
                  <SelectItem value="credited">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="manual">Manual Credits</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border border-border/50 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>New User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading referrals...
                      </TableCell>
                    </TableRow>
                  ) : referrals?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No referrals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    referrals?.map((referral) => (
                      <TableRow key={referral.id} className="hover:bg-muted/20">
                        <TableCell className="text-sm">
                          {format(new Date(referral.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {referral.referrer?.first_name} {referral.referrer?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">{referral.referrer?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {referral.new_user?.first_name} {referral.new_user?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">{referral.new_user?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {referral.amount_given ? `₦${referral.amount_given.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>{getStatusBadge(referral)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {referral.manual_credit_notes || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!referral.amount_given && !referral.manually_credited && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedReferral(referral)}
                                  >
                                    Credit
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Manual Credit Referral</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label>Referrer</Label>
                                      <p className="text-sm text-muted-foreground">
                                        {referral.referrer?.first_name} {referral.referrer?.last_name} ({referral.referrer?.email})
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label>New User</Label>
                                      <p className="text-sm text-muted-foreground">
                                        {referral.new_user?.first_name} {referral.new_user?.last_name} ({referral.new_user?.email})
                                      </p>
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="notes">Credit Notes *</Label>
                                      <Textarea
                                        id="notes"
                                        placeholder="Explain why this referral is being manually credited..."
                                        value={creditNotes}
                                        onChange={(e) => setCreditNotes(e.target.value)}
                                        rows={4}
                                      />
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={handleManualCredit}
                                      disabled={manualCreditMutation.isPending || !creditNotes.trim()}
                                    >
                                      {manualCreditMutation.isPending ? "Processing..." : "Credit ₦5,000"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => impersonateMutation.mutate(referral.referrer_id)}
                              className="gap-1"
                              title="Impersonate referrer"
                            >
                              <UserCog className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
