import Link from 'next/link';
import { signup } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-sm border-2 border-primary/20 bg-secondary shadow-[0_0_15px_1px_hsl(var(--primary)/0.2)]">
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">Sign Up</CardTitle>
          <CardDescription>Create an account to start chatting.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signup} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" name="username" type="text" placeholder="Your username" required className="bg-background" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required className="bg-background" />
            </div>
            <Button type="submit" className="w-full">
              Create account
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline text-primary">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
