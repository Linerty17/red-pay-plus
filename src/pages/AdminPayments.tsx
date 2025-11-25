import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, CheckCircle, XCircle, Eye, RefreshCw } from "lucide-react";

export default function AdminPayments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [confirmNotes, setConfirmNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("rpc_purchases")
        .select(`
          *,
          user:users!rpc_purchases_user_id_fkey(user_id, first_name, last_name, email, balance)
        `)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(
          `email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,user_name.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes: string }) => {
      const payment = payments?.find(p => p.id === paymentId);
      if (!payment) throw new Error("Payment not found");

      // Update payment verification status
      const { error: updateError } = await supabase
        .from("rpc_purchases")
        .update({ verified: true })
        .eq("id", paymentId);

      if (updateError) throw updateError;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          admin_user_id: user.id,
          action_type: "payment_confirmed",
          target_user_id: payment.user_id,
          details: { payment_id: paymentId, notes },
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success("Payment confirmed successfully");
      setSelectedPayment(null);
      setConfirmNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to confirm payment");
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, notes }: { paymentId: string; notes: string }) => {
      const payment = payments?.find(p => p.id === paymentId);
      if (!payment) throw new Error("Payment not found");

      // For now, we'll just log the rejection
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("audit_logs").insert({
          admin_user_id: user.id,
          action_type: "payment_rejected",
          target_user_id: payment.user_id,
          details: { payment_id: paymentId, notes },
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success("Payment rejected and logged");
      setSelectedPayment(null);
      setConfirmNotes("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject payment");
    },
  });

  const handleConfirm = () => {
    if (!selectedPayment || !confirmNotes.trim()) {
      toast.error("Please provide notes");
      return;
    }
    confirmPaymentMutation.mutate({
      paymentId: selectedPayment.id,
      notes: confirmNotes,
    });
  };

  const handleReject = () => {
    if (!selectedPayment || !confirmNotes.trim()) {
      toast.error("Please provide rejection reason");
      return;
    }
    rejectPaymentMutation.mutate({
      paymentId: selectedPayment.id,
      notes: confirmNotes,
    });
  };

  const getStatusBadge = (verified: boolean | null) => {
    if (verified === true) {
      return <Badge className="bg-primary/20 text-primary"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
    }
    if (verified === false) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    }
    return <Badge variant="outline" className="border-muted-foreground/30"><RefreshCw className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Payment Management</h1>
        </div>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>RPC Purchase Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, phone, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="border border-border/50 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading payments...
                      </TableCell>
                    </TableRow>
                  ) : payments?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments?.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/20">
                        <TableCell className="text-sm">
                          {format(new Date(payment.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{payment.user_name}</div>
                            <div className="text-xs text-muted-foreground">{payment.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{payment.phone}</TableCell>
                        <TableCell className="text-sm font-mono">{payment.user_unique_id}</TableCell>
                        <TableCell>
                          {payment.proof_image ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewImageUrl(payment.proof_image)}
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">No receipt</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.verified)}</TableCell>
                        <TableCell>
                          {payment.verified === null && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPayment(payment)}
                            >
                              Review
                            </Button>
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
                Total Payments: <span className="font-semibold text-foreground">{payments?.length || 0}</span>
              </div>
              <div>
                Pending: <span className="font-semibold text-foreground">
                  {payments?.filter(p => p.verified === null).length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Dialog */}
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Review Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">User</Label>
                  <p className="text-sm font-medium">{selectedPayment?.user_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedPayment?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="text-sm font-medium">{selectedPayment?.phone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Number</Label>
                  <p className="text-sm font-mono font-medium">{selectedPayment?.user_unique_id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="text-sm font-medium">
                    {selectedPayment && format(new Date(selectedPayment.created_at), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
              </div>

              {selectedPayment?.proof_image && (
                <div>
                  <Label className="text-muted-foreground">Payment Receipt</Label>
                  <img
                    src={selectedPayment.proof_image}
                    alt="Payment receipt"
                    className="mt-2 w-full rounded-lg border border-border"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="notes">Admin Notes *</Label>
                <Textarea
                  id="notes"
                  placeholder="Add notes about this payment review..."
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={confirmPaymentMutation.isPending || rejectPaymentMutation.isPending || !confirmNotes.trim()}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmPaymentMutation.isPending || rejectPaymentMutation.isPending || !confirmNotes.trim()}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Image Viewer Dialog */}
        <Dialog open={!!viewImageUrl} onOpenChange={() => setViewImageUrl(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Payment Receipt</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              {viewImageUrl && (
                <img
                  src={viewImageUrl}
                  alt="Payment receipt"
                  className="w-full rounded-lg border border-border"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
