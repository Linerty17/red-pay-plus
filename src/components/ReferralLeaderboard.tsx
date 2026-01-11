import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Trophy, Medal, User, Hash, Search, X, RefreshCw } from "lucide-react";
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return topUsers;
    const query = searchQuery.toLowerCase();
    return topUsers.filter(user => 
      user.first_name.toLowerCase().includes(query) ||
      user.last_name.toLowerCase().includes(query)
    );
  }, [topUsers, searchQuery]);

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
        // For all time, use the database function to get leaderboard data
        const { data, error } = await supabase
          .rpc('get_leaderboard');

        if (error) throw error;
        setTopUsers(data || []);

        // Get user's rank for all time
        if (profile?.user_id && data) {
          const userIndex = data.findIndex((u: LeaderboardUser) => u.user_id === profile.user_id);
          setUserRank(userIndex >= 0 ? userIndex + 1 : null);
          setUserCount(profile.referral_count || 0);
        }
      } else {
        // For time-filtered, use the database function
        const { data, error } = await supabase
          .rpc('get_leaderboard_filtered', { date_from: dateFilter!.toISOString() });

        if (error) throw error;
        
        // Convert bigint referral_count to number
        const leaderboard = (data || []).map((u: any) => ({
          user_id: u.user_id,
          first_name: u.first_name,
          last_name: u.last_name,
          referral_count: Number(u.referral_count)
        }));
        
        setTopUsers(leaderboard);

        // Get user's rank for filtered period
        if (profile?.user_id) {
          const userIndex = leaderboard.findIndex((u: LeaderboardUser) => u.user_id === profile.user_id);
          setUserRank(userIndex >= 0 ? userIndex + 1 : null);
          setUserCount(leaderboard.find((u: LeaderboardUser) => u.user_id === profile.user_id)?.referral_count || 0);
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
      // Small delay to allow animation to complete smoothly
      setTimeout(() => setIsAnimating(false), 50);
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
        return "bg-card/40 border-border/50";
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
        return <Hash className="w-4 h-4 text-muted-foreground" />;
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
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setIsAnimating(true);
              fetchLeaderboard();
            }}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Time Filter Buttons */}
        <div className="flex gap-1 p-1 bg-secondary/30 rounded-lg">
          {filterButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={timeFilter === btn.value ? "default" : "ghost"}
              size="sm"
              className={`flex-1 text-xs transition-all duration-200 ${
                timeFilter === btn.value 
                  ? "shadow-md" 
                  : "hover:bg-secondary/50"
              }`}
              onClick={() => {
                if (btn.value !== timeFilter) {
                  setIsAnimating(true);
                  setTimeFilter(btn.value);
                }
              }}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 text-sm bg-secondary/20 border-border/50 focus:bg-secondary/30 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div 
          ref={contentRef}
          className={`transition-all duration-300 ease-out ${
            isAnimating ? "opacity-0 translate-y-2 scale-[0.98]" : "opacity-100 translate-y-0 scale-100"
          }`}
          onTransitionEnd={() => {
            if (isAnimating && !loading) {
              setIsAnimating(false);
            }
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-pulse text-muted-foreground text-sm">Loading leaderboard...</div>
            </div>
          ) : (
            <>
              {topUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm animate-fade-in">
                  No referrals {timeFilter !== "all" ? "in this period" : "yet"}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm animate-fade-in">
                  No users match "{searchQuery}"
                </div>
              ) : (
                <ScrollArea className="h-[300px] pr-2">
                  <div className="space-y-2">
                    {filteredUsers.map((user) => {
                      // Get original rank from full list
                      const originalRank = topUsers.findIndex(u => u.user_id === user.user_id) + 1;
                      return (
                        <div
                          key={user.user_id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${getRankStyle(originalRank)}`}
                          style={{ 
                            animationDelay: `${Math.min(filteredUsers.indexOf(user), 10) * 50}ms`,
                            animation: !isAnimating ? `fade-in 0.3s ease-out ${Math.min(filteredUsers.indexOf(user), 10) * 50}ms both` : 'none'
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background/50 transition-transform duration-200 hover:scale-110">
                              {getRankIcon(originalRank)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {maskName(user.first_name, user.last_name)}
                              </p>
                              <p className="text-xs text-muted-foreground">Rank #{originalRank}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">{user.referral_count}</p>
                            <p className="text-xs text-muted-foreground">referrals</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Your Rank Section */}
              {profile && (
                <div 
                  className="pt-2 border-t border-border/50"
                  style={{ 
                    animation: !isAnimating ? `fade-in 0.3s ease-out ${topUsers.length * 100 + 100}ms both` : 'none'
                  }}
                >
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30 transition-all duration-200 hover:bg-primary/15 hover:scale-[1.01]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 transition-transform duration-200 hover:scale-110">
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
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralLeaderboard;
