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
      const [usersRes, referralsRes, pendingRes, pendingNullRes, transactionsRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('referrals').select('id', { count: 'exact', head: true }),
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).is('status', null),
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
      ]);

      // Pending includes both status='pending' AND status=null
      const pendingPayments = (pendingRes.count || 0) + (pendingNullRes.count || 0);

      return {
        totalUsers: usersRes.count || 0,
        totalReferrals: referralsRes.count || 0,
        pendingPayments,
        totalTransactions: transactionsRes.count || 0,
      };
    },
    staleTime: STALE_TIME.stats,
    refetchOnWindowFocus: false,
  });
}

// Payment counts - optimized with parallel count queries instead of fetching all rows
export function usePaymentCounts() {
  return useQuery({
    queryKey: ['admin', 'paymentCounts'],
    queryFn: async () => {
      const [totalRes, pendingRes, pendingNullRes, approvedRes, rejectedRes, cancelledRes] = await Promise.all([
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }),
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).is('status', null),
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
      ]);
      
      // Pending includes both status='pending' AND status=null
      const pendingCount = (pendingRes.count || 0) + (pendingNullRes.count || 0);
      
      return { 
        total: totalRes.count || 0, 
        pending: pendingCount, 
        approved: approvedRes.count || 0, 
        rejected: rejectedRes.count || 0, 
        cancelled: cancelledRes.count || 0 
      };
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

// Global RPC code - fetches from private_settings (admin-only table)
export function useGlobalRpcCode() {
  return useQuery({
    queryKey: ['admin', 'globalRpcCode'],
    queryFn: async () => {
      // Try rpc_access_code first, then fall back to rpc_code
      const { data, error } = await supabase
        .from('private_settings')
        .select('key, value')
        .in('key', ['rpc_access_code', 'rpc_code']);
      
      if (error) {
        console.error('Error fetching RPC code:', error);
        // If error (likely RLS blocking non-admin), return a placeholder
        return 'RPC44425';
      }
      
      // Prefer rpc_access_code over rpc_code
      const accessCode = data?.find(d => d.key === 'rpc_access_code');
      const legacyCode = data?.find(d => d.key === 'rpc_code');
      
      const code = accessCode?.value || legacyCode?.value || 'RPC44425';
      console.log('Fetched RPC code:', code);
      return code;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
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
          const [usersRes, referralsRes, pendingRes, pendingNullRes, transactionsRes] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('referrals').select('id', { count: 'exact', head: true }),
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).is('status', null),
            supabase.from('transactions').select('id', { count: 'exact', head: true }),
          ]);
          const pendingPayments = (pendingRes.count || 0) + (pendingNullRes.count || 0);
          return {
            totalUsers: usersRes.count || 0,
            totalReferrals: referralsRes.count || 0,
            pendingPayments,
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
          const [totalRes, pendingRes, pendingNullRes, approvedRes, rejectedRes, cancelledRes] = await Promise.all([
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }),
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).is('status', null),
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
            supabase.from('rpc_purchases').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
          ]);
          const pendingCount = (pendingRes.count || 0) + (pendingNullRes.count || 0);
          return { 
            total: totalRes.count || 0, 
            pending: pendingCount, 
            approved: approvedRes.count || 0, 
            rejected: rejectedRes.count || 0, 
            cancelled: cancelledRes.count || 0 
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
    invalidateRpcCode: () => queryClient.invalidateQueries({ queryKey: ['admin', 'globalRpcCode'] }),
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  };
}
