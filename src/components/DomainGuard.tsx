import { useEffect, useState } from 'react';
import { isAuthorizedDomain } from '@/utils/security';
import { Shield, AlertTriangle } from 'lucide-react';

interface DomainGuardProps {
  children: React.ReactNode;
}

export default function DomainGuard({ children }: DomainGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check domain authorization
    const authorized = isAuthorizedDomain();
    setIsAuthorized(authorized);
    setChecking(false);

    // Log unauthorized access attempts
    if (!authorized) {
      console.error('Unauthorized domain access attempt:', window.location.hostname);
    }
  }, []);

  if (checking) {
    return null;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Unauthorized Access</h1>
            <p className="text-muted-foreground">
              This application is not authorized to run on this domain.
            </p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>For legitimate access, visit the official website</span>
            </div>
          </div>

          <a 
            href="https://www.redpay.com.co" 
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Go to Official Site
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
