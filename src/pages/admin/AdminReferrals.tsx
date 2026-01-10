import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Download, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 50;

interface Referral {
  id: string;
  referrer_id: string;
  new_user_id: string;
  status: string;
  amount_given: number;
  created_at: string;
  manual_credit_notes: string | null;
  referrer_email?: string;
  new_user_email?: string;
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [actionType, setActionType] = useState<'credit' | 'revoke' | null>(null);
  const [notes, setNotes] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset on filter change
  useEffect(() => {
    setReferrals([]);
    setPage(0);
    setHasMore(true);
    fetchReferrals(0, true);
  }, [statusFilter]);

  const fetchReferrals = async (pageNum: number, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setIsLoadingMore(true);

      let query = supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user emails for referrers and new users
      const referrerIds = [...new Set((data || []).map(r => r.referrer_id))];
      const newUserIds = [...new Set((data || []).map(r => r.new_user_id))];
      const allUserIds = [...new Set([...referrerIds, ...newUserIds])];
      
      let emailMap = new Map<string, string>();
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, email')
          .in('user_id', allUserIds);
        
        emailMap = new Map(usersData?.map(u => [u.user_id, u.email]) || []);
      }

      const formatted = (data || []).map((ref: any) => ({
        ...ref,
        referrer_email: emailMap.get(ref.referrer_id) || 'Unknown',
        new_user_email: emailMap.get(ref.new_user_id) || 'Unknown',
      }));

      setReferrals(prev => reset ? formatted : [...prev, ...formatted]);
      setHasMore(formatted.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error: any) {
      toast.error('Failed to load referrals');
      console.error(error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchReferrals(page + 1);
    }
  }, [page, isLoadingMore, hasMore]);

  // Client-side search filter
  const filteredReferrals = useMemo(() => {
    if (!debouncedSearch) return referrals;
    return referrals.filter(r =>
      r.referrer_email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.new_user_email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      r.referrer_id.includes(debouncedSearch) ||
      r.new_user_id.includes(debouncedSearch)
    );
  }, [referrals, debouncedSearch]);

  const virtualizer = useVirtualizer({
    count: filteredReferrals.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const handleScroll = useCallback(() => {
    if (!parentRef.current || isLoadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      loadMore();
    }
  }, [loadMore, isLoadingMore, hasMore]);

  const handleManualAction = async () => {
    if (!selectedReferral) return;

    try {
      if (actionType === 'credit') {
        const { error } = await supabase.rpc('confirm_referral', {
          _new_user_id: selectedReferral.new_user_id,
          _amount: 5000,
        });

        if (error) throw error;

        await supabase
          .from('audit_logs')
          .insert({
            admin_user_id: (await supabase.auth.getUser()).data.user?.id,
            action_type: 'manual_referral_credit',
            details: { referral_id: selectedReferral.id, notes },
          });

        toast.success('Referral credited successfully');
      }

      setSelectedReferral(null);
      setActionType(null);
      setNotes('');
      fetchReferrals(0, true);
    } catch (error: any) {
      toast.error(error.message || 'Action failed');
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Referrer Email', 'New User Email', 'Status', 'Amount', 'Date', 'Notes'],
      ...filteredReferrals.map(r => [
        r.referrer_email || '',
        r.new_user_email || '',
        r.status || '',
        r.amount_given || 0,
        new Date(r.created_at).toLocaleDateString(),
        r.manual_credit_notes || '',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Management</h1>
        <p className="text-muted-foreground">
          View and manage all referrals ({filteredReferrals.length.toLocaleString()} loaded)
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[200px]">Referrer</TableHead>
              <TableHead className="w-[200px]">New User</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Amount</TableHead>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
        </Table>

        <div
          ref={parentRef}
          onScroll={handleScroll}
          className="overflow-auto"
          style={{ height: '600px' }}
        >
          {filteredReferrals.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No referrals found
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              <Table>
                <TableBody>
                  {items.map((virtualRow) => {
                    const referral = filteredReferrals[virtualRow.index];
                    return (
                      <TableRow
                        key={referral.id}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          display: 'table-row',
                        }}
                      >
                        <TableCell className="w-[200px]">{referral.referrer_email}</TableCell>
                        <TableCell className="w-[200px]">{referral.new_user_email}</TableCell>
                        <TableCell className="w-[100px]">
                          <Badge variant={referral.status === 'confirmed' ? 'default' : 'secondary'}>
                            {referral.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[100px]">₦{referral.amount_given?.toLocaleString() || 0}</TableCell>
                        <TableCell className="w-[120px]">{new Date(referral.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="w-[120px]">
                          {referral.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedReferral(referral);
                                setActionType('credit');
                              }}
                            >
                              Manual Credit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!selectedReferral} onOpenChange={() => setSelectedReferral(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Credit Confirmation</DialogTitle>
            <DialogDescription>
              Credit ₦5,000 to {selectedReferral?.referrer_email} for referring {selectedReferral?.new_user_email}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Add notes for audit log..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReferral(null)}>Cancel</Button>
            <Button onClick={handleManualAction}>Confirm Credit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
