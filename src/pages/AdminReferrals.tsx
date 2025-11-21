import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Search, RefreshCw, DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ReferralWithDetails {
  id: string;
  referrer_id: string;
  new_user_id: string;
  amount_given: number;
  created_at: string;
  manually_credited: boolean;
  manual_credit_notes: string | null;
  referrer_email?: string;
  new_user_email?: string;
}

const AdminReferrals = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [referrals, setReferrals] = useState<ReferralWithDetails[]>([]);
  const [filteredReferrals, setFilteredReferrals] = useState<ReferralWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [creditingId, setCreditingId] = useState<string | null>(null);
  const [creditNotes, setCreditNotes] = useState("");

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error || !data) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      fetchReferrals();
    } catch (error) {
      console.error("Admin check error:", error);
      navigate("/dashboard");
    }
  };

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const { data: referralsData, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch user details for each referral
      const enrichedReferrals = await Promise.all(
        (referralsData || []).map(async (ref) => {
          const { data: referrer } = await supabase
            .from("users")
            .select("email")
            .eq("user_id", ref.referrer_id)
            .single();

          const { data: newUser } = await supabase
            .from("users")
            .select("email")
            .eq("user_id", ref.new_user_id)
            .single();

          return {
            ...ref,
            referrer_email: referrer?.email,
            new_user_email: newUser?.email,
          };
        })
      );

      setReferrals(enrichedReferrals);
      setFilteredReferrals(enrichedReferrals);
    } catch (error: any) {
      console.error("Error fetching referrals:", error);
      toast.error("Failed to load referrals");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = referrals.filter(
      (ref) =>
        ref.referrer_email?.toLowerCase().includes(term.toLowerCase()) ||
        ref.new_user_email?.toLowerCase().includes(term.toLowerCase()) ||
        ref.referrer_id.toLowerCase().includes(term.toLowerCase()) ||
        ref.new_user_id.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredReferrals(filtered);
  };

  const handleManualCredit = async (referral: ReferralWithDetails) => {
    setCreditingId(referral.id);
    try {
      // Call the credit-referral edge function
      const { data, error } = await supabase.functions.invoke("credit-referral", {
        body: {
          new_user_id: referral.new_user_id,
          new_user_email: referral.new_user_email,
          referral_code: "", // We'll look up by new_user_id who referred them
          force_credit: true, // Special flag for manual admin override
        },
      });

      if (error) throw error;

      // Mark as manually credited
      const { error: updateError } = await supabase
        .from("referrals")
        .update({
          manually_credited: true,
          manual_credit_notes: creditNotes || "Manually credited by admin",
        })
        .eq("id", referral.id);

      if (updateError) throw updateError;

      toast.success("Referral credited successfully!");
      setCreditNotes("");
      fetchReferrals();
    } catch (error: any) {
      console.error("Error crediting referral:", error);
      toast.error(error.message || "Failed to credit referral");
    } finally {
      setCreditingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const stats = {
    total: referrals.length,
    credited: referrals.filter((r) => r.amount_given > 0).length,
    manual: referrals.filter((r) => r.manually_credited).length,
    totalAmount: referrals.reduce((sum, r) => sum + (r.amount_given || 0), 0),
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Admin Referrals Panel</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Credited</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.credited}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Manual Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{stats.manual}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₦{stats.totalAmount.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or user ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={fetchReferrals} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referrals Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>New User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No referrals found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReferrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{referral.referrer_email}</span>
                            <span className="text-xs text-muted-foreground">
                              {referral.referrer_id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{referral.new_user_email}</span>
                            <span className="text-xs text-muted-foreground">
                              {referral.new_user_id.slice(0, 8)}...
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>₦{(referral.amount_given || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {referral.amount_given > 0 ? (
                              <Badge variant="default" className="w-fit">
                                Credited
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="w-fit">
                                Not Credited
                              </Badge>
                            )}
                            {referral.manually_credited && (
                              <Badge variant="secondary" className="w-fit">
                                Manual
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {!referral.amount_given || referral.amount_given === 0 ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={creditingId === referral.id}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  {creditingId === referral.id ? "Processing..." : "Credit Now"}
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Manual Credit Referral</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div className="space-y-2">
                                    <Label>Referrer</Label>
                                    <p className="text-sm">{referral.referrer_email}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>New User</Label>
                                    <p className="text-sm">{referral.new_user_email}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="notes">Notes (Optional)</Label>
                                    <Textarea
                                      id="notes"
                                      placeholder="Reason for manual credit..."
                                      value={creditNotes}
                                      onChange={(e) => setCreditNotes(e.target.value)}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleManualCredit(referral)}
                                    disabled={creditingId === referral.id}
                                    className="w-full"
                                  >
                                    Confirm Credit ₦5,000
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {referral.manual_credit_notes || "Already credited"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminReferrals;
