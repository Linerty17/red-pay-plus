import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, Download, Loader2 } from 'lucide-react';

const PAGE_SIZE = 50;

interface Transaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: string;
  transaction_id: string;
  created_at: string;
  balance_before: number;
  balance_after: number;
  user_email?: string;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset on search change
  useEffect(() => {
    setTransactions([]);
    setPage(0);
    setHasMore(true);
    fetchTransactions(0, true);
  }, [debouncedSearch]);

  const fetchTransactions = async (pageNum: number, reset = false) => {
    try {
      if (reset) setLoading(true);
      else setIsLoadingMore(true);

      let query = supabase
        .from('transactions')
        .select(`*, user:users!transactions_user_id_fkey(email)`)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (debouncedSearch) {
        query = query.or(`transaction_id.ilike.%${debouncedSearch}%,title.ilike.%${debouncedSearch}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = (data || []).map((txn: any) => ({
        ...txn,
        user_email: txn.user?.email,
      }));

      setTransactions(prev => reset ? formatted : [...prev, ...formatted]);
      setHasMore(formatted.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error: any) {
      toast.error('Failed to load transactions');
      console.error(error);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchTransactions(page + 1);
    }
  }, [page, isLoadingMore, hasMore]);

  // Filter for search (client-side for already loaded data)
  const filteredTransactions = useMemo(() => {
    if (!debouncedSearch) return transactions;
    return transactions.filter(txn =>
      txn.user_email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      txn.transaction_id.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      txn.title.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [transactions, debouncedSearch]);

  const virtualizer = useVirtualizer({
    count: filteredTransactions.length,
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

  const exportToCSV = () => {
    const csv = [
      ['User Email', 'Title', 'Type', 'Amount', 'Balance Before', 'Balance After', 'Transaction ID', 'Date'],
      ...filteredTransactions.map(txn => [
        txn.user_email || '',
        txn.title,
        txn.type,
        txn.amount,
        txn.balance_before,
        txn.balance_after,
        txn.transaction_id,
        new Date(txn.created_at).toLocaleString(),
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString()}.csv`;
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
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">
          View all platform transactions ({filteredTransactions.length.toLocaleString()} loaded)
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, transaction ID, or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="w-[180px]">User</TableHead>
              <TableHead className="w-[200px]">Title</TableHead>
              <TableHead className="w-[80px]">Type</TableHead>
              <TableHead className="w-[120px]">Amount</TableHead>
              <TableHead className="w-[120px]">Before</TableHead>
              <TableHead className="w-[120px]">After</TableHead>
              <TableHead className="w-[180px]">Transaction ID</TableHead>
              <TableHead className="w-[160px]">Date</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
        
        <div
          ref={parentRef}
          onScroll={handleScroll}
          className="overflow-auto"
          style={{ height: '600px' }}
        >
          {filteredTransactions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No transactions found
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
                    const txn = filteredTransactions[virtualRow.index];
                    return (
                      <TableRow
                        key={txn.id}
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
                        <TableCell className="w-[180px]">{txn.user_email}</TableCell>
                        <TableCell className="w-[200px]">{txn.title}</TableCell>
                        <TableCell className="w-[80px]">
                          <Badge variant={txn.type === 'credit' ? 'default' : 'secondary'}>
                            {txn.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`w-[120px] ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.type === 'credit' ? '+' : '-'}₦{txn.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="w-[120px]">₦{txn.balance_before.toLocaleString()}</TableCell>
                        <TableCell className="w-[120px]">₦{txn.balance_after.toLocaleString()}</TableCell>
                        <TableCell className="w-[180px] font-mono text-xs">{txn.transaction_id}</TableCell>
                        <TableCell className="w-[160px]">{new Date(txn.created_at).toLocaleString()}</TableCell>
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
    </div>
  );
}
