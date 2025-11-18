import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ProfileButton from "@/components/ProfileButton";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface RPCPurchase {
  id: string;
  user_id: string;
  user_name: string;
  email: string;
  phone: string;
  user_unique_id: string;
  verified: boolean;
  rpc_code_issued: string | null;
  proof_image: string | null;
  created_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: string;
  transaction_id: string;
  balance_before: number;
  balance_after: number;
  date: string;
}

interface SupportRequest {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rpcPurchases, setRpcPurchases] = useState<RPCPurchase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [requestStatus, setRequestStatus] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/");
      return;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error || !data) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
    loadData();
  };

  const loadData = async () => {
    await Promise.all([loadRPCPurchases(), loadTransactions(), loadSupportRequests()]);
  };

  const loadRPCPurchases = async () => {
    const { data, error } = await supabase
      .from("rpc_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load RPC purchases");
      return;
    }
    setRpcPurchases(data || []);
  };

  const loadTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("date", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Failed to load transactions");
      return;
    }
    setTransactions(data || []);
  };

  const loadSupportRequests = async () => {
    const { data, error } = await supabase
      .from("support_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load support requests");
      return;
    }
    setSupportRequests(data || []);
  };

  const verifyRPCPurchase = async (purchaseId: string) => {
    const rpcCode = `RPC${Date.now()}${Math.floor(Math.random() * 10000)}`;
    
    const { error } = await supabase
      .from("rpc_purchases")
      .update({ verified: true, rpc_code_issued: rpcCode })
      .eq("id", purchaseId);

    if (error) {
      toast.error("Failed to verify purchase");
      return;
    }

    toast.success("RPC purchase verified successfully!");
    loadRPCPurchases();
  };

  const updateSupportRequest = async () => {
    if (!selectedRequest) return;

    const updates: any = {
      admin_notes: adminNotes,
      status: requestStatus,
    };

    if (requestStatus === "resolved") {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("support_requests")
      .update(updates)
      .eq("id", selectedRequest.id);

    if (error) {
      toast.error("Failed to update support request");
      return;
    }

    toast.success("Support request updated!");
    setSelectedRequest(null);
    setAdminNotes("");
    setRequestStatus("");
    loadSupportRequests();
  };

  const openRequestDialog = (request: SupportRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
    setRequestStatus(request.status);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      <header className="relative z-10 px-3 py-2 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <ProfileButton />
      </header>

      <main className="relative z-10 px-3 py-4 max-w-7xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage RPC purchases, transactions, and support requests</p>
        </div>

        <Tabs defaultValue="rpc" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rpc">RPC Purchases</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="support">Support Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="rpc">
            <Card>
              <CardHeader>
                <CardTitle>RPC Purchase Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>RPC Code</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Proof</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rpcPurchases.map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell className="font-medium">{purchase.user_name}</TableCell>
                          <TableCell>{purchase.email}</TableCell>
                          <TableCell>{purchase.phone}</TableCell>
                          <TableCell>{purchase.user_unique_id}</TableCell>
                          <TableCell>
                            <Badge variant={purchase.verified ? "default" : "secondary"}>
                              {purchase.verified ? "Verified" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell>{purchase.rpc_code_issued || "-"}</TableCell>
                          <TableCell>{new Date(purchase.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {purchase.proof_image ? (
                              <a
                                href={purchase.proof_image}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {!purchase.verified && (
                              <Button
                                size="sm"
                                onClick={() => verifyRPCPurchase(purchase.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Verify
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Balance Before</TableHead>
                        <TableHead>Balance After</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.transaction_id}</TableCell>
                          <TableCell>{transaction.user_id}</TableCell>
                          <TableCell>{transaction.title}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === "credit" ? "default" : "destructive"}>
                              {transaction.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={transaction.type === "credit" ? "text-green-600" : "text-red-600"}>
                            {transaction.type === "credit" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>₦{transaction.balance_before.toLocaleString()}</TableCell>
                          <TableCell>₦{transaction.balance_after.toLocaleString()}</TableCell>
                          <TableCell>{new Date(transaction.date).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle>Support Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supportRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.user_id}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{request.subject}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.priority === "high"
                                  ? "destructive"
                                  : request.priority === "normal"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.status === "resolved"
                                  ? "default"
                                  : request.status === "in_progress"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(request.updated_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => openRequestDialog(request)}>
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {selectedRequest && (
          <Card className="fixed inset-4 z-50 max-w-2xl mx-auto my-auto h-fit">
            <CardHeader>
              <CardTitle>Manage Support Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold">Subject:</h3>
                <p>{selectedRequest.subject}</p>
              </div>
              <div>
                <h3 className="font-semibold">Message:</h3>
                <p className="text-sm text-muted-foreground">{selectedRequest.message}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Status:</h3>
                <Select value={requestStatus} onValueChange={setRequestStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Admin Notes:</h3>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes..."
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={updateSupportRequest}>Update Request</Button>
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Admin;
