import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShieldX, ShieldCheck, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface BannedUser {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  status: string;
  created_at: string;
  balance: number;
}

export default function AdminBannedUsers() {
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [userToUnban, setUserToUnban] = useState<BannedUser | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchBannedUsers();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin-banned-users')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          const updatedUser = payload.new as BannedUser;
          if (updatedUser.status === 'Banned') {
            // Add to banned users list if not already there
            setBannedUsers(prev => {
              if (prev.some(u => u.user_id === updatedUser.user_id)) {
                return prev;
              }
              return [updatedUser, ...prev];
            });
          } else {
            // Remove from banned users list
            setBannedUsers(prev => prev.filter(u => u.user_id !== updatedUser.user_id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBannedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('status', 'Banned')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBannedUsers(data || []);
    } catch (error) {
      toast.error('Failed to load banned users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!userToUnban) return;
    setProcessing(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'Active' })
        .eq('user_id', userToUnban.user_id);

      if (error) throw error;

      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await supabase.from('audit_logs').insert({
          admin_user_id: adminUser.id,
          action_type: 'user_unbanned',
          target_user_id: userToUnban.user_id,
          details: { 
            user_name: `${userToUnban.first_name} ${userToUnban.last_name}`,
            email: userToUnban.email 
          },
        });
      }

      setBannedUsers(prev => prev.filter(u => u.user_id !== userToUnban.user_id));
      toast.success(`${userToUnban.first_name} ${userToUnban.last_name} has been unbanned`);
      setUnbanDialogOpen(false);
    } catch (error) {
      toast.error('Failed to unban user');
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = bannedUsers.filter(user => {
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || 
           user.email.toLowerCase().includes(query) ||
           user.phone.includes(query);
  });

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
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShieldX className="h-8 w-8 text-destructive" />
          Banned Users
        </h1>
        <p className="text-muted-foreground">Manage banned users and restore access</p>
      </div>

      {/* Stats Card */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-destructive">Total Banned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">{bannedUsers.length}</div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Banned Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          {searchQuery ? 'No banned users match your search.' : 'No banned users.'}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phone}</TableCell>
                  <TableCell>{user.country}</TableCell>
                  <TableCell>₦{user.balance?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Banned</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                      onClick={() => {
                        setUserToUnban(user);
                        setUnbanDialogOpen(true);
                      }}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Unban
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Unban Dialog */}
      <Dialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Unban User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to unban <strong>{userToUnban?.first_name} {userToUnban?.last_name}</strong>? 
              They will be able to access their account again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnbanDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleUnban}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
              Unban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
