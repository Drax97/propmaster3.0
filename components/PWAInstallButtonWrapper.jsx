'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const PWAInstallButton = dynamic(
  () => import('@/components/PWAInstallButton'),
  { 
    ssr: false,
    loading: () => null
  }
);

export default function PWAInstallButtonWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <PWAInstallButton />;
}

