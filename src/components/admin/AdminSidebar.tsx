import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Receipt, 
  Bell, 
  FileText,
  LogOut,
  Settings,
  ShieldX,
  CheckCircle
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { signOut } = useAdminAuth();
  const currentPath = location.pathname;
  const [pendingCount, setPendingCount] = useState(0);
  const [bannedCount, setBannedCount] = useState(0);
  const [bannedPendingCount, setBannedPendingCount] = useState(0);

  useEffect(() => {
    fetchPendingCount();
    fetchBannedCount();
    fetchBannedPendingCount();
    // Subscribe to real-time updates for payments
    const paymentsChannel = supabase
      .channel('admin-pending-payments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rpc_purchases'
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    // Subscribe to real-time updates for banned users
    const usersChannel = supabase
      .channel('admin-banned-users-count')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        () => {
          fetchBannedCount();
          fetchBannedPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const fetchPendingCount = async () => {
    // Get banned user IDs first
    const { data: bannedUsers } = await supabase
      .from('users')
      .select('user_id')
      .eq('status', 'Banned');
    
    const bannedUserIds = bannedUsers?.map(u => u.user_id) || [];
    
    // Count pending payments excluding banned users
    let query = supabase
      .from('rpc_purchases')
      .select('*', { count: 'exact', head: true })
      .or('status.eq.pending,status.is.null');
    
    if (bannedUserIds.length > 0) {
      // This is a workaround - we'll fetch and filter
      const { data } = await supabase
        .from('rpc_purchases')
        .select('user_id')
        .or('status.eq.pending,status.is.null');
      
      const nonBannedCount = (data || []).filter(p => !bannedUserIds.includes(p.user_id)).length;
      setPendingCount(nonBannedCount);
    } else {
      const { count } = await query;
      setPendingCount(count || 0);
    }
  };

  const fetchBannedCount = async () => {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Banned');
    
    setBannedCount(count || 0);
  };

  const fetchBannedPendingCount = async () => {
    // Get banned user IDs
    const { data: bannedUsers } = await supabase
      .from('users')
      .select('user_id')
      .eq('status', 'Banned');
    
    if (!bannedUsers || bannedUsers.length === 0) {
      setBannedPendingCount(0);
      return;
    }
    
    const bannedUserIds = bannedUsers.map(u => u.user_id);
    
    // Count pending payments from banned users
    const { count } = await supabase
      .from('rpc_purchases')
      .select('*', { count: 'exact', head: true })
      .in('user_id', bannedUserIds)
      .or('status.eq.pending,status.is.null');
    
    setBannedPendingCount(count || 0);
  };

  const isActive = (path: string) => currentPath === path;

  const menuItems = [
    { title: 'Dashboard', url: '/ifechukwu/dashboard', icon: LayoutDashboard },
    { title: 'Users', url: '/ifechukwu/users', icon: Users },
    { title: 'Banned Users', url: '/ifechukwu/banned-users', icon: ShieldX, badge: bannedCount, badgeVariant: 'destructive' },
    { title: 'Banned Pending', url: '/ifechukwu/banned-pending', icon: ShieldX, badge: bannedPendingCount, badgeVariant: 'destructive' },
    { title: 'Referrals', url: '/ifechukwu/referrals', icon: Users },
    { title: 'Payments', url: '/ifechukwu/payments', icon: CreditCard, highlight: true, badge: pendingCount },
    { title: 'Approved RPC', url: '/ifechukwu/approved-rpc', icon: CheckCircle },
    { title: 'Transactions', url: '/ifechukwu/transactions', icon: Receipt },
    { title: 'Send Push', url: '/ifechukwu/push', icon: Bell },
    { title: 'Notification Stats', url: '/ifechukwu/notifications', icon: Bell },
    { title: 'Audit Logs', url: '/ifechukwu/audit', icon: FileText },
    { title: 'Settings', url: '/ifechukwu/settings', icon: Settings },
  ];

  return (
    <Sidebar className={open ? 'w-60' : 'w-14'} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Admin Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                      className={`hover:bg-muted/50 relative ${item.highlight ? 'bg-primary/10 border border-primary/30 text-primary font-semibold' : ''}`}
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className={`h-4 w-4 ${item.highlight ? 'text-primary' : ''}`} />
                      {open && <span>{item.title}</span>}
                      {item.badge && item.badge > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs flex items-center justify-center animate-pulse"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <div className="mt-auto p-4">
          <Button 
            onClick={signOut} 
            variant="outline" 
            className="w-full"
            size={open ? "default" : "icon"}
          >
            <LogOut className="h-4 w-4" />
            {open && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
