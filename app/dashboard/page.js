'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import Header from '@/components/layout/Header';
import ViewerPropertiesCard from '@/components/layout/ViewerPropertiesCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  TrendingUp, 
  Users, 
  Settings, 
  LogOut, 
  Plus, 
  Eye, 
  DollarSign, 
  UserCog,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

import {
  fetchDashboardStatistics,
} from '@/lib/supabase';
import { getUserRole, ROLES } from '@/lib/permissions';
import LoadingSpinner from '@/components/layout/LoadingSpinner';

// Lazy load non-critical components
const StatsCards = dynamic(() => import('@/components/layout/StatsCards'), {
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className="h-24 bg-muted animate-pulse rounded-lg"
          data-testid="stats-card-loading"
        />
      ))}
    </div>
  ),
  ssr: false
});

const QuickActions = dynamic(() => import('@/components/layout/QuickActions'), {
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div 
          key={i} 
          className="h-48 bg-muted animate-pulse rounded-lg"
          data-testid="quick-actions-card-loading"
        />
      ))}
    </div>
  ),
  ssr: false
});

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalProperties: 0,
    availableProperties: 0,
    totalReceivables: 0,
    pendingPayments: 0,
    pendingUsers: 0
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardStats = async () => {
    try {
      const dashboardStats = await fetchDashboardStatistics();
      
      if (!dashboardStats) {
        console.error('Dashboard statistics fetch returned null or undefined');
        setStats({
          totalProperties: 0,
          availableProperties: 0,
          totalReceivables: 0,
          pendingPayments: 0,
          pendingUsers: 0
        });
        setLoading(false);
        return;
      }

      setStats({
        totalProperties: dashboardStats.totalProperties || 0,
        availableProperties: dashboardStats.availableProperties || 0,
        totalReceivables: dashboardStats.totalReceivables || 0,
        pendingPayments: 0,
        pendingUsers: dashboardStats.totalUsers || 0
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      
      setStats({
        totalProperties: 0,
        availableProperties: 0,
        totalReceivables: 0,
        pendingPayments: 0,
        pendingUsers: 0
      });
      
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session?.user?.status === 'pending' || session?.user?.role === 'pending') {
      router.push('/access-pending');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      loadDashboardStats();
    }
  }, [status, session, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = getUserRole(session.user);
  const isMasterUser = userRole === ROLES.MASTER;
  const isEditorUser = userRole === ROLES.EDITOR;
  const isViewerUser = userRole === ROLES.VIEWER;

  return (
    <div className="min-h-screen bg-background">
      <Header 
        session={session} 
        isMasterUser={isMasterUser} 
      />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8 max-w-7xl">
        {/* Welcome Section */}
        <section className="space-y-3">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-transparent bg-gradient-to-r from-primary to-accent bg-clip-text">
            Welcome back, {session.user.name}!
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-3xl leading-relaxed">
            {isMasterUser 
              ? 'Manage your entire property portfolio & track finances, easily.' 
              : (isEditorUser 
                ? 'Manage properties and finances in the system with full editing access.'
                : 'Browse and view available properties with comprehensive details and insights.')}
          </p>
        </section>

        {/* Stats Cards - Always show for Master and Editor users */}
        {(isMasterUser || isEditorUser) && (
          <section data-testid="dashboard-stats">
            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div 
                    key={i} 
                    className="h-24 bg-muted animate-pulse rounded-lg"
                    data-testid="stats-card-loading"
                  />
                ))}
              </div>
            }>
              <StatsCards stats={stats} />
            </Suspense>
          </section>
        )}

        {/* Feature Cards */}
        {(isMasterUser || isEditorUser) && (
          <section data-testid="dashboard-feature-cards">
            <Suspense fallback={
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className="h-48 bg-muted animate-pulse rounded-lg"
                    data-testid="quick-actions-card-loading"
                  />
                ))}
              </div>
            }>
              <QuickActions userRole={userRole} stats={stats} />
            </Suspense>
          </section>
        )}

        {/* System Overview and Getting Started - Only for Master users */}
        {isMasterUser && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="bg-blue-500/10 p-2 rounded-lg">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  System Overview
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Current status of your PropMaster system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-muted">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-foreground">Database Status</span>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-muted">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-foreground">User Authentication</span>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-muted">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-foreground">Property System</span>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    Operational
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-xl transition-all duration-150 rounded-xl border border-accent/20 bg-card/90">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="bg-orange-500/10 p-2 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  Getting Started
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  New to PropMaster? Here's what you can do
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/properties/new">
                  <Button variant="outline" className="w-full justify-start transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Property
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline" className="w-full justify-start transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Settings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Viewer Properties Section */}
        {isViewerUser && (
          <section data-testid="dashboard-viewer-properties">
            <ViewerPropertiesCard />
          </section>
        )}
      </main>
    </div>
  );
}