'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  DollarSign, 
  ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div 
    className="feature-card"
    data-testid="feature-card"
  >
    <div className="feature-card-icon">
      <Icon className="w-8 h-8 text-blue-600" />
    </div>
    <div className="feature-card-content">
      <h3 className="feature-card-title">{title}</h3>
      <p className="feature-card-description">{description}</p>
    </div>
  </div>
);

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    setIsRedirecting(true);
    
    const timer = setTimeout(() => {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/auth/signin');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [session, status, router]);

  if (status === 'loading' || isRedirecting) {
    return (
      <div className="landing-loading">
        <LoadingSpinner size="lg" text="Initializing PropMaster..." />
      </div>
    );
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-content">
          <Building2 className="landing-logo" />
          <h1 className="landing-title">PropMaster</h1>
          <p className="landing-subtitle">
            Streamline Your Real Estate Management
          </p>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-content">
            <h2 className="hero-title">
              Simplify Property Management
            </h2>
            <p className="hero-description">
              Manage properties, track finances, and streamline operations 
              with our comprehensive real estate management platform.
            </p>
            <Link href="/auth/signin">
              <Button 
                className="hero-cta"
                data-testid="landing-cta-button"
              >
                Get Started
                <ChevronRight className="ml-2" />
              </Button>
            </Link>
          </div>
        </section>

        <section 
          className="features-section"
          data-testid="features-section"
        >
          <h2 className="features-title">Key Features</h2>
          <div className="features-grid">
            <FeatureCard 
              icon={Building2}
              title="Property Management"
              description="Track and manage your entire property portfolio effortlessly."
            />
            <FeatureCard 
              icon={Users}
              title="User Roles"
              description="Customize access and permissions for different team members."
            />
            <FeatureCard 
              icon={DollarSign}
              title="Financial Tracking"
              description="Monitor income, expenses, and financial performance in real-time."
            />
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} PropMaster. All rights reserved.</p>
      </footer>
    </div>
  );
}