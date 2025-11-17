import { memo } from "react";
import redpayLogo from "@/assets/redpay-logo.png";

const Logo = memo(({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <img src={redpayLogo} alt="RedPay" className="h-10 w-auto object-contain" />
    </div>
  );
});

Logo.displayName = "Logo";

export default Logo;
