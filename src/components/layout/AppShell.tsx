/**
 * AppexQuant Markets Global - Global Application Shell Component
 * Re-exports Layout as AppShell to enforce Phase 1 Master Frame Chassis.
 */

import React, { ReactNode } from 'react';
import { Layout } from './Layout.tsx';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return <Layout>{children}</Layout>;
};
