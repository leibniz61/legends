import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { profileUpdateSchema, type ProfileUpdateInput } from '@bookoflegends/shared';
import { useZodForm } from '@/hooks/useZodForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AvatarUpload } from '@/components/shared';
import { Settings } from 'lucide-react';

export default function EditProfile() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const form = useZodForm({
    schema: profileUpdateSchema,
    defaultValues: {
      display_name: '',
      bio: '',
      avatar_url: '',
    },
  });

  // Set initial values when profile loads
  useEffect(() => {
    if (profile) {
      form.reset({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile, form]);

  async function onSubmit(data: ProfileUpdateInput) {
    setError('');

    try {
      await api.put('/profiles/me', {
        display_name: data.display_name || undefined,
        bio: data.bio || undefined,
        avatar_url: data.avatar_url || undefined,
      });
      navigate(`/u/${profile!.username}`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update profile';
      setError(message);
    }
  }

  const { errors, isSubmitting } = form.formState;
  const bio = form.watch('bio') || '';

  if (!profile) {
    return (
      <Card className="max-w-md mx-auto mt-12 bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          Please sign in to edit your profile.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card className="bg-card/50 border-border/60">
        <CardHeader>
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Edit Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <AvatarUpload
              currentUrl={form.watch('avatar_url') || null}
              userId={profile.id}
              displayName={profile.display_name}
              username={profile.username}
              onUpload={(url) => form.setValue('avatar_url', url)}
              onRemove={() => form.setValue('avatar_url', '')}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder={profile.username}
                {...form.register('display_name')}
              />
              {errors.display_name && (
                <p className="text-xs text-destructive">{errors.display_name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                rows={4}
                {...form.register('bio')}
              />
              <div className="flex justify-between text-xs">
                {errors.bio ? (
                  <p className="text-destructive">{errors.bio.message}</p>
                ) : (
                  <span />
                )}
                <span className="text-muted-foreground">{bio.length}/500</span>
              </div>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
