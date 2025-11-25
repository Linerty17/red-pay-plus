import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, Download } from 'lucide-react';

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
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [searchTerm, transactions]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          user:users!transactions_user_id_fkey(email)
        `)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;

      const formatted = data.map((txn: any) => ({
        ...txn,
        user_email: txn.user?.email,
      }));

      setTransactions(formatted);
    } catch (error: any) {
      toast.error('Failed to load transactions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    if (!searchTerm) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter(txn =>
      txn.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    setFilteredTransactions(filtered);
  };

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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">View all platform transactions</p>
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance Before</TableHead>
              <TableHead>Balance After</TableHead>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((txn) => (
              <TableRow key={txn.id}>
                <TableCell>{txn.user_email}</TableCell>
                <TableCell>{txn.title}</TableCell>
                <TableCell>
                  <Badge variant={txn.type === 'credit' ? 'default' : 'secondary'}>
                    {txn.type}
                  </Badge>
                </TableCell>
                <TableCell className={txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                  {txn.type === 'credit' ? '+' : '-'}₦{txn.amount.toLocaleString()}
                </TableCell>
                <TableCell>₦{txn.balance_before.toLocaleString()}</TableCell>
                <TableCell>₦{txn.balance_after.toLocaleString()}</TableCell>
                <TableCell className="font-mono text-xs">{txn.transaction_id}</TableCell>
                <TableCell>{new Date(txn.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
