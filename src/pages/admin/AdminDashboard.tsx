import { memo, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/hooks/useAdminData';

// Memoized stat card component
const StatCard = memo(({ title, value, icon: Icon, color, isLoading }: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  isLoading: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      )}
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats();

  const statCards = useMemo(() => [
    { title: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-500' },
    { title: 'Total Referrals', value: stats?.totalReferrals ?? 0, icon: TrendingUp, color: 'text-green-500' },
    { title: 'Pending Payments', value: stats?.pendingPayments ?? 0, icon: CreditCard, color: 'text-yellow-500' },
    { title: 'Total Transactions', value: stats?.totalTransactions ?? 0, icon: Receipt, color: 'text-purple-500' },
  ], [stats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to RedPay Admin Dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
