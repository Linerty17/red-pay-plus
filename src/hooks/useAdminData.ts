import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Stale times for different data types
const STALE_TIME = {
  stats: 30 * 1000, // 30 seconds for dashboard stats
  users: 60 * 1000, // 1 minute for user lists
  payments: 30 * 1000, // 30 seconds for payments (needs fresher data)
  referrals: 60 * 1000,
  transactions: 60 * 1000,
  notifications: 60 * 1000,
  settings: 5 * 60 * 1000, // 5 minutes for settings
};

// Dashboard stats
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const [usersRes, referralsRes, paymentsRes, transactionsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('referrals').select('id', { count: 'exact', head: true }),
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('verified', false),
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalUsers: usersRes.count || 0,
        totalReferrals: referralsRes.count || 0,
        pendingPayments: paymentsRes.count || 0,
        totalTransactions: transactionsRes.count || 0,
      };
    },
    staleTime: STALE_TIME.stats,
    refetchOnWindowFocus: false,
  });
}

// Payment counts
export function usePaymentCounts() {
  return useQuery({
    queryKey: ['admin', 'paymentCounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rpc_purchases')
        .select('status');
      
      if (error) throw error;
      
      const pending = data.filter(p => p.status === 'pending' || !p.status).length;
      const approved = data.filter(p => p.status === 'approved').length;
      const rejected = data.filter(p => p.status === 'rejected').length;
      const cancelled = data.filter(p => p.status === 'cancelled').length;
      
      return { total: data.length, pending, approved, rejected, cancelled };
    },
    staleTime: STALE_TIME.payments,
    refetchOnWindowFocus: false,
  });
}

// User counts
export function useUserCounts() {
  return useQuery({
    queryKey: ['admin', 'userCounts'],
    queryFn: async () => {
      const [totalRes, rpcRes, activeRes] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('rpc_purchased', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).or('status.eq.Active,status.is.null'),
      ]);

      return {
        total: totalRes.count || 0,
        rpcPurchased: rpcRes.count || 0,
        active: activeRes.count || 0,
      };
    },
    staleTime: STALE_TIME.users,
    refetchOnWindowFocus: false,
  });
}

// Global RPC code
export function useGlobalRpcCode() {
  return useQuery({
    queryKey: ['admin', 'globalRpcCode'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'rpc_code')
        .maybeSingle();
      
      return data?.value || 'RPC2000122';
    },
    staleTime: STALE_TIME.settings,
    refetchOnWindowFocus: false,
  });
}

// Prefetch admin data
export function usePrefetchAdminData() {
  const queryClient = useQueryClient();

  const prefetch = async () => {
    // Prefetch all common admin data in parallel
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ['admin', 'stats'],
        queryFn: async () => {
          const [usersRes, referralsRes, paymentsRes, transactionsRes] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('referrals').select('id', { count: 'exact', head: true }),
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('verified', false),
            supabase.from('transactions').select('id', { count: 'exact', head: true }),
          ]);
          return {
            totalUsers: usersRes.count || 0,
            totalReferrals: referralsRes.count || 0,
            pendingPayments: paymentsRes.count || 0,
            totalTransactions: transactionsRes.count || 0,
          };
        },
        staleTime: STALE_TIME.stats,
      }),
      queryClient.prefetchQuery({
        queryKey: ['admin', 'userCounts'],
        queryFn: async () => {
          const [totalRes, rpcRes, activeRes] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('rpc_purchased', true),
            supabase.from('users').select('*', { count: 'exact', head: true }).or('status.eq.Active,status.is.null'),
          ]);
          return {
            total: totalRes.count || 0,
            rpcPurchased: rpcRes.count || 0,
            active: activeRes.count || 0,
          };
        },
        staleTime: STALE_TIME.users,
      }),
      queryClient.prefetchQuery({
        queryKey: ['admin', 'paymentCounts'],
        queryFn: async () => {
          const { data } = await supabase.from('rpc_purchases').select('status');
          if (!data) return { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
          return {
            total: data.length,
            pending: data.filter(p => p.status === 'pending' || !p.status).length,
            approved: data.filter(p => p.status === 'approved').length,
            rejected: data.filter(p => p.status === 'rejected').length,
            cancelled: data.filter(p => p.status === 'cancelled').length,
          };
        },
        staleTime: STALE_TIME.payments,
      }),
    ]);
  };

  return { prefetch };
}

// Invalidate admin caches
export function useInvalidateAdminData() {
  const queryClient = useQueryClient();

  return {
    invalidateStats: () => queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
    invalidatePayments: () => queryClient.invalidateQueries({ queryKey: ['admin', 'paymentCounts'] }),
    invalidateUsers: () => queryClient.invalidateQueries({ queryKey: ['admin', 'userCounts'] }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  };
}
