// Security utilities to protect against cloning and unauthorized access

// Allowed domains - prevents app from running on cloned domains
const ALLOWED_DOMAINS = [
  'redpay.com.co',
  'www.redpay.com.co',
  'localhost',
  '127.0.0.1',
  'lovableproject.com',
  'lovable.dev',
  'lovable.app',
];

// Check if running on authorized domain
export const isAuthorizedDomain = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  const hostname = window.location.hostname;
  return ALLOWED_DOMAINS.some(domain => 
    hostname === domain || 
    hostname.endsWith(`.${domain}`) ||
    hostname.includes('lovable')
  );
};

// Obfuscated admin path - makes it harder to discover admin panel
export const ADMIN_PATH_SEGMENT = 'ifechukwu';

// Anti-debugging measures (disable in development)
export const initSecurityMeasures = () => {
  if (typeof window === 'undefined') return;
  
  // Only enable in production
  const isProduction = !window.location.hostname.includes('localhost') && 
                       !window.location.hostname.includes('lovable');
  
  if (!isProduction) return;

  // Disable right-click context menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  // Disable keyboard shortcuts for dev tools
  document.addEventListener('keydown', (e) => {
    // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j')) ||
      (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
    ) {
      e.preventDefault();
      return false;
    }
  });

  // Detect DevTools opening (basic detection)
  let devToolsOpen = false;
  const threshold = 160;
  
  const checkDevTools = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        console.clear();
        console.log('%cStop!', 'color: red; font-size: 50px; font-weight: bold;');
        console.log('%cThis is a browser feature intended for developers.', 'font-size: 18px;');
      }
    } else {
      devToolsOpen = false;
    }
  };

  // Check periodically
  setInterval(checkDevTools, 1000);
};

// Generate request fingerprint for API calls
export const generateRequestFingerprint = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  
  // Simple hash function
  const hash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  };
  
  return `${hash(userAgent)}-${timestamp}-${random}`;
};

// Rate limiting helper (client-side)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (action: string, maxRequests: number = 10, windowMs: number = 60000): boolean => {
  const now = Date.now();
  const record = requestCounts.get(action);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(action, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
};

// Sanitize user input
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Validate Nigerian phone number
export const isValidNigerianPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return /^(0[789][01]\d{8}|234[789][01]\d{8})$/.test(cleaned);
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
