import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LiquidBackground from "@/components/LiquidBackground";
import Logo from "@/components/Logo";
import ShareableReceipt from "@/components/ShareableReceipt";
import { ArrowLeft, Check, Clock, X, Download, Share2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  date: string;
  transaction_id: string;
  balance_after: number;
  reference_id?: string;
  proof_image?: string;
}

const Receipt = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!profile || !id) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', id)
        .eq('user_id', profile.user_id)
        .single();

      if (error) {
        console.error('Error fetching transaction:', error);
      } else {
        setTransaction(data);
      }
      setLoading(false);
    };

    fetchTransaction();
  }, [id, profile]);

  const generateReceiptImage = async (): Promise<string | null> => {
    if (!receiptRef.current) return null;
    
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      return canvas.toDataURL("image/png");
    } catch (error) {
      console.error("Error generating receipt image:", error);
      return null;
    }
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const imageData = await generateReceiptImage();
      if (!imageData) {
        toast.error("Failed to generate receipt image");
        return;
      }

      const link = document.createElement("a");
      link.download = `REDPAY-Receipt-${transaction?.transaction_id}.png`;
      link.href = imageData;
      link.click();
      toast.success("Receipt downloaded successfully!");
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast.error("Failed to download receipt");
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    setGenerating(true);
    try {
      const imageData = await generateReceiptImage();
      if (!imageData) {
        toast.error("Failed to generate receipt image");
        return;
      }

      // Convert base64 to blob
      const response = await fetch(imageData);
      const blob = await response.blob();
      const file = new File([blob], `REDPAY-Receipt-${transaction?.transaction_id}.png`, {
        type: "image/png",
      });

      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "REDPAY Transaction Receipt",
          text: `Transaction Receipt - ${transaction?.title} - ₦${transaction?.amount.toLocaleString()}`,
          files: [file],
        });
        toast.success("Receipt shared successfully!");
      } else {
        // Fallback: copy to clipboard or download
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toast.success("Receipt copied to clipboard!");
        } catch {
          // If clipboard fails, trigger download
          handleDownload();
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Error sharing receipt:", error);
        toast.error("Failed to share receipt");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    if (!transaction) return;
    
    const statusText = transaction.title.includes("Failed") 
      ? "Failed" 
      : transaction.title.includes("Pending") 
        ? "Pending" 
        : "Successful";
    
    const amountPrefix = transaction.type === "credit" ? "+" : "-";
    const formattedDate = new Date(transaction.date).toLocaleString();
    
    const message = `*REDPAY Transaction Receipt*

💰 *Amount:* ${amountPrefix}₦${transaction.amount.toLocaleString()}
📋 *Type:* ${transaction.title}
📅 *Date:* ${formattedDate}
🔖 *Transaction ID:* ${transaction.transaction_id}${transaction.reference_id ? `\n📎 *Reference:* ${transaction.reference_id}` : ""}
💳 *Balance After:* ₦${transaction.balance_after.toLocaleString()}
✅ *Status:* ${statusText}

_Thank you for using REDPAY_
www.redpay.com.co`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
    toast.success("Opening WhatsApp...");
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full relative flex items-center justify-center">
        <LiquidBackground />
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen w-full relative">
        <LiquidBackground />
        <div className="relative z-10 p-4 text-center">
          <p className="text-foreground mb-4">Transaction not found</p>
          <Button onClick={() => navigate('/history')}>Back to History</Button>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    if (transaction.title.includes("Failed")) return X;
    if (transaction.title.includes("Pending")) return Clock;
    return Check;
  };

  const getStatusColor = () => {
    if (transaction.title.includes("Failed")) return "text-destructive";
    if (transaction.title.includes("Pending")) return "text-warning";
    return "text-success";
  };

  const StatusIcon = getStatusIcon();
  const statusColor = getStatusColor();
  const userName = profile ? `${profile.first_name} ${profile.last_name}` : undefined;

  return (
    <div className="min-h-screen w-full relative">
      <LiquidBackground />

      {/* Header */}
      <header className="relative z-10 px-4 py-4 flex items-center justify-between border-b border-border/20 bg-card/30 backdrop-blur-sm">
        <Logo />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/history')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 py-8 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
            transaction.type === "credit" ? "bg-success/20" : "bg-destructive/20"
          }`}>
            <StatusIcon className={`w-10 h-10 ${statusColor}`} />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Transaction Receipt</h1>
          <p className={`text-2xl font-bold ${
            transaction.type === "credit" ? "text-success" : "text-destructive"
          }`}>
            {transaction.type === "credit" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
          </p>
        </div>

        <Card className="bg-card/60 backdrop-blur-sm border-border animate-fade-in">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Transaction Type</span>
                <span className="font-semibold text-foreground">{transaction.title}</span>
              </div>
              
              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Amount</span>
                <span className={`font-bold ${
                  transaction.type === "credit" ? "text-success" : "text-destructive"
                }`}>
                  {transaction.type === "credit" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Date & Time</span>
                <span className="font-semibold text-foreground">
                  {new Date(transaction.date).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Transaction ID</span>
                <span className="font-mono text-sm text-foreground">{transaction.transaction_id}</span>
              </div>

              {transaction.reference_id && (
                <div className="flex justify-between py-3 border-b border-border/50">
                  <span className="text-muted-foreground">Reference ID</span>
                  <span className="font-mono text-sm text-foreground">{transaction.reference_id}</span>
                </div>
              )}

              <div className="flex justify-between py-3 border-b border-border/50">
                <span className="text-muted-foreground">Balance After</span>
                <span className="font-bold text-foreground">₦{transaction.balance_after.toLocaleString()}</span>
              </div>

              <div className="flex justify-between py-3">
                <span className="text-muted-foreground">Status</span>
                <span className={`font-semibold ${statusColor}`}>
                  {transaction.title.includes("Failed") ? "Failed" : 
                   transaction.title.includes("Pending") ? "Pending" : "Success"}
                </span>
              </div>
            </div>

            {transaction.proof_image && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground mb-2">Proof of Payment</p>
                <img
                  src={transaction.proof_image}
                  alt="Payment proof"
                  className="w-full rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Share/Download Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleDownload}
            variant="outline"
            disabled={generating}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs">{generating ? "..." : "Download"}</span>
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            disabled={generating}
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-xs">{generating ? "..." : "Share"}</span>
          </Button>
          <Button
            onClick={handleWhatsAppShare}
            className="flex flex-col items-center gap-1 h-auto py-3 bg-[#25D366] hover:bg-[#128C7E] text-white"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs">WhatsApp</span>
          </Button>
        </div>

        <Button
          onClick={() => navigate('/history')}
          className="w-full"
          variant="ghost"
        >
          Back to History
        </Button>
      </main>

      {/* Hidden Shareable Receipt for image generation */}
      <div className="fixed -left-[9999px] top-0">
        <ShareableReceipt
          ref={receiptRef}
          transaction={transaction}
          userName={userName}
        />
      </div>
    </div>
  );
};

export default Receipt;