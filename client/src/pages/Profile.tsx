import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile as ProfileType, Post } from '@bookoflegends/shared';
import { formatDistanceToNow, format } from 'date-fns';

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
    return <div className="text-center py-12 text-muted-foreground">Loading profile...</div>;
  }

  if (!profileData) {
    return <div className="text-center py-12 text-muted-foreground">User not found</div>;
  }

  const isOwn = currentUser?.id === profileData.id;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border rounded-lg p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold">
              {(profileData.display_name || profileData.username)[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {profileData.display_name || profileData.username}
              </h1>
              <p className="text-muted-foreground">@{profileData.username}</p>
              {profileData.role === 'admin' && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded mt-1 inline-block">
                  Admin
                </span>
              )}
            </div>
          </div>
          {isOwn && (
            <Link
              to="/settings/profile"
              className="text-sm border px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Edit Profile
            </Link>
          )}
        </div>

        {profileData.bio && <p className="mt-4">{profileData.bio}</p>}

        <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
          <span>{profileData.thread_count} threads</span>
          <span>{profileData.post_count} posts</span>
          <span>Joined {format(new Date(profileData.created_at), 'MMM yyyy')}</span>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">Recent Posts</h2>
      <div className="space-y-2">
        {postsData?.posts.map((post) => (
          <Link
            key={post.id}
            to={`/threads/${post.thread.id}`}
            className="block p-3 border rounded-lg hover:bg-accent transition-colors"
          >
            <div className="text-sm font-medium">{post.thread.title}</div>
            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {post.content.slice(0, 200)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDistanceToNow(new Date(post.created_at))} ago
            </div>
          </Link>
        ))}

        {postsData?.posts.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No posts yet</p>
        )}
      </div>
    </div>
  );
}
