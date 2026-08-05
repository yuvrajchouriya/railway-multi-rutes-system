'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', (event) => {
        // e.g. event.url is https://www.railsathi.in/?trainNo=12345
        try {
          const urlObj = new URL(event.url);
          const pathWithParams = urlObj.pathname + urlObj.search + urlObj.hash;
          router.push(pathWithParams);
        } catch (e) {
          console.error('Deep link parsing error:', e);
        }
      });
    }
    return () => {
      if (Capacitor.isNativePlatform()) {
        App.removeAllListeners();
      }
    };
  }, [router]);

  return null;
}
