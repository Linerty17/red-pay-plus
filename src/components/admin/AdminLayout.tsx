import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AdminSidebar } from './AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import adminLogo from '@/assets/admin-logo.png';

export function AdminLayout() {
  const { isAdmin, loading, signOut } = useAdminAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center px-6 gap-4">
            <SidebarTrigger />
            <img src={adminLogo} alt="RedPay Admin" className="h-10" />
            <h1 className="text-xl font-bold text-foreground">RedPay Admin Dashboard</h1>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
