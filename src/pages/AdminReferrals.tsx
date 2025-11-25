import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Search, Filter, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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
        query = query.not("amount_given", "is", null);
      } else if (statusFilter === "pending") {
        query = query.is("amount_given", null).eq("manually_credited", false);
      } else if (statusFilter === "manual") {
        query = query.eq("manually_credited", true);
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
    if (referral.manually_credited) {
      return <Badge variant="secondary" className="bg-accent/20 text-accent-foreground"><CheckCircle className="w-3 h-3 mr-1" />Manual</Badge>;
    }
    if (referral.amount_given) {
      return <Badge variant="default" className="bg-primary/20 text-primary"><CheckCircle className="w-3 h-3 mr-1" />Auto</Badge>;
    }
    return <Badge variant="outline" className="border-muted-foreground/30"><AlertCircle className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Referral Management</CardTitle>
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
                  <SelectItem value="credited">Auto Credited</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="manual">Manual Credits</SelectItem>
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
                    <TableHead>Action</TableHead>
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
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center text-sm text-muted-foreground pt-4">
              <div>
                Total Referrals: <span className="font-semibold text-foreground">{referrals?.length || 0}</span>
              </div>
              <div>
                Pending: <span className="font-semibold text-foreground">
                  {referrals?.filter(r => !r.amount_given && !r.manually_credited).length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
