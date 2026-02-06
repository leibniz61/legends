import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="bg-card/50 border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading">Reset Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            {sent ? 'Check your email' : "We'll send you a reset link"}
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/20 p-3">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground">
                We've sent a password reset link to <strong className="text-foreground">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-primary hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
