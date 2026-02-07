import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Toaster } from "@/components/ui/sonner";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/layout/Layout";
import Home from "@/pages/Home";

// Lazy-load pages that include the heavy markdown editor or aren't needed on first paint
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const CategoryView = lazy(() => import("@/pages/CategoryView"));
const ThreadView = lazy(() => import("@/pages/ThreadView"));
const NewThread = lazy(() => import("@/pages/NewThread"));
const Profile = lazy(() => import("@/pages/Profile"));
const EditProfile = lazy(() => import("@/pages/EditProfile"));
const SearchResults = lazy(() => import("@/pages/SearchResults"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const WatchList = lazy(() => import("@/pages/WatchList"));
const WhatsNew = lazy(() => import("@/pages/WhatsNew"));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const ManageCategories = lazy(() => import("@/pages/admin/ManageCategories"));
const ManageUsers = lazy(() => import("@/pages/admin/ManageUsers"));
const ModerationQueue = lazy(() => import("@/pages/admin/ModerationQueue"));

function PageLoader() {
  return (
    <div className="space-y-4 py-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/c/:slug" element={<CategoryView />} />
                  <Route path="/threads/:id" element={<ThreadView />} />
                  <Route path="/c/:slug/new" element={<NewThread />} />
                  <Route path="/u/:username" element={<Profile />} />
                  <Route path="/settings/profile" element={<EditProfile />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/watching" element={<WatchList />} />
                  <Route path="/unread" element={<WhatsNew />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route
                    path="/admin/categories"
                    element={<ManageCategories />}
                  />
                  <Route path="/admin/users" element={<ManageUsers />} />
                  <Route
                    path="/admin/moderation"
                    element={<ModerationQueue />}
                  />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster richColors position="bottom-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
