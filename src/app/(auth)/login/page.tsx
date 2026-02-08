import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { LoginClient } from './login-client';

// A fallback component to show while the client component is loading
function LoginPageLoading() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
    );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Suspense fallback={<LoginPageLoading />}>
        <LoginClient />
      </Suspense>
    </main>
  );
}
