import { useEffect, useState, memo } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  rotation: number;
}

interface ConfettiCelebrationProps {
  isActive: boolean;
  onComplete?: () => void;
}

const COLORS = [
  'hsl(0, 94%, 44%)',    // Primary red
  'hsl(45, 100%, 50%)',  // Gold
  'hsl(280, 80%, 60%)',  // Purple
  'hsl(200, 100%, 50%)', // Blue
  'hsl(120, 70%, 50%)',  // Green
  'hsl(0, 0%, 100%)',    // White
];

const ConfettiCelebration = memo(({ isActive, onComplete }: ConfettiCelebrationProps) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        rotation: Math.random() * 360,
      }));
      setPieces(newPieces);

      // Clear after animation
      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive && pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti-fall"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            width: `${piece.size}px`,
            height: `${piece.size * 0.6}px`,
            backgroundColor: piece.color,
            borderRadius: '2px',
            transform: `rotate(${piece.rotation}deg)`,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
          }}
        />
      ))}
      
      {/* Center celebration burst */}
      {isActive && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            {/* Burst rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border-4 border-primary/50 animate-ping" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center" style={{ animationDelay: '0.2s' }}>
              <div className="w-24 h-24 rounded-full border-4 border-yellow-400/50 animate-ping" />
            </div>
            
            {/* Stars burst */}
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-yellow-400 animate-star-burst"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `rotate(${i * 30}deg)`,
                  animationDelay: `${i * 0.05}s`,
                  clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

ConfettiCelebration.displayName = 'ConfettiCelebration';

export default ConfettiCelebration;
