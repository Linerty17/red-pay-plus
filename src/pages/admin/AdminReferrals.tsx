import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Users, Loader2, Download } from 'lucide-react';
import { format } from 'date-fns';

interface Referral {
  id: string;
  referrer_id: string;
  new_user_id: string;
  status: string | null;
  amount_given: number | null;
  created_at: string | null;
  confirmed_at: string | null;
  manually_credited: boolean | null;
  referrer_email?: string;
  new_user_email?: string;
}

export default function AdminReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [searchResults, setSearchResults] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  // Fetch total count
  const fetchTotalCount = useCallback(async () => {
    let query = supabase.from('referrals').select('*', { count: 'exact', head: true });
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { count } = await query;
    setTotalCount(count || 0);
  }, [statusFilter]);

  // Fetch user emails for display
  const fetchUserEmails = async (referralsList: Referral[]) => {
    const userIds = [...new Set([
      ...referralsList.map(r => r.referrer_id),
      ...referralsList.map(r => r.new_user_id)
    ])];

    if (userIds.length === 0) return referralsList;

    const { data: users } = await supabase
      .from('users')
      .select('user_id, email')
      .in('user_id', userIds);

    const emailMap = new Map(users?.map(u => [u.user_id, u.email]) || []);

    return referralsList.map(r => ({
      ...r,
      referrer_email: emailMap.get(r.referrer_id) || r.referrer_id,
      new_user_email: emailMap.get(r.new_user_id) || r.new_user_id
    }));
  };

  // Direct database fetch with pagination
  const fetchReferrals = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      let query = supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching referrals:', error);
        toast.error('Failed to load referrals: ' + error.message);
        return;
      }

      const enrichedData = await fetchUserEmails(data || []);

      if (append) {
        setReferrals(prev => [...prev, ...enrichedData]);
      } else {
        setReferrals(enrichedData);
      }
      
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter]);

  // Search database directly
  const searchReferrals = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      // First get user IDs that match the search
      const { data: matchingUsers } = await supabase
        .from('users')
        .select('user_id')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,user_id.ilike.%${query}%`)
        .limit(50);

      const userIds = matchingUsers?.map(u => u.user_id) || [];

      if (userIds.length === 0) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      // Now get referrals where referrer or new_user matches
      let dbQuery = supabase
        .from('referrals')
        .select('*')
        .or(`referrer_id.in.(${userIds.join(',')}),new_user_id.in.(${userIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (statusFilter !== 'all') {
        dbQuery = dbQuery.eq('status', statusFilter);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      const enrichedData = await fetchUserEmails(data || []);
      setSearchResults(enrichedData);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        searchReferrals(search);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchReferrals]);

  useEffect(() => {
    setPage(0);
    fetchReferrals(0);
    fetchTotalCount();
  }, [fetchReferrals, fetchTotalCount, statusFilter]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReferrals(nextPage, true);
  };

  // Show search results when searching, otherwise show paginated referrals
  const displayReferrals = search.trim() ? searchResults : referrals;

  // Export to CSV
  const exportToCSV = () => {
    const csvData = displayReferrals.map(r => ({
      'Referrer Email': r.referrer_email || r.referrer_id,
      'New User Email': r.new_user_email || r.new_user_id,
      'Status': r.status || 'pending',
      'Amount': r.amount_given || 0,
      'Date': r.created_at ? format(new Date(r.created_at), 'yyyy-MM-dd HH:mm') : ''
    }));

    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status || 'Pending'}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading referrals...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
          <p className="text-xs text-muted-foreground">Showing {referrals.length} of {totalCount}</p>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type email, name or user ID to search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {search.trim() && (
        <p className="text-sm text-muted-foreground">
          Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{search}"
          <Button variant="link" className="p-0 h-auto ml-2" onClick={() => setSearch('')}>
            Clear search
          </Button>
        </p>
      )}

      {/* Referrals Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>New User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayReferrals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {searching ? 'Searching...' : search ? 'No referrals found matching your search' : 'No referrals found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayReferrals.map((referral) => (
                    <TableRow key={referral.id}>
                      <TableCell className="text-sm">{referral.referrer_email}</TableCell>
                      <TableCell className="text-sm">{referral.new_user_email}</TableCell>
                      <TableCell>{getStatusBadge(referral.status)}</TableCell>
                      <TableCell>₦{(referral.amount_given || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {referral.created_at ? format(new Date(referral.created_at), 'MMM d, yyyy') : '-'}
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
              `Load More Referrals (${referrals.length} of ${totalCount})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
