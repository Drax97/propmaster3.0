'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side - delay to prevent hydration mismatch
    if (typeof window === 'undefined') {
      return;
    }
    
    // Use setTimeout to ensure this runs after hydration
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Separate effect for browser API access after mount
    if (!mounted || typeof window === 'undefined') {
      return;
    }

    // Check if app is already installed
    const checkInstalled = () => {
      try {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIOSStandalone = window.navigator.standalone === true;
        return isStandalone || isIOSStandalone;
      } catch (error) {
        console.error('[PWA] Error checking installed status:', error);
        return false;
      }
    };

    if (checkInstalled()) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    try {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
      setIsIOS(isIOSDevice);
    } catch (error) {
      console.error('[PWA] Error detecting iOS:', error);
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] Install prompt captured');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      console.log('[PWA] App successfully installed');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstalling(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [mounted]);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      console.log('[PWA] Install prompt not available');
      return;
    }

    setIsInstalling(true);
    console.log('[PWA] Triggering install prompt');

    try {
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log('[PWA] User choice:', outcome);

      if (outcome === 'accepted') {
        console.log('[PWA] User accepted installation');
        setIsInstalled(true);
        setDeferredPrompt(null);
      } else {
        console.log('[PWA] User dismissed installation');
      }
    } catch (error) {
      console.error('[PWA] Install error:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Don't render on server or if already installed
  if (!mounted || typeof window === 'undefined' || isInstalled) {
    return null;
  }

  // Only show if we have deferredPrompt or it's iOS
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="pwa-install-button-container">
        <Button
          className="pwa-install-button"
          onClick={handleInstallClick}
          disabled={isInstalling}
          size="lg"
        >
          {isInstalling ? (
            <>
              <Loader2 className="pwa-install-icon spin" />
              <span>Installing...</span>
            </>
          ) : (
            <>
              <Download className="pwa-install-icon" />
              <span>Install App</span>
            </>
          )}
        </Button>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="pwa-ios-modal-overlay" onClick={() => setShowIOSInstructions(false)}>
          <div className="pwa-ios-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="pwa-ios-modal-title">Install PropMaster on iOS</h3>
            <ol className="pwa-ios-modal-steps">
              <li>Tap the <strong>Share</strong> button <span className="pwa-ios-icon">□↑</span> at the bottom of Safari</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>"Add"</strong> in the top-right corner</li>
            </ol>
            <Button
              className="pwa-ios-modal-button"
              onClick={() => setShowIOSInstructions(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

