import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AdminSidebar } from './AdminSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import adminLogo from '@/assets/admin-logo.png';

export function AdminLayout() {
  const isAdminAuthenticated = sessionStorage.getItem('admin_auth') === 'true';

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    window.location.href = '/admin/login';
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b bg-card flex items-center px-6 gap-4">
            <SidebarTrigger />
            <img src={adminLogo} alt="RedPay Admin" className="h-10" />
            <h1 className="text-xl font-bold text-foreground">RedPay Admin Dashboard</h1>
            <button
              onClick={handleLogout}
              className="ml-auto text-sm text-muted-foreground hover:text-foreground"
            >
              Logout
            </button>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
