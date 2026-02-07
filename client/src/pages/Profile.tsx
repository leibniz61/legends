import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile as ProfileType, Post } from '@bookoflegends/shared';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ScrollText, MessageSquare, Calendar, Settings, Circle } from 'lucide-react';

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { profile: currentUser } = useAuth();

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await api.get(`/profiles/${username}`);
      return data.profile as ProfileType;
    },
  });

  const { data: postsData } = useQuery({
    queryKey: ['profile-posts', username],
    queryFn: async () => {
      const { data } = await api.get(`/profiles/${username}/posts`);
      return data as { posts: (Post & { thread: { id: string; title: string; slug: string } })[]; total: number };
    },
  });

  if (profileLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className="bg-card/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileData) {
    return (
      <Card className="max-w-3xl mx-auto bg-card/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          User not found
        </CardContent>
      </Card>
    );
  }

  const isOwn = currentUser?.id === profileData.id;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Profile card */}
      <Card className="bg-card/50 border-border/60 mb-8">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={profileData.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl font-heading">
                  {(profileData.display_name || profileData.username)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-heading font-bold">
                  {profileData.display_name || profileData.username}
                </h1>
                <p className="text-muted-foreground">@{profileData.username}</p>
                {profileData.role === 'admin' && (
                  <Badge className="gap-1 mt-1">
                    <Shield className="h-3 w-3" />
                    Admin
                  </Badge>
                )}
              </div>
            </div>
            {isOwn && (
              <Button variant="outline" size="sm" asChild>
                <Link to="/settings/profile">
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            )}
          </div>

          {profileData.bio && (
            <p className="mt-4 text-sm leading-relaxed">{profileData.bio}</p>
          )}

          <Separator className="my-4" />

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ScrollText className="h-3.5 w-3.5" />
              <span>{profileData.thread_count} threads</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{profileData.post_count} posts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Joined {format(new Date(profileData.created_at), 'MMM yyyy')}</span>
            </div>
            {profileData.last_seen_at && (
              <div className="flex items-center gap-1.5">
                {/* Online if seen in last 5 minutes */}
                {Date.now() - new Date(profileData.last_seen_at).getTime() < 5 * 60 * 1000 ? (
                  <>
                    <Circle className="h-2.5 w-2.5 fill-green-500 text-green-500" />
                    <span className="text-green-500">Online</span>
                  </>
                ) : (
                  <>
                    <Circle className="h-2.5 w-2.5" />
                    <span>Last seen {formatDistanceToNow(new Date(profileData.last_seen_at))} ago</span>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent posts */}
      <h2 className="text-lg font-heading font-semibold mb-4">Recent Posts</h2>
      <div className="space-y-2">
        {postsData?.posts.map((post) => (
          <Link key={post.id} to={`/threads/${post.thread.id}`}>
            <Card className="bg-card/50 hover:bg-card hover:border-primary/30 transition-all duration-200 cursor-pointer group">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium group-hover:text-primary transition-colors">
                  {post.thread.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {post.content.slice(0, 200)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(post.created_at))} ago
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {postsData?.posts.length === 0 && (
          <Card className="bg-card/50">
            <CardContent className="py-8 text-center text-muted-foreground">
              No posts yet
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
