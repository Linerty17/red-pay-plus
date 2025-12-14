import { forwardRef } from "react";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  date: string;
  transaction_id: string;
  balance_after: number;
  reference_id?: string;
}

interface ShareableReceiptProps {
  transaction: Transaction;
  userName?: string;
}

const ShareableReceipt = forwardRef<HTMLDivElement, ShareableReceiptProps>(
  ({ transaction, userName }, ref) => {
    const getStatusText = () => {
      if (transaction.title.includes("Failed")) return "Failed";
      if (transaction.title.includes("Pending")) return "Pending";
      return "Successful";
    };

    const getStatusColor = () => {
      if (transaction.title.includes("Failed")) return "#ef4444";
      if (transaction.title.includes("Pending")) return "#f59e0b";
      return "#22c55e";
    };

    const statusColor = getStatusColor();

    return (
      <div
        ref={ref}
        style={{
          width: "400px",
          padding: "32px",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
          fontFamily: "Arial, sans-serif",
          color: "#ffffff",
          borderRadius: "16px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ marginBottom: "8px" }}>
            <span
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#dc2626",
              }}
            >
              REDPAY
            </span>
          </div>
          <p style={{ color: "#9ca3af", fontSize: "12px", margin: 0 }}>
            Transaction Receipt
          </p>
        </div>

        {/* Amount Display */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: `${statusColor}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              fontSize: "28px",
            }}
          >
            {transaction.title.includes("Failed") ? "✕" : transaction.title.includes("Pending") ? "⏳" : "✓"}
          </div>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: transaction.type === "credit" ? "#22c55e" : "#ef4444",
              margin: "0 0 4px 0",
            }}
          >
            {transaction.type === "credit" ? "+" : "-"}₦{transaction.amount.toLocaleString()}
          </p>
          <p
            style={{
              fontSize: "14px",
              color: statusColor,
              fontWeight: "600",
              margin: 0,
            }}
          >
            {getStatusText()}
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, #374151, transparent)",
            margin: "20px 0",
          }}
        />

        {/* Details */}
        <div style={{ fontSize: "13px" }}>
          {userName && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #374151",
              }}
            >
              <span style={{ color: "#9ca3af" }}>Account Name</span>
              <span style={{ fontWeight: "600", color: "#ffffff" }}>{userName}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #374151",
            }}
          >
            <span style={{ color: "#9ca3af" }}>Transaction Type</span>
            <span style={{ fontWeight: "600", color: "#ffffff" }}>{transaction.title}</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #374151",
            }}
          >
            <span style={{ color: "#9ca3af" }}>Date & Time</span>
            <span style={{ fontWeight: "600", color: "#ffffff" }}>
              {new Date(transaction.date).toLocaleString()}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid #374151",
            }}
          >
            <span style={{ color: "#9ca3af" }}>Transaction ID</span>
            <span
              style={{
                fontWeight: "600",
                color: "#ffffff",
                fontFamily: "monospace",
                fontSize: "11px",
              }}
            >
              {transaction.transaction_id}
            </span>
          </div>

          {transaction.reference_id && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: "1px solid #374151",
              }}
            >
              <span style={{ color: "#9ca3af" }}>Reference ID</span>
              <span
                style={{
                  fontWeight: "600",
                  color: "#ffffff",
                  fontFamily: "monospace",
                  fontSize: "11px",
                }}
              >
                {transaction.reference_id}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span style={{ color: "#9ca3af" }}>Balance After</span>
            <span style={{ fontWeight: "bold", color: "#ffffff" }}>
              ₦{transaction.balance_after.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #374151",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#6b7280", fontSize: "11px", margin: "0 0 4px 0" }}>
            Thank you for using REDPAY
          </p>
          <p style={{ color: "#4b5563", fontSize: "10px", margin: 0 }}>
            www.redpay.com.co
          </p>
        </div>
      </div>
    );
  }
);

ShareableReceipt.displayName = "ShareableReceipt";

export default ShareableReceipt;