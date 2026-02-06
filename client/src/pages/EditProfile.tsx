import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings } from 'lucide-react';

export default function EditProfile() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.put('/profiles/me', {
        display_name: displayName || undefined,
        bio: bio || undefined,
      });
      navigate(`/u/${profile!.username}`);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update profile';
      setError(message);
    }

    setLoading(false);
  }

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={profile.username}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/500
              </p>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
