import { memo } from "react";

const LiquidBackground = memo(() => {
  return (
    <div className="liquid-bg">
      <div className="liquid-blob liquid-blob-1" />
      <div className="liquid-blob liquid-blob-2" />
      <div className="liquid-blob liquid-blob-3" />
    </div>
  );
});

LiquidBackground.displayName = "LiquidBackground";

export default LiquidBackground;
