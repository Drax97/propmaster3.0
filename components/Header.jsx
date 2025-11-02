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
import { ThemeToggle } from '@/components/ui/theme-toggle';
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
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      data-testid="desktop-navigation"
    >
      <div className="container flex h-14 items-center justify-between px-3 sm:px-4">
        {/* Logo and Title Area */}
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Link 
              href={backButtonLink} 
              className="mr-2"
              data-testid="back-button"
            >
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back</span>
              </Button>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold">PropMaster</h1>
              <p className="text-xs text-muted-foreground">Real Estate Management</p>
            </div>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={toggleMobileMenu}
            data-testid="mobile-menu-toggle"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Desktop User Actions */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all duration-150 hover:ring-primary/40">
              <AvatarImage src={session.user.image} alt="User avatar" />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {session.user.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold text-foreground">{session.user.name}</p>
              {session.user.role && (
                <p className="text-xs text-muted-foreground capitalize bg-muted/50 px-2 py-0.5 rounded-full">
                  {session.user.role}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            {isMasterUser && (
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                  <Settings className="h-4 w-4" />
                  <span className="hidden lg:inline ml-2">Settings</span>
                </Button>
              </Link>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              className="transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline ml-2">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-background border-b shadow-lg md:hidden"
               data-testid="mobile-menu-items">
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-muted">
                <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                  <AvatarImage src={session.user.image} alt="User avatar" />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {session.user.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{session.user.name}</p>
                  {session.user.role && (
                    <p className="text-sm text-muted-foreground capitalize bg-muted/50 px-2 py-0.5 rounded-full inline-block mt-1">
                      {session.user.role}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm font-medium text-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                {isMasterUser && (
                  <Link href="/settings" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start transition-all duration-150 hover:bg-accent hover:text-accent-foreground">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </Link>
                )}
                <Button 
                  variant="ghost" 
                  className="w-full justify-start transition-all duration-150 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
