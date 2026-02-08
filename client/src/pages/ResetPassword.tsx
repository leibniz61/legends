import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { resetPasswordWithConfirmSchema, type ResetPasswordWithConfirmInput } from '@bookoflegends/shared';
import { useZodForm } from '@/hooks/useZodForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KeyRound, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  const form = useZodForm({
    schema: resetPasswordWithConfirmSchema,
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    // Check if user arrived via password reset link
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();

      // If there's a session and it came from a password reset, allow the reset
      if (session) {
        setIsValidSession(true);
      } else {
        // Check URL for recovery token (Supabase adds it as hash params)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (accessToken && type === 'recovery') {
          // Set the session from the recovery token
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || '',
          });

          if (!error) {
            setIsValidSession(true);
          }
        }
      }
      setChecking(false);
    }

    checkSession();
  }, []);

  async function onSubmit(data: ResetPasswordWithConfirmInput) {
    setError('');

    const { error } = await supabase.auth.updateUser({ password: data.password });

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);

    // Redirect to home after a short delay
    setTimeout(() => navigate('/'), 2000);
  }

  const { errors, isSubmitting } = form.formState;

  if (checking) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="bg-card/50 border-border/60">
          <CardContent className="py-12 text-center text-muted-foreground">
            Verifying reset link...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="bg-card/50 border-border/60">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              This password reset link is invalid or has expired.
            </p>
            <Button onClick={() => navigate('/forgot-password')}>
              Request New Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="bg-card/50 border-border/60">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading">New Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            {success ? 'Password updated!' : 'Choose a strong password'}
          </p>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/20 p-3">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
              </div>
              <p className="text-muted-foreground">
                Your password has been updated successfully. Redirecting...
              </p>
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    {...form.register('password')}
                  />
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Enter password again"
                    {...form.register('confirmPassword')}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  <KeyRound className="h-4 w-4" />
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
