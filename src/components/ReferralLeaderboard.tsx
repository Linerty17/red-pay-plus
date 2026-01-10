import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardUser {
  id: string;
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
  const [topUsers, setTopUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, first_name, last_name, referral_count")
        .gt("referral_count", 0)
        .order("referral_count", { ascending: false })
        .limit(3);

      if (error) throw error;
      setTopUsers(data || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to realtime changes on users table for referral_count updates
    const channel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
        },
        () => {
          // Refetch when any user is updated (referral_count might have changed)
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  if (loading) {
    return (
      <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse text-muted-foreground text-sm">Loading leaderboard...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (topUsers.length === 0) {
    return null;
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Top Referrers</h3>
        </div>
        
        <div className="space-y-2">
          {topUsers.map((user, index) => (
            <div
              key={user.id}
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
      </CardContent>
    </Card>
  );
};

export default ReferralLeaderboard;
