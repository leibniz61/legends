import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import CategoryView from '@/pages/CategoryView';
import ThreadView from '@/pages/ThreadView';
import NewThread from '@/pages/NewThread';
import Profile from '@/pages/Profile';
import EditProfile from '@/pages/EditProfile';
import SearchResults from '@/pages/SearchResults';
import Notifications from '@/pages/Notifications';
import AdminDashboard from '@/pages/admin/Dashboard';
import ManageCategories from '@/pages/admin/ManageCategories';
import ManageUsers from '@/pages/admin/ManageUsers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/c/:slug" element={<CategoryView />} />
              <Route path="/threads/:id" element={<ThreadView />} />
              <Route path="/c/:slug/new" element={<NewThread />} />
              <Route path="/u/:username" element={<Profile />} />
              <Route path="/settings/profile" element={<EditProfile />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/categories" element={<ManageCategories />} />
              <Route path="/admin/users" element={<ManageUsers />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
