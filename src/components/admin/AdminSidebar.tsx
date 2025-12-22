import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Receipt, 
  Bell, 
  FileText,
  LogOut,
  Settings
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
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

const menuItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Referrals', url: '/admin/referrals', icon: Users },
  { title: 'Payments', url: '/admin/payments', icon: CreditCard, highlight: true },
  { title: 'Transactions', url: '/admin/transactions', icon: Receipt },
  { title: 'Send Push', url: '/admin/push', icon: Bell },
  { title: 'Notification Stats', url: '/admin/notifications', icon: Bell },
  { title: 'Audit Logs', url: '/admin/audit', icon: FileText },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const { signOut } = useAdminAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

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
                      className={`hover:bg-muted/50 ${(item as any).highlight ? 'bg-primary/10 border border-primary/30 text-primary font-semibold' : ''}`}
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className={`h-4 w-4 ${(item as any).highlight ? 'text-primary' : ''}`} />
                      {open && <span>{item.title}</span>}
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
