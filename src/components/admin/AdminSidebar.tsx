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
  ShieldX
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

  useEffect(() => {
    fetchPendingCount();
    fetchBannedCount();
    
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(usersChannel);
    };
  }, []);

  const fetchPendingCount = async () => {
    const { count } = await supabase
      .from('rpc_purchases')
      .select('*', { count: 'exact', head: true })
      .or('status.eq.pending,and(verified.eq.false,status.is.null)');
    
    setPendingCount(count || 0);
  };

  const fetchBannedCount = async () => {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Banned');
    
    setBannedCount(count || 0);
  };

  const isActive = (path: string) => currentPath === path;

  const menuItems = [
    { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'Users', url: '/admin/users', icon: Users },
    { title: 'Banned Users', url: '/admin/banned-users', icon: ShieldX, badge: bannedCount, badgeVariant: 'destructive' },
    { title: 'Referrals', url: '/admin/referrals', icon: Users },
    { title: 'Payments', url: '/admin/payments', icon: CreditCard, highlight: true, badge: pendingCount },
    { title: 'Transactions', url: '/admin/transactions', icon: Receipt },
    { title: 'Send Push', url: '/admin/push', icon: Bell },
    { title: 'Notification Stats', url: '/admin/notifications', icon: Bell },
    { title: 'Audit Logs', url: '/admin/audit', icon: FileText },
    { title: 'Settings', url: '/admin/settings', icon: Settings },
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
