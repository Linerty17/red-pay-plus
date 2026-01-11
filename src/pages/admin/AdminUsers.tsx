import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Search, Users, Edit, Ban, CheckCircle, Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

interface User {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  status: string | null;
  balance: number | null;
  referral_code: string;
  referral_count: number;
  rpc_purchased: boolean | null;
  rpc_code: string | null;
  ban_reason: string | null;
  created_at: string | null;
}

export default function AdminUsers() {
  const { user: adminUser } = useAdminAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  // Fetch total count
  const fetchTotalCount = useCallback(async () => {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    setTotalCount(count || 0);
  }, []);

  // Direct database fetch with pagination
  const fetchUsers = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users: ' + error.message);
        return;
      }

      if (append) {
        setUsers(prev => [...prev, ...(data || [])]);
      } else {
        setUsers(data || []);
      }
      
      setHasMore((data?.length || 0) === PAGE_SIZE);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(0);
    fetchTotalCount();
  }, [fetchUsers, fetchTotalCount]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchUsers(nextPage, true);
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.phone?.includes(search) ||
      user.user_id?.includes(search)
    );
  });

  const handleEdit = (user: User) => {
    setEditUser({ ...user });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editUser.first_name,
          last_name: editUser.last_name,
          email: editUser.email,
          phone: editUser.phone,
          balance: editUser.balance,
          rpc_code: editUser.rpc_code,
        })
        .eq('id', editUser.id);

      if (error) throw error;

      // Log the action
      if (adminUser) {
        await supabase.from('audit_logs').insert({
          admin_user_id: adminUser.id,
          action_type: 'user_edit',
          target_user_id: editUser.user_id,
          details: { edited_fields: ['first_name', 'last_name', 'email', 'phone', 'balance', 'rpc_code'] }
        });
      }

      toast.success('User updated successfully');
      setEditDialogOpen(false);
      fetchUsers(0);
    } catch (err: any) {
      toast.error('Failed to update user: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openBanDialog = (user: User) => {
    setUserToBan(user);
    setBanReason('');
    setBanDialogOpen(true);
  };

  const handleBanUser = async () => {
    if (!userToBan) return;
    setSaving(true);
    try {
      const newStatus = userToBan.status === 'Banned' ? 'Active' : 'Banned';
      const { error } = await supabase
        .from('users')
        .update({
          status: newStatus,
          ban_reason: newStatus === 'Banned' ? banReason : null
        })
        .eq('id', userToBan.id);

      if (error) throw error;

      // Log the action
      if (adminUser) {
        await supabase.from('audit_logs').insert({
          admin_user_id: adminUser.id,
          action_type: newStatus === 'Banned' ? 'user_banned' : 'user_unbanned',
          target_user_id: userToBan.user_id,
          details: { reason: banReason }
        });
      }

      toast.success(newStatus === 'Banned' ? 'User banned' : 'User unbanned');
      setBanDialogOpen(false);
      fetchUsers(0);
    } catch (err: any) {
      toast.error('Failed to update user status: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
          <p className="text-xs text-muted-foreground">Showing {users.length} of {totalCount}</p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone, or user ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
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
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {search ? 'No users found matching your search' : 'No users found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">{user.user_id}</TableCell>
                      <TableCell>{user.first_name} {user.last_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone}</TableCell>
                      <TableCell>₦{(user.balance || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={user.status === 'Banned' ? 'destructive' : 'default'}>
                          {user.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={user.status === 'Banned' ? 'default' : 'destructive'}
                            onClick={() => openBanDialog(user)}
                          >
                            {user.status === 'Banned' ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Unban
                              </>
                            ) : (
                              <>
                                <Ban className="h-3 w-3 mr-1" />
                                Ban
                              </>
                            )}
                          </Button>
                        </div>
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
      {hasMore && (
        <div className="flex justify-center">
          <Button onClick={loadMore} disabled={loadingMore} variant="outline">
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              `Load More Users (${users.length} of ${totalCount})`
            )}
          </Button>
        </div>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={editUser.first_name}
                    onChange={(e) => setEditUser({ ...editUser, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={editUser.last_name}
                    onChange={(e) => setEditUser({ ...editUser, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={editUser.phone}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>Balance</Label>
                <Input
                  type="number"
                  value={editUser.balance || 0}
                  onChange={(e) => setEditUser({ ...editUser, balance: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>RPC Code</Label>
                <Input
                  value={editUser.rpc_code || ''}
                  onChange={(e) => setEditUser({ ...editUser, rpc_code: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userToBan?.status === 'Banned' ? 'Unban User' : 'Ban User'}
            </DialogTitle>
            <DialogDescription>
              {userToBan?.status === 'Banned'
                ? `Are you sure you want to unban ${userToBan?.first_name} ${userToBan?.last_name}?`
                : `Are you sure you want to ban ${userToBan?.first_name} ${userToBan?.last_name}?`}
            </DialogDescription>
          </DialogHeader>
          {userToBan?.status !== 'Banned' && (
            <div>
              <Label>Ban Reason</Label>
              <Textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter reason for banning this user..."
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>Cancel</Button>
            <Button
              variant={userToBan?.status === 'Banned' ? 'default' : 'destructive'}
              onClick={handleBanUser}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {userToBan?.status === 'Banned' ? 'Unban User' : 'Ban User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
