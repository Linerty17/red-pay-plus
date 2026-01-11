import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, ShieldX, Loader2, CheckCircle, AlertTriangle, XCircle, Mail } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { format } from 'date-fns';

interface ApprovedPurchase {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  phone: string;
  rpc_code_issued: string | null;
  status: string;
  created_at: string;
}

// Fullscreen revoke animation component
const RevokeAnimation = ({ userName, onComplete }: { userName: string; onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
      <div className="text-center space-y-6">
        {/* Animated X circle */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-30" />
          <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <XCircle className="w-20 h-20 text-red-500 animate-scale-in" />
          </div>
        </div>
        
        {/* Text */}
        <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-3xl font-bold text-white">RPC Code Revoked</h2>
          <p className="text-xl text-red-400">{userName}</p>
        </div>
        
        {/* Email notification indicator */}
        <div className="flex items-center justify-center gap-2 text-green-400 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Mail className="w-5 h-5" />
          <span>Email notification sent</span>
        </div>
        
        {/* Loading bar */}
        <div className="w-64 h-1 bg-gray-700 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-red-500 rounded-full animate-[progress_3s_linear]" 
               style={{ animation: 'progress 3s linear forwards' }} />
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default function AdminApprovedRPC() {
  const { user: adminUser } = useAdminAuth();
  const [purchases, setPurchases] = useState<ApprovedPurchase[]>([]);
  const [searchResults, setSearchResults] = useState<ApprovedPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [purchaseToRevoke, setPurchaseToRevoke] = useState<ApprovedPurchase | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [showRevokeAnimation, setShowRevokeAnimation] = useState(false);
  const [revokedUserName, setRevokedUserName] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  // Fetch total count
  const fetchTotalCount = useCallback(async () => {
    const { count } = await supabase
      .from('rpc_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');
    setTotalCount(count || 0);
  }, []);

  // Direct database fetch with pagination
  const fetchPurchases = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await supabase
        .from('rpc_purchases')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching purchases:', error);
        toast.error('Failed to load approved purchases: ' + error.message);
        return;
      }

      if (append) {
        setPurchases(prev => [...prev, ...(data || [])]);
      } else {
        setPurchases(data || []);
      }
      
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load approved purchases');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Search database directly
  const searchPurchases = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('rpc_purchases')
        .select('*')
        .eq('status', 'approved')
        .or(`user_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,user_id.ilike.%${query}%,rpc_code_issued.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        searchPurchases(search);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchPurchases]);

  useEffect(() => {
    fetchPurchases(0);
    fetchTotalCount();

    // Real-time subscription
    const channel = supabase
      .channel('admin-approved-rpc')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rpc_purchases'
        },
        (payload) => {
          const updated = payload.new as ApprovedPurchase;
          if (updated.status === 'approved') {
            // Add to list if newly approved
            setPurchases(prev => {
              if (prev.some(p => p.id === updated.id)) {
                return prev.map(p => p.id === updated.id ? updated : p);
              }
              return [updated, ...prev];
            });
          } else {
            // Remove from list if status changed from approved
            setPurchases(prev => prev.filter(p => p.id !== updated.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPurchases, fetchTotalCount]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPurchases(nextPage, true);
  };

  // Show search results when searching, otherwise show paginated purchases
  const displayPurchases = search.trim() ? searchResults : purchases;

  const openRevokeDialog = (purchase: ApprovedPurchase) => {
    setPurchaseToRevoke(purchase);
    setRevokeDialogOpen(true);
  };

  const sendRevokeEmail = async (email: string, userName: string, rpcCode: string | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.functions.invoke('send-email', {
        body: {
          email,
          subject: 'RPC Code Revoked - RedPay',
          message: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">RPC Code Revoked</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 16px;">Dear <strong>${userName}</strong>,</p>
                <p style="color: #374151; font-size: 16px;">We regret to inform you that your RPC code has been revoked.</p>
                ${rpcCode ? `<p style="color: #6b7280; font-size: 14px;">Revoked Code: <code style="background: #fee2e2; padding: 2px 8px; border-radius: 4px; color: #dc2626;">${rpcCode}</code></p>` : ''}
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="color: #991b1b; margin: 0; font-size: 14px;">
                    <strong>What this means:</strong><br/>
                    Your RPC purchase has been cancelled. If you believe this was done in error, please contact our support team immediately.
                  </p>
                </div>
                <p style="color: #374151; font-size: 16px;">If you wish to purchase RPC again, please visit our app and submit a new payment.</p>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Best regards,<br/><strong>RedPay Team</strong></p>
              </div>
            </div>
          `
        }
      });
      console.log('Revoke email sent to:', email);
    } catch (err) {
      console.error('Failed to send revoke email:', err);
    }
  };

  const handleRevoke = async () => {
    if (!purchaseToRevoke) return;
    setRevoking(true);

    try {
      // Update purchase status to cancelled
      const { error: purchaseError } = await supabase
        .from('rpc_purchases')
        .update({ 
          status: 'cancelled', 
          verified: false, 
          rpc_code_issued: null,
          status_acknowledged: false 
        })
        .eq('id', purchaseToRevoke.id);

      if (purchaseError) throw purchaseError;

      // Remove RPC code from user
      const { error: userError } = await supabase
        .from('users')
        .update({ rpc_purchased: false, rpc_code: null })
        .eq('user_id', purchaseToRevoke.user_id);

      if (userError) throw userError;

      // Log the action
      if (adminUser) {
        await supabase.from('audit_logs').insert({
          admin_user_id: adminUser.id,
          action_type: 'rpc_revoked',
          target_user_id: purchaseToRevoke.user_id,
          details: { 
            purchase_id: purchaseToRevoke.id, 
            user_name: purchaseToRevoke.user_name,
            revoked_code: purchaseToRevoke.rpc_code_issued 
          }
        });
      }

      // Send email notification
      await sendRevokeEmail(
        purchaseToRevoke.email, 
        purchaseToRevoke.user_name, 
        purchaseToRevoke.rpc_code_issued
      );

      // Remove from local state
      setPurchases(prev => prev.filter(p => p.id !== purchaseToRevoke.id));
      setTotalCount(prev => prev - 1);
      
      // Show fullscreen animation
      setRevokedUserName(purchaseToRevoke.user_name);
      setRevokeDialogOpen(false);
      setShowRevokeAnimation(true);
    } catch (err: any) {
      toast.error('Failed to revoke RPC: ' + err.message);
    } finally {
      setRevoking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading approved purchases...</span>
      </div>
    );
  }

  return (
    <>
      {/* Fullscreen Revoke Animation */}
      {showRevokeAnimation && (
        <RevokeAnimation 
          userName={revokedUserName} 
          onComplete={() => {
            setShowRevokeAnimation(false);
            toast.success('RPC code revoked and email notification sent');
          }} 
        />
      )}

      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CheckCircle className="h-8 w-8 text-green-500" />
          Approved RPC Purchases
        </h1>
        <p className="text-muted-foreground">Manage approved purchases and revoke RPC codes if needed</p>
      </div>

      {/* Stats Card */}
      <Card className="border-green-500/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-green-600">Total Approved</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{totalCount}</div>
          <p className="text-xs text-muted-foreground">Showing {purchases.length} of {totalCount}</p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, user ID or RPC code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {search.trim() && (
        <p className="text-sm text-muted-foreground">
          Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
          <Button variant="link" className="p-0 h-auto ml-2" onClick={() => setSearch('')}>
            Clear search
          </Button>
        </p>
      )}

      {/* Purchases Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>RPC Code</TableHead>
                  <TableHead>Approved Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPurchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searching ? 'Searching...' : search ? 'No approved purchases found matching your search' : 'No approved purchases found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-mono text-xs">{purchase.user_id}</TableCell>
                      <TableCell>{purchase.user_name}</TableCell>
                      <TableCell>{purchase.email}</TableCell>
                      <TableCell>{purchase.phone}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-500">
                          {purchase.rpc_code_issued || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {purchase.created_at ? format(new Date(purchase.created_at), 'MMM d, yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openRevokeDialog(purchase)}
                        >
                          <ShieldX className="h-3 w-3 mr-1" />
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Load More Button */}
      {hasMore && !search.trim() && (
        <div className="flex justify-center">
          <Button onClick={loadMore} disabled={loadingMore} variant="outline">
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              `Load More (${purchases.length} of ${totalCount})`
            )}
          </Button>
        </div>
      )}

      {/* Revoke Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Revoke RPC Code
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the RPC code from <strong>{purchaseToRevoke?.user_name}</strong>?
              <br /><br />
              This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove their RPC code ({purchaseToRevoke?.rpc_code_issued})</li>
                <li>Mark their purchase as cancelled</li>
                <li>They will need to purchase again to get a new code</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldX className="h-4 w-4 mr-2" />}
              Revoke RPC Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
