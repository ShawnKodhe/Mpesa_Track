import React, { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { updateMe } from '@/lib/auth';
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';

// Load only the page the user opens; the rest are fetched on demand.
const PageNotFound = lazy(() => import('./lib/PageNotFound'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Budget = lazy(() => import('@/pages/Budget'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Jarvis = lazy(() => import('@/pages/Jarvis'));
const Settings = lazy(() => import('@/pages/Settings'));
const Loans = lazy(() => import('@/pages/Loans'));
const DebtCheck = lazy(() => import('@/pages/DebtCheck'));
const DebtsOwed = lazy(() => import('@/pages/DebtsOwed'));
const Ladder = lazy(() => import('@/pages/Ladder'));
const Profile = lazy(() => import('@/pages/Profile'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const VerifySecondaryEmail = lazy(() => import('@/pages/VerifySecondaryEmail'));

const RouteFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
  </div>
);

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, checkUserAuth } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return <RouteFallback />;
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Not authenticated — redirect to login
  if (!isLoadingAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  // Show onboarding for new users
  if (user && !user.onboarded) {
    return <Onboarding user={user} onComplete={() => { updateMe({ onboarded: true }).then(() => checkUserAuth()); }} />;
  }

  // Render the main app
  return <Outlet />;
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-secondary-email" element={<VerifySecondaryEmail />} />

              {/* Authenticated app */}
              <Route element={<AuthenticatedApp />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/ladder" element={<Ladder />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/jarvis" element={<Jarvis />} />
                  <Route path="/loans" element={<Loans />} />
                  <Route path="/debt-check" element={<DebtCheck />} />
                  <Route path="/debts-owed" element={<DebtsOwed />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
              </Route>

              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App