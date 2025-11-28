import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, X, ExternalLink } from 'lucide-react';

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
        // Generate RPC code
        const rpcCode = 'RPC2242535';
        
        // Update payment
        const { error: updateError } = await supabase
          .from('rpc_purchases')
          .update({ 
            verified: true, 
            rpc_code_issued: rpcCode 
          })
          .eq('id', selectedPayment.id);

        if (updateError) throw updateError;

        // Update user's rpc_purchased status
        const { error: userError } = await supabase
          .from('users')
          .update({ 
            rpc_purchased: true,
            rpc_code: rpcCode
          })
          .eq('user_id', selectedPayment.user_id);

        if (userError) throw userError;

        // Check if this user was referred and trigger referral confirmation
        const { data: referralData } = await supabase
          .from('referrals')
          .select('*')
          .eq('new_user_id', selectedPayment.user_id)
          .eq('status', 'pending')
          .maybeSingle();

        if (referralData) {
          await supabase.rpc('confirm_referral', {
            _new_user_id: selectedPayment.user_id,
          });
        }

        // Log action
        await supabase
          .from('audit_logs')
          .insert({
            admin_user_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: 'payment_approved',
            details: { payment_id: selectedPayment.id, rpc_code: rpcCode },
          });

        toast.success('Payment approved successfully');
      } else {
        // Reject payment
        const { error } = await supabase
          .from('rpc_purchases')
          .update({ verified: false })
          .eq('id', selectedPayment.id);

        if (error) throw error;

        await supabase
          .from('audit_logs')
          .insert({
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
                  <Badge variant={payment.verified ? 'default' : 'secondary'}>
                    {payment.verified ? 'Verified' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {payment.proof_image && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(payment.proof_image!, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
                <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {!payment.verified && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setActionType('approve');
                        }}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setActionType('reject');
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Approve payment from ${selectedPayment?.user_name}? This will generate an RPC code and trigger referral bonus if applicable.`
                : `Reject payment from ${selectedPayment?.user_name}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>Cancel</Button>
            <Button 
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleAction}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
