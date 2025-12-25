import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Edit, Save, X, RefreshCw, Ban, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

const PAGE_SIZE = 25;

interface User {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  balance: number;
  referral_code: string;
  referral_count: number;
  rpc_code: string | null;
  rpc_purchased: boolean;
  status: string;
  created_at: string;
}

interface UserCounts {
  total: number;
  rpcPurchased: number;
  active: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [banAction, setBanAction] = useState<'ban' | 'unban'>('ban');
  const [saving, setSaving] = useState(false);
  const [banning, setBanning] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [counts, setCounts] = useState<UserCounts>({ total: 0, rpcPurchased: 0, active: 0 });
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    country: '',
    balance: 0,
    rpc_code: '',
    rpc_purchased: false,
    status: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([fetchUsers(0, true), fetchCounts()]);
  };

  const fetchCounts = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('rpc_purchased, status');
    
    if (!error && data) {
      setCounts({
        total: data.length,
        rpcPurchased: data.filter(u => u.rpc_purchased).length,
        active: data.filter(u => u.status === 'Active' || !u.status).length,
      });
    }
  };

  const fetchUsers = async (pageNum: number, reset: boolean = false) => {
    try {
      if (reset) setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      
      const newUsers = data || [];
      setUsers(prev => reset ? newUsers : [...prev, ...newUsers]);
      setHasMore(newUsers.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    await fetchUsers(page + 1);
  }, [page]);

  const { loadMoreRef, isLoading: isLoadingMore } = useInfiniteScroll(loadMore, hasMore);

  // Filter users from loaded data (client-side filtering for searched term)
  const filteredUsers = searchTerm
    ? users.filter(user => {
        const term = searchTerm.toLowerCase();
        return (
          user.first_name.toLowerCase().includes(term) ||
          user.last_name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.user_id.toLowerCase().includes(term) ||
          user.phone.includes(term) ||
          (user.rpc_code && user.rpc_code.toLowerCase().includes(term))
        );
      })
    : users;

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      balance: user.balance || 0,
      rpc_code: user.rpc_code || '',
      rpc_purchased: user.rpc_purchased || false,
      status: user.status || 'Active',
    });
    setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;

    setSaving(true);
    
    // Optimistic update
    const updatedUsers = users.map(u => 
      u.id === selectedUser.id 
        ? { 
            ...u, 
            first_name: editForm.first_name,
            last_name: editForm.last_name,
            email: editForm.email,
            phone: editForm.phone,
            country: editForm.country,
            balance: editForm.balance,
            rpc_code: editForm.rpc_code || null,
            rpc_purchased: editForm.rpc_purchased,
            status: editForm.status,
          } 
        : u
    );
    setUsers(updatedUsers);
    setIsEditDialogOpen(false);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          phone: editForm.phone,
          country: editForm.country,
          balance: editForm.balance,
          rpc_code: editForm.rpc_code || null,
          rpc_purchased: editForm.rpc_purchased,
          status: editForm.status,
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Log the admin action in background
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        supabase.from('audit_logs').insert({
          admin_user_id: adminUser.id,
          action_type: 'user_updated',
          target_user_id: selectedUser.user_id,
          details: {
            changes: editForm,
            previous: {
              first_name: selectedUser.first_name,
              last_name: selectedUser.last_name,
              email: selectedUser.email,
              rpc_code: selectedUser.rpc_code,
            },
          },
        });
      }

      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
      // Revert on error
      fetchUsers(0, true);
    } finally {
      setSaving(false);
    }
  };

  const generateRPCCode = () => {
    const code = 'RPC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setEditForm({ ...editForm, rpc_code: code, rpc_purchased: true });
  };

  const openBanDialog = (user: User, action: 'ban' | 'unban') => {
    setUserToBan(user);
    setBanAction(action);
    setIsBanDialogOpen(true);
  };

  const handleBanUser = async () => {
    if (!userToBan) return;

    setBanning(true);
    const newStatus = banAction === 'ban' ? 'Banned' : 'Active';
    
    // Optimistic update - update UI immediately
    const updatedUsers = users.map(u => 
      u.id === userToBan.id ? { ...u, status: newStatus } : u
    );
    setUsers(updatedUsers);
    setIsBanDialogOpen(false);

    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userToBan.id);

      if (error) throw error;

      // Log the admin action in background
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        supabase.from('audit_logs').insert({
          admin_user_id: adminUser.id,
          action_type: banAction === 'ban' ? 'user_banned' : 'user_unbanned',
          target_user_id: userToBan.user_id,
          details: {
            user_email: userToBan.email,
            user_name: `${userToBan.first_name} ${userToBan.last_name}`,
            previous_status: userToBan.status,
            new_status: newStatus,
          },
        });
      }

      toast.success(
        banAction === 'ban' 
          ? `${userToBan.first_name} ${userToBan.last_name} has been banned` 
          : `${userToBan.first_name} ${userToBan.last_name} has been unbanned`
      );
    } catch (error) {
      console.error('Error updating user ban status:', error);
      toast.error('Failed to update user status');
      // Revert on error
      fetchUsers(0, true);
    } finally {
      setBanning(false);
      setUserToBan(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">View and edit user accounts</p>
        </div>
        <Button onClick={() => fetchUsers(0, true)} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">RPC Purchased</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.rpcPurchased}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.active}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, user ID, phone, or RPC code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>RPC Code</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.user_id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground">{user.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.rpc_code ? (
                      <Badge variant="default" className="font-mono">
                        {user.rpc_code}
                      </Badge>
                    ) : (
                      <Badge variant="outline">None</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      ₦{(user.balance || 0).toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.status === 'Active' 
                          ? 'default' 
                          : user.status === 'Banned' 
                            ? 'destructive' 
                            : 'secondary'
                      }
                    >
                      {user.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {user.status === 'Banned' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500 text-green-500 hover:bg-green-500/10"
                          onClick={() => openBanDialog(user, 'unban')}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Unban
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => openBanDialog(user, 'ban')}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Ban
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-muted-foreground">No users found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Infinite scroll loader */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isLoadingMore && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading more...</span>
          </div>
        )}
        {!hasMore && users.length > 0 && !searchTerm && (
          <p className="text-sm text-muted-foreground">All users loaded</p>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={editForm.first_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, first_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={editForm.last_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, last_name: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={editForm.country}
                  onChange={(e) =>
                    setEditForm({ ...editForm, country: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance">Balance (₦)</Label>
              <Input
                id="balance"
                type="number"
                value={editForm.balance}
                onChange={(e) =>
                  setEditForm({ ...editForm, balance: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rpc_code">RPC Code</Label>
              <div className="flex gap-2">
                <Input
                  id="rpc_code"
                  value={editForm.rpc_code}
                  onChange={(e) =>
                    setEditForm({ ...editForm, rpc_code: e.target.value })
                  }
                  placeholder="Enter or generate RPC code"
                />
                <Button type="button" variant="outline" onClick={generateRPCCode}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Setting an RPC code will enable features for this user
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="rpc_purchased"
                checked={editForm.rpc_purchased}
                onChange={(e) =>
                  setEditForm({ ...editForm, rpc_purchased: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="rpc_purchased">RPC Purchased</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ban Confirmation Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {banAction === 'ban' ? (
                <>
                  <ShieldX className="h-5 w-5 text-destructive" />
                  Ban User
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  Unban User
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {banAction === 'ban' 
                ? `Are you sure you want to ban ${userToBan?.first_name} ${userToBan?.last_name}? They will be blocked from accessing the platform until unbanned.`
                : `Are you sure you want to unban ${userToBan?.first_name} ${userToBan?.last_name}? They will regain full access to the platform.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {userToBan && (
            <div className={`p-4 rounded-lg border ${banAction === 'ban' ? 'bg-destructive/10 border-destructive/20' : 'bg-green-500/10 border-green-500/20'}`}>
              <div className="space-y-2 text-sm">
                <p><strong>Name:</strong> {userToBan.first_name} {userToBan.last_name}</p>
                <p><strong>Email:</strong> {userToBan.email}</p>
                <p><strong>User ID:</strong> {userToBan.user_id}</p>
                <p><strong>Current Status:</strong> {userToBan.status || 'Active'}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsBanDialogOpen(false)}
              disabled={banning}
            >
              Cancel
            </Button>
            <Button
              variant={banAction === 'ban' ? 'destructive' : 'default'}
              onClick={handleBanUser}
              disabled={banning}
              className={banAction === 'unban' ? 'bg-green-500 hover:bg-green-600' : ''}
            >
              {banning ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {banAction === 'ban' ? 'Banning...' : 'Unbanning...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {banAction === 'ban' ? <Ban className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                  {banAction === 'ban' ? 'Ban User' : 'Unban User'}
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
