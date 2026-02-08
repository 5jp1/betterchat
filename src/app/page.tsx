"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoginClient } from './(auth)/login/login-client';


// --- Intro Component ---
function Intro({ isExiting }: { isExiting: boolean }) {
  const text = "BetterChat";

  return (
    <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-background",
        isExiting ? "pointer-events-none" : ""
    )}>
      <h1
        className={cn(
          "text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400",
          "animate-gradient-glow",
          isExiting ? "animate-intro-text-out" : ""
        )}
      >
        {text.split('').map((letter, index) => (
          <span
            key={index}
            className={cn(
                "inline-block",
                !isExiting && "animate-bounce-letter"
            )}
            style={{ animationDelay: `${index * 0.07}s` }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        ))}
      </h1>
    </div>
  );
}
// --- End Intro Component ---


export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  // States: intro, auth, redirecting
  const [pageState, setPageState] = useState<'intro' | 'auth' | 'redirecting'>('intro');

  useEffect(() => {
    if (isLoading) {
      return; // Wait until auth state is known
    }

    if (user) {
      setPageState('redirecting');
      router.replace('/room/room_general');
    } else {
      // Not logged in, start the intro sequence
      const introTimer = setTimeout(() => {
        setPageState('auth'); // Trigger transition to login form
      }, 3000); // Let intro play for 3 seconds

      return () => clearTimeout(introTimer);
    }
  }, [user, isLoading, router]);

  if (pageState === 'redirecting' || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <Intro isExiting={pageState === 'auth'} />
      {pageState === 'auth' && (
        // The animation delay allows the intro text to animate out first
        <div className="flex h-full items-center justify-center p-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Suspense fallback={
              <div className="flex h-screen w-full items-center justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
          }>
            <LoginClient />
          </Suspense>
        </div>
      )}
    </div>
  );
}
