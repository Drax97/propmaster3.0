'use client';

import { useEffect, useState } from 'react';
import { Building2, Smartphone, Download, Share2, Plus, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InstallPage() {
  const [deviceType, setDeviceType] = useState('unknown');
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
    if (/android/i.test(userAgent)) {
      setDeviceType('android');
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDeviceType('ios');
    } else {
      setDeviceType('desktop');
    }

    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = window.navigator.standalone === true;
      
      if (isStandalone || isIOSStandalone) {
        setIsInstalled(true);
        return true;
      }
      return false;
    };

    if (checkInstalled()) {
      return;
    }

    // Listen for beforeinstallprompt event (Chrome/Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    // Check if install is already available (some browsers show it immediately)
    const checkCanInstall = () => {
      // For desktop Chrome/Edge, we can check if the prompt is available
      if (window.matchMedia('(display-mode: browser)').matches) {
        // Desktop browser - check if PWA install is supported
        setCanInstall(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Also listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    
    checkCanInstall();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    // If no deferred prompt, scroll to instructions and show helpful message
    if (!deferredPrompt) {
      const instructionsSection = document.querySelector('.install-instructions');
      if (instructionsSection) {
        instructionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      if (deviceType === 'android') {
        setInstallError('Please use the browser menu (⋮) → "Install app" to install.');
      } else if (deviceType === 'ios') {
        setInstallError('Please use the Share button (□↑) → "Add to Home Screen" to install.');
      } else {
        setInstallError('Please look for the install icon in your browser\'s address bar, or use the browser menu.');
      }
      return;
    }

    setIsInstalling(true);
    setInstallError(null);

    try {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setCanInstall(false);
      } else {
        setInstallError('Installation was cancelled. You can try again anytime.');
      }
    } catch (error) {
      console.error('Install error:', error);
      setInstallError('An error occurred during installation. Please try using the browser menu.');
    } finally {
      setIsInstalling(false);
    }
  };

  const InstallStep = ({ number, icon: Icon, title, description }) => (
    <div className="install-step">
      <div className="install-step-number">{number}</div>
      <div className="install-step-icon">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      <div className="install-step-content">
        <h3 className="install-step-title">{title}</h3>
        <p className="install-step-description">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="install-page">
      <header className="install-header">
        <div className="install-header-content">
          <div className="install-icon-wrapper">
            <img 
              src="/icon-192x192.png" 
              alt="PropMaster" 
              className="install-icon"
            />
          </div>
          <Building2 className="install-logo" />
          <h1 className="install-title">Install PropMaster</h1>
          <p className="install-subtitle">
            Add PropMaster to your home screen for quick access
          </p>
        </div>
      </header>

      <main className="install-main">
        {isInstalled ? (
          <div className="install-success">
            <CheckCircle2 className="install-success-icon" />
            <h2 className="install-success-title">App Installed!</h2>
            <p className="install-success-description">
              PropMaster is now installed on your device. You can find it on your home screen.
            </p>
            <Button 
              className="install-success-button"
              onClick={() => window.location.href = '/'}
            >
              Go to App
            </Button>
          </div>
        ) : (
          <>
            {/* Install Button - Always show, works when deferredPrompt is available */}
            <div className="install-prompt">
              <div className="install-prompt-content">
                <Smartphone className="install-prompt-icon" />
                <h2 className="install-prompt-title">Install PropMaster</h2>
                <p className="install-prompt-description">
                  {deferredPrompt 
                    ? 'Tap the button below to install PropMaster on your device.'
                    : deviceType === 'ios'
                    ? 'Use the Share button (□↑) in Safari and select "Add to Home Screen" to install.'
                    : 'Install PropMaster to your device for a better experience. If the button doesn\'t work, use your browser\'s install option.'}
                </p>
                <Button 
                  className="install-prompt-button"
                  onClick={handleInstallClick}
                  size="lg"
                  disabled={isInstalling}
                >
                  {isInstalling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      {deferredPrompt ? 'Install Now' : 'Get Installation Guide'}
                    </>
                  )}
                </Button>
                {installError && (
                  <p className="install-error-message">{installError}</p>
                )}
                {!deferredPrompt && deviceType !== 'ios' && (
                  <p className="install-hint">
                    💡 If the button doesn't work, look for the install icon in your browser's address bar
                  </p>
                )}
              </div>
            </div>

            <section className="install-instructions">
              <h2 className="install-instructions-title">Installation Instructions</h2>
              
              {deviceType === 'android' ? (
                <div className="install-steps">
                  <InstallStep
                    number={1}
                    icon={Share2}
                    title="Open Menu"
                    description="Tap the menu button (three dots) in the top-right corner of your browser"
                  />
                  <InstallStep
                    number={2}
                    icon={Plus}
                    title="Add to Home Screen"
                    description="Select 'Install app' or 'Add to Home screen' from the menu"
                  />
                  <InstallStep
                    number={3}
                    icon={CheckCircle2}
                    title="Confirm Installation"
                    description="Tap 'Install' or 'Add' to confirm. The app will appear on your home screen"
                  />
                </div>
              ) : deviceType === 'ios' ? (
                <div className="install-steps">
                  <InstallStep
                    number={1}
                    icon={Share2}
                    title="Tap Share Button"
                    description="Tap the Share button at the bottom of your Safari browser (the square with an arrow pointing up)"
                  />
                  <InstallStep
                    number={2}
                    icon={Plus}
                    title="Add to Home Screen"
                    description="Scroll down and tap 'Add to Home Screen' from the share menu"
                  />
                  <InstallStep
                    number={3}
                    icon={CheckCircle2}
                    title="Confirm Installation"
                    description="Tap 'Add' in the top-right corner. The app will appear on your home screen"
                  />
                </div>
              ) : (
                <div className="install-steps">
                  <InstallStep
                    number={1}
                    icon={Smartphone}
                    title="Mobile Installation"
                    description="This installation guide is optimized for mobile devices. Please visit this page on your mobile device to install the app."
                  />
                  <InstallStep
                    number={2}
                    icon={Download}
                    title="Chrome/Edge Desktop"
                    description="On desktop, look for the install icon in the address bar or use the browser menu to install the app"
                  />
                </div>
              )}
            </section>

            <section className="install-benefits">
              <h2 className="install-benefits-title">Benefits of Installing</h2>
              <div className="install-benefits-list">
                <div className="install-benefit-item">
                  <CheckCircle2 className="install-benefit-icon" />
                  <span>Quick access from your home screen</span>
                </div>
                <div className="install-benefit-item">
                  <CheckCircle2 className="install-benefit-icon" />
                  <span>Works offline with cached data</span>
                </div>
                <div className="install-benefit-item">
                  <CheckCircle2 className="install-benefit-icon" />
                  <span>Faster loading times</span>
                </div>
                <div className="install-benefit-item">
                  <CheckCircle2 className="install-benefit-icon" />
                  <span>App-like experience</span>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="install-footer">
        <p>© {new Date().getFullYear()} PropMaster. All rights reserved.</p>
      </footer>
    </div>
  );
}

