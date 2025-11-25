import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [filteredReferrals, setFilteredReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [actionType, setActionType] = useState<'credit' | 'revoke' | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchReferrals();
  }, []);

  useEffect(() => {
    filterReferrals();
  }, [searchTerm, statusFilter, referrals]);

  const fetchReferrals = async () => {
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referrer:users!referrals_referrer_id_fkey(email),
          new_user:users!referrals_new_user_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = data.map((ref: any) => ({
        ...ref,
        referrer_email: ref.referrer?.email,
        new_user_email: ref.new_user?.email,
      }));

      setReferrals(formatted);
    } catch (error: any) {
      toast.error('Failed to load referrals');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterReferrals = () => {
    let filtered = referrals;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(r =>
        r.referrer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.new_user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.referrer_id.includes(searchTerm) ||
        r.new_user_id.includes(searchTerm)
      );
    }

    setFilteredReferrals(filtered);
  };

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
      fetchReferrals();
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Management</h1>
        <p className="text-muted-foreground">View and manage all referrals</p>
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referrer</TableHead>
              <TableHead>New User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReferrals.map((referral) => (
              <TableRow key={referral.id}>
                <TableCell>{referral.referrer_email}</TableCell>
                <TableCell>{referral.new_user_email}</TableCell>
                <TableCell>
                  <Badge variant={referral.status === 'confirmed' ? 'default' : 'secondary'}>
                    {referral.status}
                  </Badge>
                </TableCell>
                <TableCell>₦{referral.amount_given?.toLocaleString() || 0}</TableCell>
                <TableCell>{new Date(referral.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
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
            ))}
          </TableBody>
        </Table>
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
