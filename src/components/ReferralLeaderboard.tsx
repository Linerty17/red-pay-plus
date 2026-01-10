import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type TimeFilter = "all" | "month" | "week";

interface LeaderboardUser {
  user_id: string;
  first_name: string;
  last_name: string;
  referral_count: number;
}

const maskName = (firstName: string, lastName: string): string => {
  const maskString = (str: string) => {
    if (str.length <= 1) return str + "***";
    return str.charAt(0) + "*".repeat(Math.min(str.length - 1, 4)) + str.charAt(str.length - 1);
  };
  return `${maskString(firstName)} ${maskString(lastName)}`;
};

const ReferralLeaderboard = () => {
  const { profile } = useAuth();
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const getDateFilter = (filter: TimeFilter): Date | null => {
    const now = new Date();
    switch (filter) {
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo;
      case "month":
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return monthAgo;
      default:
        return null;
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter(timeFilter);

      if (timeFilter === "all") {
        // For all time, use the referral_count from users table
        const { data, error } = await supabase
          .from("users")
          .select("user_id, first_name, last_name, referral_count")
          .gt("referral_count", 0)
          .order("referral_count", { ascending: false })
          .limit(3);

        if (error) throw error;
        setTopUsers(data || []);

        // Get user's rank for all time
        if (profile?.user_id) {
          const { data: allUsers, error: rankError } = await supabase
            .from("users")
            .select("user_id, referral_count")
            .gt("referral_count", 0)
            .order("referral_count", { ascending: false });

          if (!rankError && allUsers) {
            const userIndex = allUsers.findIndex(u => u.user_id === profile.user_id);
            setUserRank(userIndex >= 0 ? userIndex + 1 : null);
            setUserCount(profile.referral_count || 0);
          }
        }
      } else {
        // For time-filtered, query referrals table
        const { data: referrals, error } = await supabase
          .from("referrals")
          .select("referrer_id, created_at")
          .gte("created_at", dateFilter!.toISOString())
          .eq("status", "confirmed");

        if (error) throw error;

        // Count referrals per user
        const referralCounts: Record<string, number> = {};
        referrals?.forEach(ref => {
          referralCounts[ref.referrer_id] = (referralCounts[ref.referrer_id] || 0) + 1;
        });

        // Get user details for top referrers
        const sortedReferrers = Object.entries(referralCounts)
          .sort(([, a], [, b]) => b - a);

        const topReferrerIds = sortedReferrers.slice(0, 3).map(([id]) => id);

        if (topReferrerIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("user_id, first_name, last_name")
            .in("user_id", topReferrerIds);

          if (!usersError && users) {
            const leaderboard = topReferrerIds.map(id => {
              const user = users.find(u => u.user_id === id);
              return {
                user_id: id,
                first_name: user?.first_name || "Unknown",
                last_name: user?.last_name || "User",
                referral_count: referralCounts[id],
              };
            });
            setTopUsers(leaderboard);
          }
        } else {
          setTopUsers([]);
        }

        // Get user's rank for filtered period
        if (profile?.user_id) {
          const userIndex = sortedReferrers.findIndex(([id]) => id === profile.user_id);
          setUserRank(userIndex >= 0 ? userIndex + 1 : null);
          setUserCount(referralCounts[profile.user_id] || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "referrals",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeFilter, profile?.user_id]);

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/40";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/40";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/40";
      default:
        return "bg-card/60 border-border";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const filterButtons: { label: string; value: TimeFilter }[] = [
    { label: "All Time", value: "all" },
    { label: "This Month", value: "month" },
    { label: "This Week", value: "week" },
  ];

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Top Referrers</h3>
          </div>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={timeFilter === btn.value ? "default" : "ghost"}
              size="sm"
              className={`flex-1 text-xs ${
                timeFilter === btn.value ? "" : "hover:bg-secondary/50"
              }`}
              onClick={() => setTimeFilter(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse text-muted-foreground text-sm">Loading leaderboard...</div>
          </div>
        ) : (
          <>
            {topUsers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No referrals {timeFilter !== "all" ? "in this period" : "yet"}
              </div>
            ) : (
              <div className="space-y-2">
                {topUsers.map((user, index) => (
                  <div
                    key={user.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${getRankStyle(index + 1)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50">
                        {getRankIcon(index + 1)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {maskName(user.first_name, user.last_name)}
                        </p>
                        <p className="text-xs text-muted-foreground">Rank #{index + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{user.referral_count}</p>
                      <p className="text-xs text-muted-foreground">referrals</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Your Rank Section */}
            {profile && (
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Your Rank</p>
                      <p className="text-xs text-muted-foreground">
                        {userRank ? `#${userRank}` : "Not ranked yet"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{userCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeFilter === "all" ? "total" : timeFilter === "month" ? "this month" : "this week"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralLeaderboard;
