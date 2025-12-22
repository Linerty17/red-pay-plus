import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, X, ExternalLink, Image, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('rpc_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast.error('Failed to load payments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedPayment || !actionType) return;

    try {
      if (actionType === 'approve') {
        const rpcCode = 'RPC2242535';
        
        const { error: updateError } = await supabase
          .from('rpc_purchases')
          .update({ verified: true, rpc_code_issued: rpcCode })
          .eq('id', selectedPayment.id);

        if (updateError) throw updateError;

        const { error: userError } = await supabase
          .from('users')
          .update({ rpc_purchased: true, rpc_code: rpcCode })
          .eq('user_id', selectedPayment.user_id);

        if (userError) throw userError;

        const { data: referralData } = await supabase
          .from('referrals')
          .select('*')
          .eq('new_user_id', selectedPayment.user_id)
          .eq('status', 'pending')
          .maybeSingle();

        if (referralData) {
          await supabase.rpc('confirm_referral', { _new_user_id: selectedPayment.user_id });
        }

        await supabase.from('audit_logs').insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'payment_approved',
          details: { payment_id: selectedPayment.id, rpc_code: rpcCode },
        });

        toast.success('Payment approved successfully');
      } else {
        const { error } = await supabase
          .from('rpc_purchases')
          .update({ verified: false })
          .eq('id', selectedPayment.id);

        if (error) throw error;

        await supabase.from('audit_logs').insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'payment_rejected',
          details: { payment_id: selectedPayment.id },
        });

        toast.success('Payment rejected');
      }

      setSelectedPayment(null);
      setActionType(null);
      fetchPayments();
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    }
  };

  const pendingPayments = payments.filter(p => !p.verified);
  const approvedPayments = payments.filter(p => p.verified);

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
        <h1 className="text-3xl font-bold">Payment Verification</h1>
        <p className="text-muted-foreground">Review and approve RPC purchases</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingPayments.length}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{approvedPayments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments Section */}
      {pendingPayments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            Pending Payments ({pendingPayments.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingPayments.map((payment) => (
              <Card key={payment.id} className="border-amber-500/30">
                <CardContent className="p-4 space-y-4">
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
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">Pending</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{payment.email}</p>
                    <p className="text-sm text-muted-foreground">{payment.phone}</p>
                    <p className="text-xs text-muted-foreground">{new Date(payment.created_at).toLocaleString()}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => { setSelectedPayment(payment); setActionType('approve'); }}>
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => { setSelectedPayment(payment); setActionType('reject'); }}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Payments Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">All Payments</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.user_name}</TableCell>
                  <TableCell>{payment.email}</TableCell>
                  <TableCell>{payment.phone}</TableCell>
                  <TableCell>
                    <Badge variant={payment.verified ? 'default' : 'secondary'}>{payment.verified ? 'Verified' : 'Pending'}</Badge>
                  </TableCell>
                  <TableCell>
                    {payment.proof_image && (
                      <Button variant="ghost" size="sm" onClick={() => setViewingImage(payment.proof_image)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {!payment.verified && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => { setSelectedPayment(payment); setActionType('approve'); }}>
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setSelectedPayment(payment); setActionType('reject'); }}>
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {viewingImage && (
            <div className="max-h-[70vh] overflow-auto">
              <img src={viewingImage} alt="Payment proof" className="w-full h-auto rounded-lg" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingImage(null)}>Close</Button>
            <Button onClick={() => window.open(viewingImage!, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-1" /> Open in New Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}</DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Approve payment from ${selectedPayment?.user_name}? This will generate an RPC code and trigger referral bonus if applicable.`
                : `Reject payment from ${selectedPayment?.user_name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>Cancel</Button>
            <Button variant={actionType === 'approve' ? 'default' : 'destructive'} onClick={handleAction}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}