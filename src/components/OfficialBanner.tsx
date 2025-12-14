import { Shield, AlertTriangle } from "lucide-react";

const OfficialBanner = () => {
  return (
    <div className="bg-gradient-to-r from-primary/90 to-primary text-primary-foreground px-3 py-2 text-center relative z-50">
      <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-medium">
        <Shield className="w-4 h-4 flex-shrink-0" />
        <span>
          <strong>🛡️ Official RedPay</strong> — Only valid on{" "}
          <a 
            href="https://www.redpay.com.co" 
            className="underline font-bold hover:text-white/90"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.redpay.com.co
          </a>
        </span>
        <AlertTriangle className="w-4 h-4 flex-shrink-0 hidden sm:block" />
      </div>
      <p className="text-[10px] sm:text-xs opacity-90 mt-0.5">
        Any other version is fake and unsupported. Report clones immediately.
      </p>
    </div>
  );
};

export default OfficialBanner;
