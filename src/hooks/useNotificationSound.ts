import { useCallback, useRef } from 'react';

// Notification sound frequencies for a pleasant chime
const playApprovalSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant "success" chime with multiple tones
    const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      // Fade in and out for smoother sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };
    
    // Play a pleasant ascending chime (C5 - E5 - G5)
    playTone(523.25, 0, 0.2, 0.3);      // C5
    playTone(659.25, 0.1, 0.2, 0.3);    // E5
    playTone(783.99, 0.2, 0.4, 0.4);    // G5
    
    // Clean up audio context after sound finishes
    setTimeout(() => {
      audioContext.close();
    }, 1000);
    
    return true;
  } catch (error) {
    console.log('Audio not supported or blocked:', error);
    return false;
  }
};

const playRejectionSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration);
      
      oscillator.start(audioContext.currentTime + startTime);
      oscillator.stop(audioContext.currentTime + startTime + duration);
    };
    
    // Play a descending tone for rejection (G4 - E4)
    playTone(392.00, 0, 0.3, 0.3);      // G4
    playTone(329.63, 0.15, 0.3, 0.25);  // E4
    
    setTimeout(() => {
      audioContext.close();
    }, 1000);
    
    return true;
  } catch (error) {
    console.log('Audio not supported or blocked:', error);
    return false;
  }
};

export const useNotificationSound = () => {
  const hasPlayedRef = useRef<Set<string>>(new Set());
  
  const playApproval = useCallback((uniqueId?: string) => {
    // Prevent playing the same notification multiple times
    if (uniqueId && hasPlayedRef.current.has(uniqueId)) {
      return;
    }
    
    if (uniqueId) {
      hasPlayedRef.current.add(uniqueId);
    }
    
    playApprovalSound();
  }, []);
  
  const playRejection = useCallback((uniqueId?: string) => {
    if (uniqueId && hasPlayedRef.current.has(uniqueId)) {
      return;
    }
    
    if (uniqueId) {
      hasPlayedRef.current.add(uniqueId);
    }
    
    playRejectionSound();
  }, []);
  
  return { playApproval, playRejection };
};

export { playApprovalSound, playRejectionSound };
