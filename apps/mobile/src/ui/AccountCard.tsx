/**
 * Home: keeps the kid's progress saved online (starts the cloud sync, src/lib/cloud.ts). Renders nothing for now;
 * home.tsx shows it with one line.
 */
import { useEffect } from 'react';
import { startCloudSync } from '@/lib/cloud';

export function AccountHomeCard() {
  useEffect(() => { startCloudSync(); }, []);
  return null;
}
