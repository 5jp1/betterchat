"use client";

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { login as loginAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';

export function LoginClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.replace(/_/g, ' '),
      });
      // Clean the URL
      router.replace('/login', { scroll: false });
    }

    const userParam = searchParams.get('user');
    if (userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        authLogin(user);
        router.replace('/room/room_general');
      } catch (e) {
        console.error("Failed to parse user from URL", e);
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: 'Could not process login. Please try again.',
        });
        router.replace('/login', { scroll: false });
      }
    }
  }, [searchParams, router, authLogin, toast]);

  return (
      <Card className="w-full max-w-sm border-2 border-primary/20 bg-secondary shadow-[0_0_15px_1px_hsl(var(--primary)/0.2)]">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Login</CardTitle>
          <CardDescription>Enter your username and password to access BetterChat.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="user123"
                required
                className="bg-background"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required className="bg-background" />
            </div>
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="underline text-primary">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
  );
}
