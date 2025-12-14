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

    // REDPAY brand colors matching the app theme
    const colors = {
      background: "#000000",
      cardBg: "#141414",
      surface: "#1f1f1f",
      primary: "#dc2626", // REDPAY red
      primaryDark: "#b91c1c",
      text: "#fafafa",
      textMuted: "#999999",
      border: "#333333",
    };

    return (
      <div
        ref={ref}
        style={{
          width: "400px",
          padding: "32px",
          background: `linear-gradient(180deg, ${colors.cardBg} 0%, ${colors.background} 100%)`,
          fontFamily: "Arial, sans-serif",
          color: colors.text,
          borderRadius: "16px",
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* Header with red accent */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              display: "inline-block",
              padding: "12px 24px",
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
              borderRadius: "12px",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#ffffff",
                letterSpacing: "2px",
              }}
            >
              REDPAY
            </span>
          </div>
          <p style={{ color: colors.textMuted, fontSize: "12px", margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>
            Transaction Receipt
          </p>
        </div>

        {/* Amount Display */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "24px",
            padding: "20px",
            background: colors.surface,
            borderRadius: "12px",
            border: `1px solid ${colors.border}`,
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: `${statusColor}20`,
              border: `2px solid ${statusColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "24px",
              color: statusColor,
            }}
          >
            {transaction.title.includes("Failed") ? "✕" : transaction.title.includes("Pending") ? "⏳" : "✓"}
          </div>
          <p
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: transaction.type === "credit" ? "#22c55e" : colors.primary,
              margin: "0 0 8px 0",
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
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {getStatusText()}
          </p>
        </div>

        {/* Details Section */}
        <div
          style={{
            background: colors.surface,
            borderRadius: "12px",
            padding: "16px",
            border: `1px solid ${colors.border}`,
          }}
        >
          {userName && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <span style={{ color: colors.textMuted, fontSize: "13px" }}>Account Name</span>
              <span style={{ fontWeight: "600", color: colors.text, fontSize: "13px" }}>{userName}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <span style={{ color: colors.textMuted, fontSize: "13px" }}>Transaction Type</span>
            <span style={{ fontWeight: "600", color: colors.text, fontSize: "13px" }}>{transaction.title}</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <span style={{ color: colors.textMuted, fontSize: "13px" }}>Date & Time</span>
            <span style={{ fontWeight: "600", color: colors.text, fontSize: "13px" }}>
              {new Date(transaction.date).toLocaleString()}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <span style={{ color: colors.textMuted, fontSize: "13px" }}>Transaction ID</span>
            <span
              style={{
                fontWeight: "600",
                color: colors.primary,
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
                padding: "12px 0",
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              <span style={{ color: colors.textMuted, fontSize: "13px" }}>Reference ID</span>
              <span
                style={{
                  fontWeight: "600",
                  color: colors.primary,
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
              padding: "12px 0",
            }}
          >
            <span style={{ color: colors.textMuted, fontSize: "13px" }}>Balance After</span>
            <span style={{ fontWeight: "bold", color: colors.text, fontSize: "14px" }}>
              ₦{transaction.balance_after.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              height: "2px",
              background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
              marginBottom: "16px",
            }}
          />
          <p style={{ color: colors.textMuted, fontSize: "11px", margin: "0 0 4px 0" }}>
            Thank you for using REDPAY
          </p>
          <p style={{ color: colors.primary, fontSize: "10px", margin: 0, fontWeight: "600" }}>
            www.redpay.com.co
          </p>
        </div>
      </div>
    );
  }
);

ShareableReceipt.displayName = "ShareableReceipt";

export default ShareableReceipt;
