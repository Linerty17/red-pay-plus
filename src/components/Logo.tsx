import { Wallet } from "lucide-react";

const Logo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
        <Wallet className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="text-2xl font-bold text-foreground">
        Red<span className="text-primary">Pay</span>
      </span>
    </div>
  );
};

export default Logo;
