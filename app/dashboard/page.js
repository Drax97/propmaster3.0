'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

import Header from '@/components/Header';
import ViewerPropertiesCard from '@/components/ViewerPropertiesCard';
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
  UserCog 
} from 'lucide-react';

import {
  fetchDashboardStatistics,
} from '@/lib/supabase';
import { getUserRole, ROLES } from '@/lib/permissions';
import LoadingSpinner from '@/components/LoadingSpinner';

// Lazy load non-critical components
const StatsCards = dynamic(() => import('@/components/StatsCards'), {
  loading: () => (
    <div className="stats-grid">
      {[...Array(4)].map((_, i) => (
        <div 
          key={i} 
          className="stats-card-loading"
          data-testid="stats-card-loading"
        />
      ))}
    </div>
  ),
  ssr: false
});

const QuickActions = dynamic(() => import('@/components/QuickActions'), {
  loading: () => (
    <div className="quick-actions-grid">
      {[...Array(3)].map((_, i) => (
        <div 
          key={i} 
          className="quick-actions-card-loading"
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
      <div className="dashboard-loading">
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
    <div className="dashboard">
      <Header 
        session={session} 
        isMasterUser={isMasterUser} 
      />

      <main className="dashboard-main">
        <section className="welcome-section">
          <h2 className="welcome-title">
            Welcome back, {session.user.name}!
          </h2>
          <p className="welcome-subtitle">
            {isMasterUser 
              ? 'Manage your real estate portfolio, finances, and users.' 
              : (isEditorUser 
                ? 'Manage properties and finances in the system.'
                : 'Browse and view available properties in the system.')}
          </p>
        </section>

        {(isMasterUser || isEditorUser) && (
          <>
            <section 
              className="stats-section"
              data-testid="dashboard-stats"
            >
              <Suspense fallback={
                <div className="stats-grid">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className="stats-card-loading"
                      data-testid="stats-card-loading"
                    />
                  ))}
                </div>
              }>
                <StatsCards stats={stats} />
              </Suspense>
            </section>

            {isMasterUser && (
              <section 
                className="quick-actions-section"
                data-testid="dashboard-quick-actions"
              >
                <Suspense fallback={
                  <div className="quick-actions-grid">
                    {[...Array(3)].map((_, i) => (
                      <div 
                        key={i} 
                        className="quick-actions-card-loading"
                        data-testid="quick-actions-card-loading"
                      />
                    ))}
                  </div>
                }>
                  <QuickActions userRole={userRole} stats={stats} />
                </Suspense>
              </section>
            )}

            <section 
              className="system-overview-section"
              data-testid="dashboard-system-overview"
            >
              <div className="system-overview-grid">
                {isMasterUser ? (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>System Overview</CardTitle>
                        <CardDescription>
                          Current status of your PropMaster system
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="system-status-list">
                          <div className="system-status-item">
                            <span>Database Status</span>
                            <Badge variant="outline" className="status-badge connected">
                              Connected
                            </Badge>
                          </div>
                          <div className="system-status-item">
                            <span>User Authentication</span>
                            <Badge variant="outline" className="status-badge connected">
                              Active
                            </Badge>
                          </div>
                          <div className="system-status-item">
                            <span>Property System</span>
                            <Badge variant="outline" className="status-badge connected">
                              Operational
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Getting Started</CardTitle>
                        <CardDescription>
                          New to PropMaster? Here's what you can do
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="getting-started-actions">
                          <Link href="/properties/new">
                            <Button variant="outline" className="action-button">
                              <Plus className="action-button-icon" />
                              Add Your First Property
                            </Button>
                          </Link>
                          <Link href="/admin/users">
                            <Button variant="outline" className="action-button">
                              <Users className="action-button-icon" />
                              Manage User Access
                            </Button>
                          </Link>
                          <Link href="/settings">
                            <Button variant="outline" className="action-button">
                              <Settings className="action-button-icon" />
                              Configure Settings
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Properties Overview</CardTitle>
                        <CardDescription>
                          Your property management dashboard
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4 mb-4">
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Properties</p>
                              <p className="text-2xl font-bold text-blue-600">{stats.totalProperties}</p>
                            </div>
                            <Building2 className="h-8 w-8 text-blue-600" />
                          </div>
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Available Properties</p>
                              <p className="text-2xl font-bold text-green-600">{stats.availableProperties}</p>
                            </div>
                            <Eye className="h-8 w-8 text-green-600" />
                          </div>
                        </div>
                        <Link href="/properties" className="view-all-link">
                          <Button variant="outline" size="sm" className="w-full">
                            View All Properties
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Financial Overview</CardTitle>
                        <CardDescription>
                          Current financial status
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-4 mb-4">
                          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Receivables</p>
                              <p className="text-2xl font-bold text-purple-600">₹{stats.totalReceivables.toLocaleString()}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-purple-600" />
                          </div>
                        </div>
                        <Link href="/finances" className="view-all-link">
                          <Button variant="outline" size="sm" className="w-full">
                            View Financial Details
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </section>
          </>
        )}

        {/* Viewer Properties Section */}
        {isViewerUser && (
          <section 
            className="viewer-properties-section"
            data-testid="dashboard-viewer-properties"
          >
            <ViewerPropertiesCard />
          </section>
        )}

      </main>
    </div>
  );
}