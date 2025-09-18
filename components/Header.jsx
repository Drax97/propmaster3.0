'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { 
  Building2, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ArrowLeft
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Header({ 
  session, 
  isMasterUser = false, 
  showBackButton = false,
  backButtonLink = '/dashboard'
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // Safety check for session
  if (!session || !session.user) return null;

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header 
      className="header"
      data-testid="desktop-navigation"
    >
      <div className="header-container">
        {/* Logo and Title Area */}
        <div className="header-logo-area">
          {showBackButton && (
            <Link 
              href={backButtonLink} 
              className="back-button"
              data-testid="back-button"
            >
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
          )}

          <div className="logo-container">
            <Building2 className="logo-icon" />
            <div className="logo-text">
              <h1 className="app-title">PropMaster</h1>
              <p className="app-subtitle">Real Estate Management</p>
            </div>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="mobile-menu-toggle">
          <button 
            onClick={toggleMobileMenu}
            data-testid="mobile-menu-toggle"
            className="menu-toggle-button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* User Actions Area */}
        <div 
          className={`header-actions ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}
          data-testid="mobile-menu-items"
        >
          {/* User Info */}
          <div className="user-info">
            <Avatar>
              <AvatarImage src={session.user.image} alt="User avatar" />
              <AvatarFallback>{session.user.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="user-details">
              <p className="user-name">{session.user.name}</p>
              {session.user.role && (
                <p className="user-role">{session.user.role}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            {isMasterUser && (
              <Link href="/settings" className="settings-link">
                <Button variant="outline" size={isMobile ? "sm" : "sm"}>
                  <Settings className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Settings</span>}
                </Button>
              </Link>
            )}
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "sm"}
              onClick={() => signOut()}
              className="signout-button"
            >
              <LogOut className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Sign Out</span>}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
