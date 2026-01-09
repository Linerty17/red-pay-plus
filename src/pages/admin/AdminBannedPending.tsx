import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, X, Eye, Ban, Image, Loader2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGlobalRpcCode, useInvalidateAdminData } from '@/hooks/useAdminData';

interface Payment {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  phone: string;
  proof_image: string | null;
  verified: boolean;
  rpc_code_issued: string | null;
  created_at: string;
  status?: string;
  ban_reason?: string;
}

export default function AdminBannedPending() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'reject_all' | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  const { data: globalRpcCode = 'RPC2000122' } = useGlobalRpcCode();
  const { invalidatePayments, invalidateStats } = useInvalidateAdminData();

  useEffect(() => {
    fetchBannedPendingPayments();
  }, []);

  const fetchBannedPendingPayments = async () => {
    try {
      // Get all banned user IDs
      const { data: bannedUsers } = await supabase
        .from('users')
        .select('user_id, ban_reason')
        .eq('status', 'Banned');

      if (!bannedUsers || bannedUsers.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      const bannedUserIds = bannedUsers.map(u => u.user_id);
      const banReasonMap = new Map(bannedUsers.map(u => [u.user_id, u.ban_reason]));

      // Get pending payments from banned users
      const { data, error } = await supabase
        .from('rpc_purchases')
        .select('*')
        .in('user_id', bannedUserIds)
        .or('status.eq.pending,status.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const paymentsWithBanReason = (data || []).map(p => ({
        ...p,
        ban_reason: banReasonMap.get(p.user_id) || 'No reason provided'
      }));

      setPayments(paymentsWithBanReason);
    } catch (error: any) {
      toast.error('Failed to load banned users pending payments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedPayment || !actionType) return;

    setProcessingId(selectedPayment.id);

    try {
      if (actionType === 'approve') {
        await supabase
          .from('rpc_purchases')
          .update({ verified: true, rpc_code_issued: globalRpcCode, status: 'approved', status_acknowledged: false })
          .eq('id', selectedPayment.id);

        await supabase
          .from('users')
          .update({ rpc_purchased: true, rpc_code: globalRpcCode })
          .eq('user_id', selectedPayment.user_id);

        toast.success('Payment approved');
      } else if (actionType === 'reject') {
        await supabase
          .from('rpc_purchases')
          .update({ verified: false, status: 'rejected', status_acknowledged: false })
          .eq('id', selectedPayment.id);

        toast.success('Payment rejected');
      }

      // Remove from list
      setPayments(prev => prev.filter(p => p.id !== selectedPayment.id));
      invalidatePayments();
      invalidateStats();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    } finally {
      setProcessingId(null);
      setSelectedPayment(null);
      setActionType(null);
    }
  };

  const handleRejectAll = async () => {
    setProcessingAll(true);

    try {
      const paymentIds = payments.map(p => p.id);
      
      const { error } = await supabase
        .from('rpc_purchases')
        .update({ verified: false, status: 'rejected', status_acknowledged: false })
        .in('id', paymentIds);

      if (error) throw error;

      // Log audit
      const user = await supabase.auth.getUser();
      await supabase.from('audit_logs').insert({
        admin_user_id: user.data.user?.id,
        action_type: 'bulk_reject_banned_payments',
        details: { count: paymentIds.length, payment_ids: paymentIds },
      });

      toast.success(`Rejected ${paymentIds.length} payments from banned users`);
      setPayments([]);
      invalidatePayments();
      invalidateStats();
    } catch (error: any) {
      toast.error(error.message || 'Bulk reject failed');
    } finally {
      setProcessingAll(false);
      setActionType(null);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Ban className="w-8 h-8 text-destructive" />
            Banned Users - Pending Payments
          </h1>
          <p className="text-muted-foreground">
            {payments.length} pending payment(s) from banned users
          </p>
        </div>
        
        {payments.length > 0 && (
          <Button 
            variant="destructive" 
            onClick={() => setActionType('reject_all')}
            disabled={processingAll}
          >
            {processingAll ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Reject All ({payments.length})
          </Button>
        )}
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Ban className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No pending payments from banned users</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payments.map((payment) => (
            <Card key={payment.id} className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                  <Ban className="w-4 h-4" />
                  Banned User
                </div>
                
                {payment.ban_reason && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    Reason: {payment.ban_reason}
                  </p>
                )}

                {payment.proof_image ? (
                  <div 
                    className="relative h-40 bg-muted rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => setViewingImage(payment.proof_image)}
                  >
                    <img src={payment.proof_image} alt="Payment proof" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="h-40 bg-muted rounded-lg flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{payment.user_name}</span>
                    <Badge variant="destructive">Banned</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{payment.email}</p>
                  <p className="text-xs text-muted-foreground">{payment.phone}</p>
                  <p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleString()}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => { setSelectedPayment(payment); setActionType('approve'); }}
                    disabled={processingId === payment.id}
                  >
                    {processingId === payment.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </>
                    )}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { setSelectedPayment(payment); setActionType('reject'); }}
                    disabled={processingId === payment.id}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <img src={viewingImage} alt="Payment proof" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={actionType === 'approve' || actionType === 'reject'} onOpenChange={() => { setSelectedPayment(null); setActionType(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? `Approve payment from banned user "${selectedPayment?.user_name}"? They will receive RPC code: ${globalRpcCode}`
                : `Reject payment from banned user "${selectedPayment?.user_name}"?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedPayment(null); setActionType(null); }}>
              Cancel
            </Button>
            <Button 
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
            >
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject All Confirmation Dialog */}
      <Dialog open={actionType === 'reject_all'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject All Payments</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject all {payments.length} pending payments from banned users? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectAll} disabled={processingAll}>
              {processingAll ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Reject All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
