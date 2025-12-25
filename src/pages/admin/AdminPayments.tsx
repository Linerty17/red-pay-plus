import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, X, ExternalLink, Image, Eye, Ban, Search, Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const PAGE_SIZE = 20;

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
  user_status?: string; // Track if user is banned
}

interface PaymentCounts {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'cancel' | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [globalRpcCode, setGlobalRpcCode] = useState<string>('RPC2000122');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [counts, setCounts] = useState<PaymentCounts>({ total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<{ userId: string; userName: string; currentStatus: string } | null>(null);
  const [banning, setBanning] = useState(false);

  useEffect(() => {
    fetchInitialData();
    
    // Subscribe to real-time updates for new payments
    const channel = supabase
      .channel('admin-payments-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rpc_purchases'
        },
        (payload) => {
          const newPayment = payload.new as Payment;
          // Add new payment to the top of the list
          setPayments(prev => [newPayment, ...prev]);
          // Update counts
          setCounts(prev => ({
            ...prev,
            total: prev.total + 1,
            pending: prev.pending + 1
          }));
          // Show notification toast
          toast.success(`New payment from ${newPayment.user_name}`, {
            description: 'A new payment has been submitted for review',
            action: {
              label: 'View',
              onClick: () => setViewingImage(newPayment.proof_image)
            }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rpc_purchases'
        },
        (payload) => {
          const updatedPayment = payload.new as Payment;
          const oldPayment = payload.old as Payment;
          
          // Update the payment in the list
          setPayments(prev => prev.map(p => 
            p.id === updatedPayment.id ? updatedPayment : p
          ));
          
          // Update counts based on status change
          if (oldPayment.status !== updatedPayment.status) {
            setCounts(prev => {
              const newCounts = { ...prev };
              // Decrement old status count
              if (oldPayment.status === 'approved') newCounts.approved--;
              else if (oldPayment.status === 'rejected') newCounts.rejected--;
              else if (oldPayment.status === 'cancelled') newCounts.cancelled--;
              else newCounts.pending--;
              
              // Increment new status count
              if (updatedPayment.status === 'approved') newCounts.approved++;
              else if (updatedPayment.status === 'rejected') newCounts.rejected++;
              else if (updatedPayment.status === 'cancelled') newCounts.cancelled++;
              else newCounts.pending++;
              
              return newCounts;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setPayments([]);
    setPage(0);
    setHasMore(true);
    fetchPayments(0, true);
  }, [statusFilter]);

  const fetchInitialData = async () => {
    await Promise.all([fetchPayments(0, true), fetchGlobalRpcCode(), fetchCounts()]);
  };

  const fetchCounts = async () => {
    const { data, error } = await supabase
      .from('rpc_purchases')
      .select('status', { count: 'exact' });
    
    if (!error && data) {
      const pending = data.filter(p => p.status === 'pending' || !p.status).length;
      const approved = data.filter(p => p.status === 'approved').length;
      const rejected = data.filter(p => p.status === 'rejected').length;
      const cancelled = data.filter(p => p.status === 'cancelled').length;
      setCounts({ total: data.length, pending, approved, rejected, cancelled });
    }
  };

  const fetchGlobalRpcCode = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'rpc_code')
      .maybeSingle();
    
    if (data?.value) {
      setGlobalRpcCode(data.value);
    }
  };

  const fetchPayments = async (pageNum: number, reset: boolean = false) => {
    try {
      let query = supabase
        .from('rpc_purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        if (statusFilter === 'pending') {
          query = query.or('status.eq.pending,status.is.null');
        } else {
          query = query.eq('status', statusFilter);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch user statuses for all payments to filter out banned users
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: usersData } = await supabase
        .from('users')
        .select('user_id, status')
        .in('user_id', userIds);
      
      const userStatusMap = new Map(usersData?.map(u => [u.user_id, u.status]) || []);
      
      const paymentsWithStatus = (data || []).map(p => ({
        ...p,
        user_status: userStatusMap.get(p.user_id) || 'Active'
      }));
      
      setPayments(prev => reset ? paymentsWithStatus : [...prev, ...paymentsWithStatus]);
      setHasMore((data || []).length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error: any) {
      toast.error('Failed to load payments');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    await fetchPayments(page + 1);
  }, [page, statusFilter]);

  const { loadMoreRef, isLoading: isLoadingMore } = useInfiniteScroll(loadMore, hasMore);

  const handleAction = async () => {
    if (!selectedPayment || !actionType) return;

    setProcessingId(selectedPayment.id);
    
    // Optimistic update - update UI immediately
    const updatedPayments = payments.map(p => {
      if (p.id === selectedPayment.id) {
        if (actionType === 'approve') {
          return { ...p, status: 'approved', verified: true, rpc_code_issued: globalRpcCode };
        } else if (actionType === 'reject') {
          return { ...p, status: 'rejected', verified: false };
        } else if (actionType === 'cancel') {
          return { ...p, status: 'cancelled', verified: false, rpc_code_issued: null };
        }
      }
      return p;
    });
    setPayments(updatedPayments);
    setSelectedPayment(null);
    setActionType(null);

    try {
      if (actionType === 'approve') {
        const { error: updateError } = await supabase
          .from('rpc_purchases')
          .update({ verified: true, rpc_code_issued: globalRpcCode, status: 'approved', status_acknowledged: false })
          .eq('id', selectedPayment.id);

        if (updateError) throw updateError;

        const { error: userError } = await supabase
          .from('users')
          .update({ rpc_purchased: true, rpc_code: globalRpcCode })
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
          details: { payment_id: selectedPayment.id, rpc_code: globalRpcCode },
        });

        toast.success('Payment approved successfully');
      } else if (actionType === 'reject') {
        const { error } = await supabase
          .from('rpc_purchases')
          .update({ verified: false, status: 'rejected', status_acknowledged: false })
          .eq('id', selectedPayment.id);

        if (error) throw error;

        await supabase.from('audit_logs').insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'payment_rejected',
          details: { payment_id: selectedPayment.id },
        });

        toast.success('Payment rejected');
      } else if (actionType === 'cancel') {
        const { error } = await supabase
          .from('rpc_purchases')
          .update({ verified: false, status: 'cancelled', status_acknowledged: false, rpc_code_issued: null })
          .eq('id', selectedPayment.id);

        if (error) throw error;

        const { error: userError } = await supabase
          .from('users')
          .update({ rpc_purchased: false, rpc_code: null })
          .eq('user_id', selectedPayment.user_id);

        if (userError) throw userError;

        await supabase.from('audit_logs').insert({
          admin_user_id: (await supabase.auth.getUser()).data.user?.id,
          action_type: 'payment_cancelled',
          details: { payment_id: selectedPayment.id },
        });

        toast.success('Payment cancelled - User notified');
      }
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
      // Revert on error
      fetchPayments(0, true);
    } finally {
      setProcessingId(null);
    }
  };

  // Filter out banned users from pending payments - they should appear in banned users page only
  const pendingPayments = payments.filter(p => 
    (p.status === 'pending' || (!p.verified && !p.status)) && p.user_status !== 'Banned'
  );
  const approvedPayments = payments.filter(p => p.status === 'approved');
  const rejectedPayments = payments.filter(p => p.status === 'rejected');
  const cancelledPayments = payments.filter(p => p.status === 'cancelled');

  // Filtered payments based on search and status filter
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = searchQuery === '' || 
        payment.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.phone.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'pending' && (payment.status === 'pending' || (!payment.verified && !payment.status))) ||
        (statusFilter === 'approved' && payment.status === 'approved') ||
        (statusFilter === 'rejected' && payment.status === 'rejected') ||
        (statusFilter === 'cancelled' && payment.status === 'cancelled');
      
      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, statusFilter]);

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
        <p className="text-muted-foreground">Review and approve RPC purchases (RPC Code: {globalRpcCode})</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{counts.pending}</div>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{counts.approved}</div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{counts.rejected}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-500">Cancelled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{counts.cancelled}</div>
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
                    <Button 
                      size="sm" 
                      className="flex-1" 
                      onClick={() => { setSelectedPayment(payment); setActionType('approve'); }}
                      disabled={processingId === payment.id}
                    >
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="flex-1" 
                      onClick={() => { setSelectedPayment(payment); setActionType('reject'); }}
                      disabled={processingId === payment.id}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setUserToBan({
                        userId: payment.user_id,
                        userName: payment.user_name,
                        currentStatus: 'Active'
                      });
                      setBanDialogOpen(true);
                    }}
                  >
                    <Ban className="h-4 w-4 mr-1" /> Ban User
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* All Payments Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <h2 className="text-xl font-semibold">All Payments</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {filteredPayments.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            No payments found matching your search criteria.
          </div>
        ) : (
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
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.user_name}</TableCell>
                  <TableCell>{payment.email}</TableCell>
                  <TableCell>{payment.phone}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={payment.status === 'approved' ? 'default' : payment.status === 'rejected' ? 'destructive' : payment.status === 'cancelled' ? 'outline' : 'secondary'}
                      className={payment.status === 'cancelled' ? 'border-orange-500 text-orange-500' : ''}
                    >
                      {payment.status === 'approved' ? 'Approved' : payment.status === 'rejected' ? 'Rejected' : payment.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                    </Badge>
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
                    {(payment.status === 'pending' || (!payment.verified && !payment.status)) && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => { setSelectedPayment(payment); setActionType('approve'); }}
                          disabled={processingId === payment.id}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => { setSelectedPayment(payment); setActionType('reject'); }}
                          disabled={processingId === payment.id}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                    {payment.status === 'approved' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-orange-500 text-orange-500 hover:bg-orange-500/10" 
                        onClick={() => { setSelectedPayment(payment); setActionType('cancel'); }}
                        disabled={processingId === payment.id}
                      >
                        <Ban className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        )}
        
        {/* Infinite scroll loader */}
        <div ref={loadMoreRef} className="py-4 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading more...</span>
            </div>
          )}
          {!hasMore && payments.length > 0 && (
            <p className="text-sm text-muted-foreground">All payments loaded</p>
          )}
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
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Payment' : actionType === 'reject' ? 'Reject Payment' : 'Cancel Payment'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? `Approve payment from ${selectedPayment?.user_name}? This will issue RPC code "${globalRpcCode}" and trigger referral bonus if applicable.`
                : actionType === 'reject' 
                ? `Reject payment from ${selectedPayment?.user_name}?`
                : `Cancel payment from ${selectedPayment?.user_name}? This will revoke their RPC access and notify them to purchase again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>Close</Button>
            <Button 
              variant={actionType === 'approve' ? 'default' : 'destructive'} 
              onClick={handleAction}
              className={actionType === 'cancel' ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to ban <strong>{userToBan?.userName}</strong>? They will no longer be able to access their account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={banning}
              onClick={async () => {
                if (!userToBan) return;
                setBanning(true);
                try {
                  const { error } = await supabase
                    .from('users')
                    .update({ status: 'Banned' })
                    .eq('user_id', userToBan.userId);

                  if (error) throw error;

                  const { data: { user: adminUser } } = await supabase.auth.getUser();
                  if (adminUser) {
                    await supabase.from('audit_logs').insert({
                      admin_user_id: adminUser.id,
                      action_type: 'user_banned',
                      target_user_id: userToBan.userId,
                      details: { user_name: userToBan.userName, reason: 'Banned from payments page' },
                    });
                  }

                  // Update the user_status in payments list so banned user disappears from pending
                  setPayments(prev => prev.map(p => 
                    p.user_id === userToBan.userId 
                      ? { ...p, user_status: 'Banned' } 
                      : p
                  ));

                  toast.success(`${userToBan.userName} has been banned`);
                  setBanDialogOpen(false);
                } catch (error) {
                  toast.error('Failed to ban user');
                  console.error(error);
                } finally {
                  setBanning(false);
                }
              }}
            >
              {banning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}