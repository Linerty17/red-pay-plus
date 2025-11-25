import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Eye } from 'lucide-react';

interface AuditLog {
  id: string;
  admin_user_id: string;
  action_type: string;
  target_user_id: string | null;
  details: any;
  created_at: string;
}

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, logs]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast.error('Failed to load audit logs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    if (!searchTerm) {
      setFilteredLogs(logs);
      return;
    }

    const filtered = logs.filter(log =>
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.admin_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.target_user_id && log.target_user_id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredLogs(filtered);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('delete') || action.includes('reject')) return 'destructive';
    if (action.includes('approve') || action.includes('credit')) return 'default';
    return 'secondary';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground">Track all administrative actions</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by action type or user ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action Type</TableHead>
              <TableHead>Admin User ID</TableHead>
              <TableHead>Target User ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant={getActionBadgeColor(log.action_type) as any}>
                    {log.action_type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{log.admin_user_id}</TableCell>
                <TableCell className="font-mono text-xs">{log.target_user_id || '-'}</TableCell>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLog(log)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium">Action Type</p>
              <Badge variant={getActionBadgeColor(selectedLog?.action_type || '') as any}>
                {selectedLog?.action_type}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium">Timestamp</p>
              <p className="text-sm text-muted-foreground">
                {selectedLog && new Date(selectedLog.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Details</p>
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto">
                {JSON.stringify(selectedLog?.details, null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
