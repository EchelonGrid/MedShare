'use client';

import React from 'react';
import { MedShareProvider } from '@/context/MedShareContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <MedShareProvider>{children}</MedShareProvider>;
}
